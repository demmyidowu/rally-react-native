/**
 * LocationService.ts
 * Rally - React Native Edition
 *
 * Battery-efficient location service with ONE-TIME capture only
 *
 * This service implements location capture for the Rally app with strict battery efficiency:
 * - Captures location ONCE per request (no continuous tracking)
 * - Uses "When In Use" permission only (NOT "Always")
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
 * const { granted } = await locationService.requestLocationPermission();
 *
 * // Capture location once
 * const location = await locationService.getCurrentLocation();
 *
 * // Or capture with address in one call
 * const { geoPoint, address } = await locationService.captureRiderPickupLocation();
 * ```
 *
 * Testing Notes:
 * - iOS Simulator: Features > Location to simulate locations
 * - Android Emulator: Extended Controls > Location
 * - Test permission states: denied, granted
 * - Test timeout by disabling location services
 */

import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';

// MARK: - Error Types

/**
 * Custom location error types
 */
export enum LocationErrorType {
  PERMISSION_DENIED = 'permission-denied',
  PERMISSION_RESTRICTED = 'permission-restricted',
  LOCATION_UNAVAILABLE = 'location-unavailable',
  TIMEOUT = 'timeout',
  GEOCODING_FAILED = 'geocoding-failed',
  INVALID_COORDINATE = 'invalid-coordinate',
}

/**
 * Custom location service error
 */
export class LocationServiceError extends Error {
  type: LocationErrorType;

  constructor(message: string, type: LocationErrorType) {
    super(message);
    this.name = 'LocationServiceError';
    this.type = type;
    Object.setPrototypeOf(this, LocationServiceError.prototype);
  }
}

// MARK: - Type Definitions

/**
 * Location result with coordinates and GeoPoint
 */
export interface LocationResult {
  /** Firebase GeoPoint for Firestore storage */
  geoPoint: GeoPoint;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
}

/**
 * Location result with address
 */
export interface LocationWithAddress extends LocationResult {
  /** Human-readable address string */
  address: string;
}

/**
 * Detailed address components
 */
export interface AddressDetails {
  /** Street number and name */
  street: string;
  /** City name */
  city: string;
  /** State abbreviation */
  state: string;
  /** Postal/ZIP code */
  zip: string;
  /** Full formatted address */
  fullAddress: string;
}

/**
 * Permission request result
 */
export interface PermissionResult {
  /** Whether permission was granted */
  granted: boolean;
  /** Expo permission status */
  status: Location.PermissionStatus;
}

// MARK: - Constants

/**
 * Location request timeout in milliseconds
 */
const LOCATION_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Manhattan, KS approximate boundaries for optional validation
 * Latitude: ~39.1836° N
 * Longitude: ~96.5717° W
 */
const MANHATTAN_KS_BOUNDS = {
  minLat: 39.1,
  maxLat: 39.3,
  minLon: -96.7,
  maxLon: -96.4,
};

// MARK: - LocationService Class

/**
 * Battery-efficient location service
 *
 * Provides one-time location capture with geocoding support
 */
class LocationService {
  private static instance: LocationService;

  /**
   * Last captured location (cached for debugging)
   */
  private lastCapturedLocation?: LocationResult;

  /**
   * Last captured address (cached for debugging)
   */
  private lastCapturedAddress?: string;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // MARK: - Permission Management

  /**
   * Request location permissions
   *
   * iOS: "When In Use" permission
   * Android: Fine location permission
   *
   * @returns Promise with permission result
   * @throws LocationServiceError if permission is restricted
   */
  async requestLocationPermission(): Promise<PermissionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === Location.PermissionStatus.DENIED) {
        return {
          granted: false,
          status,
        };
      }

      if (status === Location.PermissionStatus.GRANTED) {
        return {
          granted: true,
          status,
        };
      }

      // Undetermined or other status
      return {
        granted: false,
        status,
      };
    } catch (error) {
      throw new LocationServiceError(
        'Failed to request location permission',
        LocationErrorType.PERMISSION_DENIED
      );
    }
  }

  /**
   * Check current permission status
   *
   * @returns Current permission status
   */
  async getLocationPermissionStatus(): Promise<Location.PermissionStatus> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  }

  /**
   * Check if location permission is granted
   *
   * @returns True if permission is granted
   */
  async hasLocationPermission(): Promise<boolean> {
    const status = await this.getLocationPermissionStatus();
    return status === Location.PermissionStatus.GRANTED;
  }

  // MARK: - One-Time Location Capture

  /**
   * Get current location (high accuracy)
   * ONE-TIME READ - Not continuous tracking
   *
   * This method:
   * 1. Checks authorization status
   * 2. Requests a single location update with high accuracy
   * 3. Times out after 10 seconds if no location received
   * 4. Returns coordinates and GeoPoint
   *
   * @returns Promise with location result including address
   * @throws LocationServiceError if permission denied, timeout, or unavailable
   */
  async getCurrentLocation(): Promise<LocationWithAddress> {
    // Check permission
    const hasPermission = await this.hasLocationPermission();
    if (!hasPermission) {
      throw new LocationServiceError(
        'Location permission is required to request a ride. Please enable location access in Settings.',
        LocationErrorType.PERMISSION_DENIED
      );
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new LocationServiceError(
              'Could not get your location. Please try again.',
              LocationErrorType.TIMEOUT
            )
          );
        }, LOCATION_TIMEOUT_MS);
      });

      // Create location promise with high accuracy
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        // Disable background location
        mayShowUserSettingsDialog: true,
      });

      // Race between location and timeout
      const position = await Promise.race([locationPromise, timeoutPromise]);

      const { latitude, longitude } = position.coords;

      // Validate coordinates
      if (!this.validateCoordinates(latitude, longitude)) {
        throw new LocationServiceError(
          'The provided location is invalid.',
          LocationErrorType.INVALID_COORDINATE
        );
      }

      // Create GeoPoint
      const geoPoint = new GeoPoint(latitude, longitude);

      // Geocode address
      const address = await this.reverseGeocode(latitude, longitude);

      // Cache result
      this.lastCapturedLocation = { geoPoint, latitude, longitude };
      this.lastCapturedAddress = address;

      return {
        geoPoint,
        latitude,
        longitude,
        address,
      };
    } catch (error) {
      if (error instanceof LocationServiceError) {
        throw error;
      }

      // Handle expo-location errors
      throw new LocationServiceError(
        'Location services are currently unavailable.',
        LocationErrorType.LOCATION_UNAVAILABLE
      );
    }
  }

  /**
   * Get location with custom accuracy
   *
   * @param accuracy Location accuracy level
   * @returns Promise with location result (no address)
   * @throws LocationServiceError if permission denied or unavailable
   */
  async getLocationWithAccuracy(
    accuracy: Location.Accuracy
  ): Promise<LocationResult> {
    // Check permission
    const hasPermission = await this.hasLocationPermission();
    if (!hasPermission) {
      throw new LocationServiceError(
        'Location permission is required.',
        LocationErrorType.PERMISSION_DENIED
      );
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new LocationServiceError(
              'Location request timed out.',
              LocationErrorType.TIMEOUT
            )
          );
        }, LOCATION_TIMEOUT_MS);
      });

      // Create location promise
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy,
        timeInterval: 5000,
      });

      // Race between location and timeout
      const position = await Promise.race([locationPromise, timeoutPromise]);

      const { latitude, longitude } = position.coords;

      // Validate coordinates
      if (!this.validateCoordinates(latitude, longitude)) {
        throw new LocationServiceError(
          'Invalid coordinates received.',
          LocationErrorType.INVALID_COORDINATE
        );
      }

      // Create GeoPoint
      const geoPoint = new GeoPoint(latitude, longitude);

      return { geoPoint, latitude, longitude };
    } catch (error) {
      if (error instanceof LocationServiceError) {
        throw error;
      }

      throw new LocationServiceError(
        'Failed to get location.',
        LocationErrorType.LOCATION_UNAVAILABLE
      );
    }
  }

  // MARK: - Geocoding

  /**
   * Convert coordinates to address string
   * Reverse geocoding
   *
   * Returns formatted address in the format:
   * "123 Main St, Manhattan, KS 66502"
   *
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Formatted address string
   * @throws LocationServiceError if geocoding fails
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new LocationServiceError(
        'Invalid coordinates for geocoding.',
        LocationErrorType.INVALID_COORDINATE
      );
    }

    try {
      const geocodeResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (!geocodeResults || geocodeResults.length === 0) {
        throw new LocationServiceError(
          'Could not determine your address from location.',
          LocationErrorType.GEOCODING_FAILED
        );
      }

      const result = geocodeResults[0];
      const address = this.formatAddress(result);

      // Cache result
      this.lastCapturedAddress = address;

      return address;
    } catch (error) {
      if (error instanceof LocationServiceError) {
        throw error;
      }

      throw new LocationServiceError(
        'Geocoding failed.',
        LocationErrorType.GEOCODING_FAILED
      );
    }
  }

  /**
   * Get detailed address components
   *
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Detailed address components
   * @throws LocationServiceError if geocoding fails
   */
  async getReverseGeocodeDetails(
    latitude: number,
    longitude: number
  ): Promise<AddressDetails> {
    // Validate coordinates
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new LocationServiceError(
        'Invalid coordinates for geocoding.',
        LocationErrorType.INVALID_COORDINATE
      );
    }

    try {
      const geocodeResults = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (!geocodeResults || geocodeResults.length === 0) {
        throw new LocationServiceError(
          'Could not determine address details.',
          LocationErrorType.GEOCODING_FAILED
        );
      }

      const result = geocodeResults[0];

      const street = this.getStreetFromGeocode(result);
      const city = result.city || '';
      const state = result.region || '';
      const zip = result.postalCode || '';
      const fullAddress = this.formatAddress(result);

      return {
        street,
        city,
        state,
        zip,
        fullAddress,
      };
    } catch (error) {
      if (error instanceof LocationServiceError) {
        throw error;
      }

      throw new LocationServiceError(
        'Failed to get address details.',
        LocationErrorType.GEOCODING_FAILED
      );
    }
  }

  /**
   * Convert address string to coordinates
   * Forward geocoding
   *
   * @param address Address string to geocode
   * @returns Location result with coordinates and GeoPoint
   * @throws LocationServiceError if geocoding fails
   */
  async geocodeAddress(address: string): Promise<LocationResult> {
    if (!address || address.trim().length === 0) {
      throw new LocationServiceError(
        'Address cannot be empty.',
        LocationErrorType.GEOCODING_FAILED
      );
    }

    try {
      const geocodeResults = await Location.geocodeAsync(address);

      if (!geocodeResults || geocodeResults.length === 0) {
        throw new LocationServiceError(
          'Could not find coordinates for address.',
          LocationErrorType.GEOCODING_FAILED
        );
      }

      const result = geocodeResults[0];
      const { latitude, longitude } = result;

      // Validate coordinates
      if (!this.validateCoordinates(latitude, longitude)) {
        throw new LocationServiceError(
          'Invalid coordinates from geocoding.',
          LocationErrorType.INVALID_COORDINATE
        );
      }

      const geoPoint = new GeoPoint(latitude, longitude);

      return { geoPoint, latitude, longitude };
    } catch (error) {
      if (error instanceof LocationServiceError) {
        throw error;
      }

      throw new LocationServiceError(
        'Failed to geocode address.',
        LocationErrorType.GEOCODING_FAILED
      );
    }
  }

  // MARK: - Use Cases

  /**
   * Rider requests ride - capture pickup location
   * HIGH ACCURACY required
   *
   * This is a convenience method that captures location with address
   * specifically for ride requests.
   *
   * @returns Location with address for pickup
   * @throws LocationServiceError if capture or geocoding fails
   */
  async captureRiderPickupLocation(): Promise<LocationWithAddress> {
    return await this.getCurrentLocation();
  }

  /**
   * DD marks en route - capture DD's current location
   * HIGH ACCURACY required
   *
   * This is a convenience method for capturing DD location
   * (used for ETA calculation in a separate service)
   *
   * @returns Location result for DD
   * @throws LocationServiceError if capture fails
   */
  async captureDDLocation(): Promise<LocationResult> {
    return await this.getLocationWithAccuracy(Location.Accuracy.High);
  }

  // MARK: - Validation

  /**
   * Validate coordinates are within valid range
   *
   * @param latitude Latitude to validate
   * @param longitude Longitude to validate
   * @returns True if coordinates are valid
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    // Check for valid latitude range (-90 to 90)
    if (latitude < -90 || latitude > 90) {
      return false;
    }

    // Check for valid longitude range (-180 to 180)
    if (longitude < -180 || longitude > 180) {
      return false;
    }

    // Check for zero values (often indicates error)
    if (latitude === 0 && longitude === 0) {
      return false;
    }

    return true;
  }

  /**
   * Check if location is in Manhattan, KS area
   * Optional validation for the app's primary service area
   *
   * @param latitude Latitude to check
   * @param longitude Longitude to check
   * @returns True if location is in Manhattan, KS area
   */
  isInManhattanKS(latitude: number, longitude: number): boolean {
    return (
      latitude >= MANHATTAN_KS_BOUNDS.minLat &&
      latitude <= MANHATTAN_KS_BOUNDS.maxLat &&
      longitude >= MANHATTAN_KS_BOUNDS.minLon &&
      longitude <= MANHATTAN_KS_BOUNDS.maxLon
    );
  }

  // MARK: - Private Helpers

  /**
   * Format geocode result into readable address
   *
   * @param result Geocode result from expo-location
   * @returns Formatted address string
   */
  private formatAddress(result: Location.LocationGeocodedAddress): string {
    const components: string[] = [];

    // Street number and name
    const street = this.getStreetFromGeocode(result);
    if (street) {
      components.push(street);
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

    // If no components found, use name or return coordinates
    if (components.length === 0) {
      if (result.name) {
        return result.name;
      }
      return 'Unknown location';
    }

    return components.join(', ');
  }

  /**
   * Get street address from geocode result
   *
   * @param result Geocode result
   * @returns Street address or empty string
   */
  private getStreetFromGeocode(
    result: Location.LocationGeocodedAddress
  ): string {
    const parts: string[] = [];

    if (result.streetNumber) {
      parts.push(result.streetNumber);
    }

    if (result.street) {
      parts.push(result.street);
    }

    return parts.join(' ');
  }

  /**
   * Handle permission denied gracefully
   *
   * This method can be called to show user guidance
   * when permission is denied
   */
  handlePermissionDenied(): void {
    console.warn(
      'Location permission denied. User should be directed to app settings.'
    );
    // In a real app, this would trigger a UI alert or modal
    // directing the user to Settings > Rally > Location
  }

  // MARK: - Debugging Helpers

  /**
   * Get last captured location (for debugging)
   */
  getLastCapturedLocation(): LocationResult | undefined {
    return this.lastCapturedLocation;
  }

  /**
   * Get last captured address (for debugging)
   */
  getLastCapturedAddress(): string | undefined {
    return this.lastCapturedAddress;
  }

  /**
   * Format coordinate as string (for debugging)
   *
   * @param latitude Latitude
   * @param longitude Longitude
   * @returns Formatted coordinate string
   */
  formatCoordinate(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}

// MARK: - Singleton Export

/**
 * Singleton instance of LocationService
 *
 * Usage:
 * ```typescript
 * import { locationService } from './services/locationService';
 *
 * const location = await locationService.getCurrentLocation();
 * ```
 */
export const locationService = LocationService.getInstance();

// Also export the class for testing
export default LocationService;
