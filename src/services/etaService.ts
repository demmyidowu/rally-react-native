/**
 * etaService.ts
 *
 * ETA calculation service using Google Maps Distance Matrix API
 *
 * This service calculates estimated travel times between two locations using
 * Google Maps Distance Matrix API with driving transport type.
 *
 * Features:
 * - Calculate ETA between two coordinates
 * - Calculate ETA from coordinate to address (with geocoding)
 * - Default fallback ETA of 15 minutes on failure
 * - Error handling for network issues and invalid routes
 * - One-time calculation when DD goes en route (not continuous tracking)
 *
 * Example Usage:
 * ```typescript
 * // Calculate ETA between two coordinates
 * const eta = await calculateETA(
 *   { latitude: 39.1836, longitude: -96.5717 },
 *   { latitude: 39.1967, longitude: -96.5831 }
 * );
 * console.log(`ETA: ${eta} minutes`);
 *
 * // Calculate ETA to an address
 * const eta = await calculateETAToAddress(
 *   { latitude: 39.1836, longitude: -96.5717 },
 *   '123 Main St, Manhattan, KS'
 * );
 * ```
 *
 * Testing Notes:
 * - Requires Google Maps API key with Distance Matrix API enabled
 * - Test with real locations
 * - Test with invalid coordinates (should throw error)
 * - Test network error handling (airplane mode)
 */

// Configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const DEFAULT_FALLBACK_ETA = 15; // Default fallback ETA in minutes

// Type definitions
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      status: string;
      duration?: {
        value: number; // Duration in seconds
        text: string;
      };
      distance?: {
        value: number; // Distance in meters
        text: string;
      };
    }>;
  }>;
  status: string;
}

/**
 * Custom error types for ETA calculations
 */
export enum ETAErrorType {
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_COORDINATE = 'INVALID_COORDINATE',
  API_ERROR = 'API_ERROR',
}

export class ETAError extends Error {
  constructor(
    public type: ETAErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ETAError';
  }
}

// MARK: - Coordinate Validation

/**
 * Validate that coordinates are within valid ranges
 *
 * @param coordinate - The coordinate to validate
 * @returns True if valid, false otherwise
 */
function isValidCoordinate(coordinate: Coordinate): boolean {
  return (
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180 &&
    !isNaN(coordinate.latitude) &&
    !isNaN(coordinate.longitude)
  );
}

// MARK: - ETA Calculation (Coordinates)

/**
 * Calculate driving ETA between two coordinates using Google Maps Distance Matrix API
 *
 * Uses Google Maps Distance Matrix API to calculate the fastest driving route
 * and returns the expected travel time in minutes (rounded up).
 *
 * @param from - Source coordinate (e.g., DD's current location)
 * @param to - Destination coordinate (e.g., rider's pickup location)
 * @returns Estimated travel time in minutes (rounded up)
 * @throws ETAError if calculation fails
 */
export async function calculateETA(
  from: Coordinate,
  to: Coordinate
): Promise<number> {
  // Validate coordinates
  if (!isValidCoordinate(from)) {
    throw new ETAError(
      ETAErrorType.INVALID_COORDINATE,
      'Invalid source coordinate'
    );
  }
  if (!isValidCoordinate(to)) {
    throw new ETAError(
      ETAErrorType.INVALID_COORDINATE,
      'Invalid destination coordinate'
    );
  }

  // Check if API key is configured
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not configured, using fallback ETA');
    return DEFAULT_FALLBACK_ETA;
  }

  // Build Distance Matrix API URL
  const origins = `${from.latitude},${from.longitude}`;
  const destinations = `${to.latitude},${to.longitude}`;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ETAError(
        ETAErrorType.NETWORK_ERROR,
        `Network error: ${response.status} ${response.statusText}`
      );
    }

    const data: DistanceMatrixResponse = await response.json();

    // Check API response status
    if (data.status !== 'OK') {
      throw new ETAError(
        ETAErrorType.API_ERROR,
        `Distance Matrix API error: ${data.status}`
      );
    }

    // Extract duration from first element
    const element = data.rows[0]?.elements[0];

    if (!element) {
      throw new ETAError(
        ETAErrorType.ROUTE_NOT_FOUND,
        'No route data returned from API'
      );
    }

    if (element.status !== 'OK') {
      throw new ETAError(
        ETAErrorType.ROUTE_NOT_FOUND,
        `Route not found: ${element.status}`
      );
    }

    if (!element.duration) {
      throw new ETAError(
        ETAErrorType.ROUTE_NOT_FOUND,
        'No duration data in response'
      );
    }

    // Convert travel time to minutes (rounded up)
    const travelTimeSeconds = element.duration.value;
    const etaMinutes = Math.ceil(travelTimeSeconds / 60.0);

    return etaMinutes;
  } catch (error) {
    if (error instanceof ETAError) {
      throw error;
    }
    throw new ETAError(
      ETAErrorType.NETWORK_ERROR,
      'Network error calculating route',
      error as Error
    );
  }
}

// MARK: - ETA Calculation (Address)

/**
 * Geocode an address string to coordinates using Google Geocoding API
 *
 * @param address - The address to geocode
 * @returns The geocoded coordinate
 * @throws ETAError if geocoding fails
 */
async function geocodeAddress(address: string): Promise<Coordinate> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new ETAError(
      ETAErrorType.API_ERROR,
      'Google Maps API key not configured'
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ETAError(
        ETAErrorType.NETWORK_ERROR,
        `Network error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new ETAError(
        ETAErrorType.INVALID_ADDRESS,
        `Geocoding failed: ${data.status}`
      );
    }

    const location = data.results[0].geometry.location;

    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  } catch (error) {
    if (error instanceof ETAError) {
      throw error;
    }
    throw new ETAError(
      ETAErrorType.INVALID_ADDRESS,
      'Failed to geocode address',
      error as Error
    );
  }
}

/**
 * Calculate driving ETA from coordinate to address
 *
 * First geocodes the destination address to coordinates,
 * then calculates the driving route.
 *
 * @param from - Source coordinate (e.g., DD's current location)
 * @param toAddress - Destination address string
 * @returns Estimated travel time in minutes (rounded up)
 * @throws ETAError if geocoding or calculation fails
 */
export async function calculateETAToAddress(
  from: Coordinate,
  toAddress: string
): Promise<number> {
  // Validate source coordinate
  if (!isValidCoordinate(from)) {
    throw new ETAError(
      ETAErrorType.INVALID_COORDINATE,
      'Invalid source coordinate'
    );
  }

  // Geocode destination address
  const toCoordinate = await geocodeAddress(toAddress);

  // Calculate ETA using coordinates
  return await calculateETA(from, toCoordinate);
}

// MARK: - ETA with Fallback

/**
 * Calculate ETA with fallback to default value on error
 *
 * This method never throws - it returns the default ETA (15 minutes)
 * if calculation fails. Useful for UI where you always need a value.
 *
 * @param from - Source coordinate
 * @param to - Destination coordinate
 * @returns Estimated travel time in minutes (or default 15 minutes)
 */
export async function calculateETAWithFallback(
  from: Coordinate,
  to: Coordinate
): Promise<number> {
  try {
    return await calculateETA(from, to);
  } catch (error) {
    // Log error for debugging
    const errorMessage =
      error instanceof ETAError ? error.message : (error as Error).message;
    console.warn(
      `ETA calculation failed: ${errorMessage}. Using fallback: ${DEFAULT_FALLBACK_ETA} minutes`
    );
    return DEFAULT_FALLBACK_ETA;
  }
}

/**
 * Calculate ETA to address with fallback to default value
 *
 * @param from - Source coordinate
 * @param toAddress - Destination address
 * @returns Estimated travel time in minutes (or default 15 minutes)
 */
export async function calculateETAToAddressWithFallback(
  from: Coordinate,
  toAddress: string
): Promise<number> {
  try {
    return await calculateETAToAddress(from, toAddress);
  } catch (error) {
    // Log error for debugging
    const errorMessage =
      error instanceof ETAError ? error.message : (error as Error).message;
    console.warn(
      `ETA calculation failed: ${errorMessage}. Using fallback: ${DEFAULT_FALLBACK_ETA} minutes`
    );
    return DEFAULT_FALLBACK_ETA;
  }
}

// MARK: - Distance Calculation

/**
 * Calculate straight-line distance between two coordinates (in meters)
 *
 * This is NOT the driving distance, but the direct "as the crow flies" distance.
 * Useful for quick distance checks without network requests.
 *
 * Uses the Haversine formula for accuracy.
 *
 * @param from - Source coordinate
 * @param to - Destination coordinate
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Convert distance in meters to miles
 *
 * @param meters - Distance in meters
 * @returns Distance in miles (rounded to 1 decimal place)
 */
export function metersToMiles(meters: number): number {
  const miles = meters / 1609.344;
  return Math.round(miles * 10) / 10;
}

/**
 * Convert distance in meters to kilometers
 *
 * @param meters - Distance in meters
 * @returns Distance in kilometers (rounded to 1 decimal place)
 */
export function metersToKilometers(meters: number): number {
  const kilometers = meters / 1000.0;
  return Math.round(kilometers * 10) / 10;
}

// MARK: - Batch ETA Calculation

/**
 * Calculate ETAs for multiple destination coordinates from a single source
 *
 * More efficient than calling calculateETA multiple times because it uses
 * a single Distance Matrix API request.
 *
 * @param from - Source coordinate
 * @param destinations - Array of destination coordinates
 * @returns Array of ETAs in minutes (in same order as destinations)
 */
export async function calculateBatchETAs(
  from: Coordinate,
  destinations: Coordinate[]
): Promise<number[]> {
  // Validate coordinates
  if (!isValidCoordinate(from)) {
    throw new ETAError(
      ETAErrorType.INVALID_COORDINATE,
      'Invalid source coordinate'
    );
  }

  for (const dest of destinations) {
    if (!isValidCoordinate(dest)) {
      throw new ETAError(
        ETAErrorType.INVALID_COORDINATE,
        'Invalid destination coordinate'
      );
    }
  }

  // Check if API key is configured
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️ Google Maps API key not configured, using fallback ETA');
    return destinations.map(() => DEFAULT_FALLBACK_ETA);
  }

  // Build Distance Matrix API URL with multiple destinations
  const origins = `${from.latitude},${from.longitude}`;
  const destString = destinations
    .map(d => `${d.latitude},${d.longitude}`)
    .join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destString}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ETAError(
        ETAErrorType.NETWORK_ERROR,
        `Network error: ${response.status} ${response.statusText}`
      );
    }

    const data: DistanceMatrixResponse = await response.json();

    if (data.status !== 'OK') {
      throw new ETAError(
        ETAErrorType.API_ERROR,
        `Distance Matrix API error: ${data.status}`
      );
    }

    const elements = data.rows[0]?.elements || [];

    // Extract ETAs for each destination
    return elements.map((element, index) => {
      if (element.status !== 'OK' || !element.duration) {
        console.warn(
          `⚠️ Failed to get ETA for destination ${index}, using fallback`
        );
        return DEFAULT_FALLBACK_ETA;
      }

      return Math.ceil(element.duration.value / 60.0);
    });
  } catch (error) {
    if (error instanceof ETAError) {
      throw error;
    }
    throw new ETAError(
      ETAErrorType.NETWORK_ERROR,
      'Network error calculating routes',
      error as Error
    );
  }
}
