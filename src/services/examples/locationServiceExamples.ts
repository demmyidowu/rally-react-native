/**
 * locationServiceExamples.ts
 * Rally React Native
 *
 * Example usage patterns for LocationService
 * Created: 2026-01-11
 *
 * This file demonstrates the two main use cases:
 * 1. Rider requesting a ride (capture pickup location)
 * 2. DD marking en route (capture DD location for ETA)
 */

import locationService, {
  LocationError,
  LocationErrorCode,
  getLocationErrorMessage,
} from '../locationService';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase'; // Assuming Firebase config exists

// MARK: - Use Case 1: Rider Requests Ride

/**
 * Example: Rider requests a ride
 *
 * Flow:
 * 1. Check/request location permission
 * 2. Capture location once
 * 3. Geocode to address
 * 4. Save ride request to Firestore
 */
export async function riderRequestRideExample(
  userId: string,
  eventId: string
): Promise<string> {
  try {
    // Step 1: Request permission
    const hasPermission = await locationService.requestLocationPermission();

    if (!hasPermission) {
      throw new Error(
        'Location permission is required to request a ride. Please enable it in Settings.'
      );
    }

    // Step 2: Capture location and address in one call
    console.log('Capturing rider location...');
    const { coordinate, geoPoint, address } =
      await locationService.captureLocationAndAddress();

    console.log('Location captured:', {
      address,
      coordinate: locationService.formatCoordinate(coordinate),
    });

    // Step 3: Create ride request
    const rideData = {
      eventId,
      riderId: userId,
      pickupAddress: address,
      pickupLocation: geoPoint, // GeoPoint for Firestore
      status: 'queued',
      requestTime: new Date(),
      priority: 0, // Will be calculated by backend
      isEmergency: false,
    };

    // Step 4: Save to Firestore
    const ridesRef = collection(db, 'rides');
    const rideDoc = await addDoc(ridesRef, rideData);

    console.log('Ride requested successfully:', rideDoc.id);

    return rideDoc.id;
  } catch (error) {
    if (error instanceof LocationError) {
      // Handle location-specific errors
      console.error('Location error:', error.message);
      throw new Error(error.message);
    }

    // Handle other errors
    console.error('Error requesting ride:', error);
    throw error;
  }
}

// MARK: - Use Case 2: DD Marks En Route

/**
 * Example: DD marks ride as en route
 *
 * Flow:
 * 1. Check location permission
 * 2. Capture DD's current location
 * 3. Update ride status to "enroute"
 * 4. Save DD location (for ETA calculation via Cloud Function)
 */
export async function ddMarkEnRouteExample(
  rideId: string,
  ddId: string
): Promise<void> {
  try {
    // Step 1: Check permission (should already be granted)
    if (!locationService.isAuthorized) {
      throw new Error('Location permission required');
    }

    // Step 2: Capture DD's current location (no address needed)
    console.log('Capturing DD location...');
    const { coordinate, geoPoint, timestamp } =
      await locationService.captureLocationOnce();

    console.log('DD location captured:', {
      coordinate: locationService.formatCoordinate(coordinate),
      timestamp,
    });

    // Step 3: Update ride in Firestore
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      status: 'enroute',
      ddLocation: geoPoint, // Save DD location
      enrouteTime: new Date(),
      // Cloud Function will calculate ETA and send SMS
    });

    console.log('Ride marked as en route');
  } catch (error) {
    if (error instanceof LocationError) {
      console.error('Location error:', error.message);
      throw new Error(error.message);
    }

    console.error('Error marking en route:', error);
    throw error;
  }
}

// MARK: - Use Case 3: Permission Flow in UI

/**
 * Example: Check permission status for UI rendering
 *
 * Used in components to show appropriate UI based on permission state
 */
export async function checkLocationPermissionForUI(): Promise<{
  canRequestRide: boolean;
  shouldShowPermissionPrompt: boolean;
  shouldShowSettingsPrompt: boolean;
  message?: string;
}> {
  const status = locationService.currentPermissionStatus;

  switch (status) {
    case 'granted':
      return {
        canRequestRide: true,
        shouldShowPermissionPrompt: false,
        shouldShowSettingsPrompt: false,
      };

    case 'undetermined':
      return {
        canRequestRide: false,
        shouldShowPermissionPrompt: true,
        shouldShowSettingsPrompt: false,
        message: 'Location permission is needed to request rides',
      };

    case 'denied':
      return {
        canRequestRide: false,
        shouldShowPermissionPrompt: false,
        shouldShowSettingsPrompt: true,
        message:
          'Location permission denied. Please enable it in Settings to request rides.',
      };

    case 'restricted':
      return {
        canRequestRide: false,
        shouldShowPermissionPrompt: false,
        shouldShowSettingsPrompt: false,
        message: 'Location services are restricted on this device.',
      };

    default:
      return {
        canRequestRide: false,
        shouldShowPermissionPrompt: false,
        shouldShowSettingsPrompt: false,
        message: 'Unknown location permission status.',
      };
  }
}

// MARK: - Use Case 4: Error Handling

/**
 * Example: Comprehensive error handling
 */
export async function captureLocationWithErrorHandling(): Promise<{
  success: boolean;
  coordinate?: { latitude: number; longitude: number };
  address?: string;
  error?: string;
}> {
  try {
    const result = await locationService.captureLocationAndAddress();

    return {
      success: true,
      coordinate: result.coordinate,
      address: result.address,
    };
  } catch (error) {
    if (error instanceof LocationError) {
      // Handle specific location errors
      switch (error.code) {
        case LocationErrorCode.UNAUTHORIZED:
          return {
            success: false,
            error: 'Please grant location permission in Settings',
          };

        case LocationErrorCode.TIMEOUT:
          return {
            success: false,
            error: 'Location request timed out. Please try again.',
          };

        case LocationErrorCode.UNAVAILABLE:
          return {
            success: false,
            error: 'Location services unavailable. Check your settings.',
          };

        case LocationErrorCode.GEOCODING_FAILED:
          return {
            success: false,
            error: 'Could not determine address. Please try again.',
          };

        default:
          return {
            success: false,
            error: error.message,
          };
      }
    }

    // Handle unknown errors
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

// MARK: - Use Case 5: Emergency Ride Request

/**
 * Example: Emergency ride request
 *
 * Same location capture, but with emergency flag
 */
export async function emergencyRideRequestExample(
  userId: string,
  eventId: string
): Promise<string> {
  try {
    // Capture location and address
    const { coordinate, geoPoint, address } =
      await locationService.captureLocationAndAddress();

    // Create emergency ride request
    const rideData = {
      eventId,
      riderId: userId,
      pickupAddress: address,
      pickupLocation: geoPoint,
      status: 'queued',
      requestTime: new Date(),
      priority: 9999, // Emergency priority
      isEmergency: true, // Emergency flag
    };

    // Save to Firestore (triggers Cloud Function for admin alerts)
    const ridesRef = collection(db, 'rides');
    const rideDoc = await addDoc(ridesRef, rideData);

    console.log('Emergency ride requested:', rideDoc.id);

    return rideDoc.id;
  } catch (error) {
    console.error('Error requesting emergency ride:', error);
    throw error;
  }
}

// MARK: - Use Case 6: Using Cached Location

/**
 * Example: Display last captured location
 *
 * Useful for showing user their last known location without re-capturing
 */
export function displayLastLocationExample(): void {
  const lastLocation = locationService.getLastCapturedLocation();
  const lastAddress = locationService.getLastCapturedAddress();

  if (lastLocation && lastAddress) {
    console.log('Last known location:');
    console.log('Address:', lastAddress);
    console.log(
      'Coordinates:',
      locationService.formatCoordinate(lastLocation)
    );
  } else {
    console.log('No cached location available');
  }
}

// MARK: - Use Case 7: Calculate Distance

/**
 * Example: Calculate distance between rider and DD
 */
export function calculateDistanceExample(): void {
  const riderLocation = { latitude: 39.1836, longitude: -96.5717 }; // Manhattan, KS
  const ddLocation = { latitude: 39.1965, longitude: -96.5853 }; // K-State campus

  const distance = locationService.calculateDistance(
    riderLocation,
    ddLocation
  );

  console.log(`Distance: ${distance.toFixed(2)} km`);
}

// MARK: - React Component Example

/**
 * Example React Hook for location in a component
 */
export function useLocationExample() {
  // This would be a custom hook in a real implementation
  const requestLocation = async () => {
    try {
      const hasPermission =
        await locationService.requestLocationPermission();

      if (!hasPermission) {
        throw new Error('Permission denied');
      }

      const result = await locationService.captureLocationAndAddress();
      return result;
    } catch (error) {
      console.error('Location error:', error);
      throw error;
    }
  };

  return { requestLocation };
}
