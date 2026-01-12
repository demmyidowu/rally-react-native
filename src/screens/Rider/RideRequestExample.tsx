/**
 * RideRequestExample.tsx
 * Rally - React Native Edition
 *
 * Example implementation showing how to use LocationService
 * in a React component for requesting rides.
 *
 * This is a reference implementation demonstrating:
 * - Permission handling
 * - Location capture
 * - Error handling
 * - User feedback
 * - Integration with Firestore
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { GeoPoint, Timestamp } from 'firebase/firestore';
import {
  locationService,
  LocationServiceError,
  LocationErrorType,
} from '@/services/locationService';

// Example props (would come from navigation/context in real app)
interface RideRequestScreenProps {
  userId: string;
  userName: string;
  eventId: string;
  chapterId: string;
  onRideRequested: (rideId: string) => void;
}

const RideRequestExample: React.FC<RideRequestScreenProps> = ({
  userId,
  userName,
  eventId,
  chapterId,
  onRideRequested,
}) => {
  // State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);

  // Check permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  /**
   * Check if location permission is already granted
   */
  const checkLocationPermission = async () => {
    try {
      const granted = await locationService.hasLocationPermission();
      setHasPermission(granted);
    } catch (error) {
      console.error('Error checking permission:', error);
      setHasPermission(false);
    }
  };

  /**
   * Request location permission from user
   */
  const handleRequestPermission = async () => {
    try {
      const { granted } = await locationService.requestLocationPermission();
      setHasPermission(granted);

      if (!granted) {
        // Show alert to direct user to Settings
        Alert.alert(
          'Location Permission Required',
          'Rally needs access to your location to connect you with a designated driver. Please enable location access in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request location permission. Please try again.');
    }
  };

  /**
   * Request a ride (main flow)
   */
  const handleRequestRide = async () => {
    // 1. Check permission first
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant location permission to request a ride.'
      );
      return;
    }

    setIsLoading(true);

    try {
      // 2. Capture rider's pickup location (one-time, high accuracy)
      console.log('Capturing rider location...');
      const { geoPoint, address, latitude, longitude } =
        await locationService.captureRiderPickupLocation();

      console.log('Location captured:', address);
      setCurrentLocation(address);

      // 3. Validate location is in service area (optional)
      if (!locationService.isInManhattanKS(latitude, longitude)) {
        Alert.alert(
          'Outside Service Area',
          'You appear to be outside Manhattan, KS. Rally may not be available in your area. Continue anyway?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
            { text: 'Continue', onPress: () => createRideRequest(geoPoint, address) },
          ]
        );
        return;
      }

      // 4. Create ride request
      await createRideRequest(geoPoint, address);

    } catch (error) {
      handleLocationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create ride request in Firestore
   */
  const createRideRequest = async (pickupLocation: GeoPoint, pickupAddress: string) => {
    try {
      // In a real app, this would use a service/API
      // Example Firestore structure:
      const ride = {
        riderId: userId,
        riderName: userName,
        chapterId,
        eventId,
        pickupLocation, // GeoPoint
        pickupAddress, // String
        status: 'queued',
        priority: 0, // Will be calculated by queue service
        isEmergency: false,
        requestedAt: Timestamp.now(),
      };

      console.log('Creating ride request:', ride);

      // TODO: Call Firestore service
      // const rideId = await rideService.createRide(ride);

      // For demo purposes:
      const mockRideId = `ride_${Date.now()}`;

      Alert.alert(
        'Ride Requested',
        `Your ride has been requested!\n\nPickup: ${pickupAddress}`,
        [
          {
            text: 'OK',
            onPress: () => onRideRequested(mockRideId),
          },
        ]
      );

    } catch (error) {
      console.error('Error creating ride:', error);
      Alert.alert(
        'Request Failed',
        'Failed to create ride request. Please try again.'
      );
    }
  };

  /**
   * Handle location errors with user-friendly messages
   */
  const handleLocationError = (error: unknown) => {
    if (error instanceof LocationServiceError) {
      switch (error.type) {
        case LocationErrorType.PERMISSION_DENIED:
          Alert.alert(
            'Permission Denied',
            'Location permission is required to request a ride. Please enable location access in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setHasPermission(false);
          break;

        case LocationErrorType.TIMEOUT:
          Alert.alert(
            'Location Timeout',
            'Could not get your location. Please ensure GPS is enabled and try again.',
            [
              { text: 'Try Again', onPress: handleRequestRide },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case LocationErrorType.LOCATION_UNAVAILABLE:
          Alert.alert(
            'Location Unavailable',
            'Location services are currently unavailable. Please enable location services in your device settings.',
            [
              { text: 'OK' },
            ]
          );
          break;

        case LocationErrorType.GEOCODING_FAILED:
          // Not critical - can still use coordinates
          console.warn('Geocoding failed, using coordinates only');
          Alert.alert(
            'Address Unavailable',
            'Could not determine your address, but your location was captured. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Continue', onPress: () => {
                // Use coordinates as fallback
                const lastLocation = locationService.getLastCapturedLocation();
                if (lastLocation) {
                  const { latitude, longitude } = lastLocation;
                  const coordinateAddress = locationService.formatCoordinate(latitude, longitude);
                  createRideRequest(lastLocation.geoPoint, coordinateAddress);
                }
              }},
            ]
          );
          break;

        case LocationErrorType.INVALID_COORDINATE:
          Alert.alert(
            'Invalid Location',
            'The location data received is invalid. Please try again.'
          );
          break;

        default:
          Alert.alert('Location Error', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  // Render: Loading
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.statusText}>Checking location permissions...</Text>
      </View>
    );
  }

  // Render: Permission Denied
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Location Permission Required</Text>
        <Text style={styles.description}>
          Rally needs access to your location to connect you with a designated
          driver. Your location is only captured when you request a ride.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestPermission}
        >
          <Text style={styles.primaryButtonText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render: Main Screen (Permission Granted)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a Ride</Text>

      {currentLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Your Location:</Text>
          <Text style={styles.locationText}>{currentLocation}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleRequestRide}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Request Ride</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Your location will be captured once when you request a ride. Rally does
        not track your location continuously.
      </Text>

      {/* Debug info (remove in production) */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>
            Has Permission: {hasPermission ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Last Location: {locationService.getLastCapturedAddress() || 'None'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  locationContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  debugContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '100%',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default RideRequestExample;
