/**
 * LocationService.ts
 * Rally React Native
 *
 * Battery-efficient location service with ONE-TIME capture only
 *
 * Migrated from: LocationService.swift
 * Created: 2026-01-11
 *
 * This service implements location capture for the Rally app with strict battery efficiency:
 * - Captures location ONCE per request (no continuous tracking)
 * - Uses foreground permission only (NOT background)
 * - 10-second timeout to prevent battery drain
 * - Stops location updates immediately after capture
 *
 * Two Location Captures Per Ride:
 * 1. Rider's pickup location - captured once when requesting ride
 * 2. DD's location - captured once when DD marks "en route" (for ETA calculation)
 *
 * Example Usage:
 * ```typescript
 * // Request permission first
 * const authorized = await locationService.requestLocationPermission();
 *
 * // Capture location once
 * const result = await locationService.captureLocationOnce();
 *
 * // Or capture with address in one call
 * const { coordinate, address } = await locationService.captureLocationAndAddress();
 * ```
 */

import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';

// MARK: - Types

/**
 * Coordinate type for location data
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Location capture result
 */
export interface LocationResult {
  coordinate: Coordinate;
  geoPoint: GeoPoint;
  timestamp: Date;
}

/**
 * Location capture result with address
 */
export interface LocationWithAddress extends LocationResult {
  address: string;
}

/**
 * Permission status
 */
export enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
  GRANTED = 'granted',
  RESTRICTED = 'restricted',
}

// MARK: - Custom Errors

/**
 * Custom error types for location operations
 */
export class LocationError extends Error {
  constructor(
    message: string,
    public code: LocationErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

export enum LocationErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RESTRICTED = 'RESTRICTED',
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
  GEOCODING_FAILED = 'GEOCODING_FAILED',
  INVALID_COORDINATE = 'INVALID_COORDINATE',
}

/**
 * Get user-friendly error message
 */
export function getLocationErrorMessage(code: LocationErrorCode): string {
  switch (code) {
    case LocationErrorCode.UNAUTHORIZED:
      return 'Location permission is required to request a ride. Please enable location access in Settings.';
    case LocationErrorCode.RESTRICTED:
      return 'Location services are restricted on this device.';
    case LocationErrorCode.TIMEOUT:
      return 'Could not get your location. Please try again.';
    case LocationErrorCode.UNAVAILABLE:
      return 'Location services are currently unavailable.';
    case LocationErrorCode.GEOCODING_FAILED:
      return 'Could not determine your address from location.';
    case LocationErrorCode.INVALID_COORDINATE:
      return 'The provided location is invalid.';
    default:
      return 'An unknown location error occurred.';
  }
}

// MARK: - Location Service

/**
 * Battery-efficient location service for Rally app
 *
 * Singleton service that handles:
 * - Permission management (iOS & Android)
 * - One-time location capture
 * - Reverse geocoding (coordinate to address)
 * - GeoPoint conversion for Firebase
 */
class LocationService {
  private static instance: LocationService;

  // Configuration
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly HIGH_ACCURACY = Location.Accuracy.High; // ~10m accuracy

  // Cached data
  private lastCapturedLocation: Coordinate | null = null;
  private lastCapturedAddress: string | null = null;
  private permissionStatus: PermissionStatus = PermissionStatus.UNDETERMINED;

  private constructor() {
    // Private constructor for singleton
    this.checkInitialPermissionStatus();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // MARK: - Permission Management

  /**
   * Check initial permission status
   */
  private async checkInitialPermissionStatus(): Promise<void> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = this.mapPermissionStatus(status);
    } catch (error) {
      console.error('Error checking permission status:', error);
      this.permissionStatus = PermissionStatus.UNDETERMINED;
    }
  }

  /**
   * Map expo-location permission status to our enum
   */
  private mapPermissionStatus(
    status: Location.PermissionStatus
  ): PermissionStatus {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return PermissionStatus.GRANTED;
      case Location.PermissionStatus.DENIED:
        return PermissionStatus.DENIED;
      case Location.PermissionStatus.UNDETERMINED:
        return PermissionStatus.UNDETERMINED;
      default:
        return PermissionStatus.RESTRICTED;
    }
  }

  /**
   * Request foreground location permission
   *
   * This method requests permission to access location only when the app is in use.
   * We do NOT request background permission as we don't need continuous location tracking.
   *
   * @returns True if authorized, false otherwise
   */
  public async requestLocationPermission(): Promise<boolean> {
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        this.permissionStatus = PermissionStatus.UNAVAILABLE;
        return false;
      }

      // Get current permission status
      const { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus === Location.PermissionStatus.GRANTED) {
        this.permissionStatus = PermissionStatus.GRANTED;
        return true;
      }

      // Request permission
      const { status: newStatus } =
        await Location.requestForegroundPermissionsAsync();

      this.permissionStatus = this.mapPermissionStatus(newStatus);

      return newStatus === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      this.permissionStatus = PermissionStatus.DENIED;
      return false;
    }
  }

  /**
   * Check if location services are currently authorized
   */
  public get isAuthorized(): boolean {
    return this.permissionStatus === PermissionStatus.GRANTED;
  }

  /**
   * Get current permission status
   */
  public get currentPermissionStatus(): PermissionStatus {
    return this.permissionStatus;
  }

  // MARK: - One-Time Location Capture

  /**
   * Capture location ONCE and immediately stop updates (battery efficient)
   *
   * This method:
   * 1. Checks authorization status
   * 2. Requests a single location update with high accuracy
   * 3. Times out after 10 seconds if no location received
   * 4. Returns coordinate and GeoPoint
   * 5. Caches result in lastCapturedLocation
   *
   * @returns LocationResult with coordinate and GeoPoint
   * @throws LocationError if permission denied, timeout, or unavailable
   */
  public async captureLocationOnce(): Promise<LocationResult> {
    // Check authorization
    if (!this.isAuthorized) {
      const errorCode =
        this.permissionStatus === PermissionStatus.RESTRICTED
          ? LocationErrorCode.RESTRICTED
          : LocationErrorCode.UNAUTHORIZED;

      throw new LocationError(
        getLocationErrorMessage(errorCode),
        errorCode
      );
    }

    // Check if location services are enabled
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new LocationError(
        getLocationErrorMessage(LocationErrorCode.UNAVAILABLE),
        LocationErrorCode.UNAVAILABLE
      );
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new LocationError(
              getLocationErrorMessage(LocationErrorCode.TIMEOUT),
              LocationErrorCode.TIMEOUT
            )
          );
        }, this.TIMEOUT_MS);
      });

      // Create location capture promise
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: this.HIGH_ACCURACY,
        // Don't use cached location older than 5 seconds
        mayShowUserSettingsDialog: true,
      });

      // Race between location capture and timeout
      const location = await Promise.race([locationPromise, timeoutPromise]);

      // Validate coordinate
      const coordinate: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      if (!this.isValidCoordinate(coordinate)) {
        throw new LocationError(
          getLocationErrorMessage(LocationErrorCode.INVALID_COORDINATE),
          LocationErrorCode.INVALID_COORDINATE
        );
      }

      // Cache location
      this.lastCapturedLocation = coordinate;

      // Return result
      return {
        coordinate,
        geoPoint: this.coordinateToGeoPoint(coordinate),
        timestamp: new Date(),
      };
    } catch (error) {
      // Re-throw LocationError as-is
      if (error instanceof LocationError) {
        throw error;
      }

      // Wrap other errors
      throw new LocationError(
        getLocationErrorMessage(LocationErrorCode.UNAVAILABLE),
        LocationErrorCode.UNAVAILABLE,
        error as Error
      );
    }
  }

  // MARK: - Geocoding

  /**
   * Convert coordinate to human-readable address
   *
   * Returns formatted address in the format:
   * "123 Main St, Manhattan, KS 66502"
   *
   * @param coordinate - The coordinate to geocode
   * @returns Formatted address string
   * @throws LocationError if geocoding fails
   */
  public async geocodeAddress(coordinate: Coordinate): Promise<string> {
    // Validate coordinate
    if (!this.isValidCoordinate(coordinate)) {
      throw new LocationError(
        getLocationErrorMessage(LocationErrorCode.INVALID_COORDINATE),
        LocationErrorCode.INVALID_COORDINATE
      );
    }

    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      if (!results || results.length === 0) {
        throw new LocationError(
          getLocationErrorMessage(LocationErrorCode.GEOCODING_FAILED),
          LocationErrorCode.GEOCODING_FAILED
        );
      }

      const address = this.formatAddress(results[0]);

      // Cache result
      this.lastCapturedAddress = address;

      return address;
    } catch (error) {
      // Re-throw LocationError as-is
      if (error instanceof LocationError) {
        throw error;
      }

      // Wrap other errors
      throw new LocationError(
        getLocationErrorMessage(LocationErrorCode.GEOCODING_FAILED),
        LocationErrorCode.GEOCODING_FAILED,
        error as Error
      );
    }
  }

  /**
   * Format geocode result into readable address
   */
  private formatAddress(result: Location.LocationGeocodedAddress): string {
    const components: string[] = [];

    // Street number and name
    if (result.streetNumber && result.street) {
      components.push(`${result.streetNumber} ${result.street}`);
    } else if (result.street) {
      components.push(result.street);
    }

    // City
    if (result.city) {
      components.push(result.city);
    }

    // State
    if (result.region) {
      components.push(result.region);
    }

    // ZIP code
    if (result.postalCode) {
      components.push(result.postalCode);
    }

    // If no components found, use name or return unknown
    if (components.length === 0) {
      if (result.name) {
        return result.name;
      }
      return 'Unknown location';
    }

    return components.join(', ');
  }

  // MARK: - Convenience Methods

  /**
   * Capture location and geocode in one call
   *
   * @returns Object with coordinate, geoPoint, address, and timestamp
   * @throws LocationError if capture or geocoding fails
   */
  public async captureLocationAndAddress(): Promise<LocationWithAddress> {
    const locationResult = await this.captureLocationOnce();
    const address = await this.geocodeAddress(locationResult.coordinate);

    return {
      ...locationResult,
      address,
    };
  }

  /**
   * Get last captured location (if any)
   */
  public getLastCapturedLocation(): Coordinate | null {
    return this.lastCapturedLocation;
  }

  /**
   * Get last captured address (if any)
   */
  public getLastCapturedAddress(): string | null {
    return this.lastCapturedAddress;
  }

  /**
   * Clear cached location data
   */
  public clearCache(): void {
    this.lastCapturedLocation = null;
    this.lastCapturedAddress = null;
  }

  // MARK: - Utility Methods

  /**
   * Validate coordinate values
   */
  private isValidCoordinate(coordinate: Coordinate): boolean {
    return (
      coordinate.latitude >= -90 &&
      coordinate.latitude <= 90 &&
      coordinate.longitude >= -180 &&
      coordinate.longitude <= 180 &&
      !isNaN(coordinate.latitude) &&
      !isNaN(coordinate.longitude)
    );
  }

  /**
   * Convert Coordinate to Firebase GeoPoint
   */
  private coordinateToGeoPoint(coordinate: Coordinate): GeoPoint {
    return new GeoPoint(coordinate.latitude, coordinate.longitude);
  }

  /**
   * Convert Firebase GeoPoint to Coordinate
   */
  public geoPointToCoordinate(geoPoint: GeoPoint): Coordinate {
    return {
      latitude: geoPoint.latitude,
      longitude: geoPoint.longitude,
    };
  }

  /**
   * Format coordinate as string (for debugging)
   */
  public formatCoordinate(coordinate: Coordinate): string {
    return `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * Uses Haversine formula
   */
  public calculateDistance(
    coord1: Coordinate,
    coord2: Coordinate
  ): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) *
        Math.cos(this.toRadians(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// MARK: - Export Singleton Instance

/**
 * Singleton instance for app-wide use
 */
export const locationService = LocationService.getInstance();

// Default export
export default locationService;
