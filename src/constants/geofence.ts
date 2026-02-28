/**
 * Geofence Constants
 *
 * Configuration values for university geofencing feature.
 * Limits ride requests to within a configurable radius from campus.
 */

/**
 * Default service radius in miles
 * Used when university doesn't have a custom radius configured
 */
export const DEFAULT_SERVICE_RADIUS_MILES = 8;

/**
 * Error messages for geofencing validation
 */
export const GEOFENCE_ERROR_MESSAGES = {
  /**
   * Error shown when pickup location is outside the service area
   */
  OUTSIDE_AREA: (distance: number, radius: number, universityName: string) =>
    `Your pickup location is ${distance.toFixed(1)} miles from ${universityName}. Rides can only be requested within ${radius} miles of campus.`,

  /**
   * Error shown when university data couldn't be loaded
   */
  UNIVERSITY_NOT_FOUND: 'Unable to verify service area. Please try again.',

  /**
   * Error shown when university doesn't have coordinates configured
   */
  NO_COORDINATES: 'Service area verification is not configured for your university.',
};
