/**
 * Geofence Service
 *
 * Validates that ride pickup locations are within a university's service area.
 * Uses straight-line distance calculation (Haversine formula) for efficiency.
 *
 * Features:
 * - Validate pickup location against university service radius
 * - Configurable per-university service areas
 * - Clear error messages when outside service area
 */

import { calculateDistance, metersToMiles } from './etaService';
import { getUniversity } from './firestoreService';
import { DEFAULT_SERVICE_RADIUS_MILES, GEOFENCE_ERROR_MESSAGES } from '../constants/geofence';

/**
 * Coordinate type for location data
 */
interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Result of geofence validation
 */
export interface GeofenceValidationResult {
  /** Whether the location is within the service area */
  isValid: boolean;
  /** Distance from campus in miles (if coordinates available) */
  distanceMiles?: number;
  /** Service radius in miles */
  radiusMiles?: number;
  /** Error message if validation failed */
  errorMessage?: string;
}

/**
 * Validate that a pickup location is within the university's service area
 *
 * @param pickupLocation - The rider's pickup coordinates
 * @param universityId - The university ID to validate against
 * @returns Validation result with isValid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = await validatePickupLocation(
 *   { latitude: 39.1836, longitude: -96.5717 },
 *   'ksu'
 * );
 *
 * if (!result.isValid) {
 *   Alert.alert('Outside Service Area', result.errorMessage);
 * }
 * ```
 */
export async function validatePickupLocation(
  pickupLocation: Coordinate,
  universityId: string
): Promise<GeofenceValidationResult> {
  try {
    // Fetch university data
    const university = await getUniversity(universityId);

    if (!university) {
      return {
        isValid: false,
        errorMessage: GEOFENCE_ERROR_MESSAGES.UNIVERSITY_NOT_FOUND,
      };
    }

    // If geofencing is not enabled, allow all locations
    if (!university.geofencingEnabled) {
      return { isValid: true };
    }

    // Check if university has coordinates configured
    if (!university.coordinates) {
      // If geofencing is enabled but no coordinates, skip validation
      // This is a configuration issue that should be logged
      console.warn(`Geofencing enabled for ${universityId} but no coordinates configured`);
      return { isValid: true };
    }

    // Calculate distance from campus
    const campusCoordinate: Coordinate = {
      latitude: university.coordinates.latitude,
      longitude: university.coordinates.longitude,
    };

    const distanceMeters = calculateDistance(pickupLocation, campusCoordinate);
    const distanceMiles = metersToMiles(distanceMeters);

    // Get service radius (use default if not configured)
    const radiusMiles = university.serviceRadiusMiles ?? DEFAULT_SERVICE_RADIUS_MILES;

    // Check if within service area
    if (distanceMiles <= radiusMiles) {
      return {
        isValid: true,
        distanceMiles,
        radiusMiles,
      };
    }

    // Outside service area
    return {
      isValid: false,
      distanceMiles,
      radiusMiles,
      errorMessage: GEOFENCE_ERROR_MESSAGES.OUTSIDE_AREA(
        distanceMiles,
        radiusMiles,
        university.shortName || university.name
      ),
    };
  } catch (error) {
    console.error('Error validating pickup location:', error);
    // On error, fail open to not block ride requests
    // This could be changed to fail closed for stricter enforcement
    return {
      isValid: true,
      errorMessage: undefined,
    };
  }
}

/**
 * Get the service area information for a university
 *
 * @param universityId - The university ID
 * @returns Service area info or null if not available
 */
export async function getServiceAreaInfo(universityId: string): Promise<{
  coordinates: Coordinate;
  radiusMiles: number;
  universityName: string;
} | null> {
  try {
    const university = await getUniversity(universityId);

    if (!university || !university.coordinates || !university.geofencingEnabled) {
      return null;
    }

    return {
      coordinates: {
        latitude: university.coordinates.latitude,
        longitude: university.coordinates.longitude,
      },
      radiusMiles: university.serviceRadiusMiles ?? DEFAULT_SERVICE_RADIUS_MILES,
      universityName: university.shortName || university.name,
    };
  } catch (error) {
    console.error('Error getting service area info:', error);
    return null;
  }
}
