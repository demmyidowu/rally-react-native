/**
 * DDEnRouteExample.tsx
 * Rally - React Native Edition
 *
 * Example implementation showing how DDs use LocationService
 * when marking themselves "en route" to pick up a rider.
 *
 * This demonstrates:
 * - Capturing DD's location (no address needed)
 * - Updating ride status
 * - ETA calculation preparation
 * - SMS notification trigger
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { GeoPoint, Timestamp } from 'firebase/firestore';
import {
  locationService,
  LocationServiceError,
  LocationErrorType,
} from '@/services/locationService';

// Example ride interface (simplified)
interface Ride {
  id: string;
  riderId: string;
  riderName: string;
  pickupAddress: string;
  pickupLocation: GeoPoint;
  status: 'queued' | 'assigned' | 'enroute' | 'completed' | 'cancelled';
}

interface DDEnRouteExampleProps {
  ride: Ride;
  ddId: string;
  onEnRoute: (rideId: string, eta: number) => void;
}

const DDEnRouteExample: React.FC<DDEnRouteExampleProps> = ({
  ride,
  ddId,
  onEnRoute,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle DD marking themselves as en route
   *
   * This method:
   * 1. Captures DD's current location (one-time, high accuracy)
   * 2. Calculates ETA to pickup location
   * 3. Updates ride status in Firestore
   * 4. Triggers SMS notification to rider
   */
  const handleMarkEnRoute = async () => {
    setIsLoading(true);

    try {
      // 1. Check location permission
      const hasPermission = await locationService.hasLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Location access is needed to mark yourself en route.',
          [
            {
              text: 'Enable',
              onPress: async () => {
                const { granted } = await locationService.requestLocationPermission();
                if (granted) {
                  handleMarkEnRoute(); // Retry
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // 2. Capture DD's current location (no address needed for DD)
      console.log('Capturing DD location...');
      const { geoPoint, latitude, longitude } = await locationService.captureDDLocation();

      console.log(`DD location captured: ${latitude}, ${longitude}`);

      // 3. Calculate ETA (in a real app, this would use a separate ETA service)
      const eta = await calculateETA(
        { latitude, longitude },
        {
          latitude: ride.pickupLocation.latitude,
          longitude: ride.pickupLocation.longitude,
        }
      );

      console.log(`ETA calculated: ${eta} minutes`);

      // 4. Update ride status in Firestore
      await updateRideStatus(ride.id, geoPoint, eta);

      // 5. Show success message
      Alert.alert(
        'En Route',
        `You're en route to pick up ${ride.riderName}!\n\nETA: ${eta} minutes\n\nThe rider has been notified via SMS.`,
        [
          {
            text: 'OK',
            onPress: () => onEnRoute(ride.id, eta),
          },
        ]
      );

    } catch (error) {
      handleLocationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate ETA from DD location to pickup location
   *
   * In a real app, this would:
   * - Use Google Maps API or MapKit
   * - Calculate driving route
   * - Consider traffic conditions
   * - Return estimated time in minutes
   *
   * For this example, we use a simple distance-based estimate
   */
  const calculateETA = async (
    ddLocation: { latitude: number; longitude: number },
    pickupLocation: { latitude: number; longitude: number }
  ): Promise<number> => {
    // Simple distance-based ETA (not production-ready)
    // In production, use Google Maps Directions API or similar

    // Calculate straight-line distance (km)
    const distance = calculateDistance(
      ddLocation.latitude,
      ddLocation.longitude,
      pickupLocation.latitude,
      pickupLocation.longitude
    );

    // Assume average speed of 40 km/h in Manhattan
    const avgSpeedKmPerHour = 40;
    const etaMinutes = Math.ceil((distance / avgSpeedKmPerHour) * 60);

    // Add 2 minutes buffer
    return Math.max(etaMinutes + 2, 5); // Minimum 5 minutes
  };

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  /**
   * Update ride status in Firestore
   */
  const updateRideStatus = async (
    rideId: string,
    ddLocation: GeoPoint,
    eta: number
  ) => {
    try {
      // In a real app, this would use Firestore service
      // Example update:
      const updateData = {
        status: 'enroute',
        ddLocation, // GeoPoint
        estimatedETA: eta, // Number (minutes)
        enrouteAt: Timestamp.now(),
      };

      console.log('Updating ride:', updateData);

      // TODO: Call Firestore service
      // await rideService.updateRide(rideId, updateData);

      // Cloud Function will automatically:
      // - Send SMS to rider with ETA
      // - Update ride priority in queue
      // - Log activity

    } catch (error) {
      console.error('Error updating ride:', error);
      throw new Error('Failed to update ride status');
    }
  };

  /**
   * Handle location errors
   */
  const handleLocationError = (error: unknown) => {
    if (error instanceof LocationServiceError) {
      switch (error.type) {
        case LocationErrorType.PERMISSION_DENIED:
          Alert.alert(
            'Permission Required',
            'Location access is needed to mark yourself en route. Please enable it in Settings.'
          );
          break;

        case LocationErrorType.TIMEOUT:
          Alert.alert(
            'Location Timeout',
            'Could not get your location. Please try again.',
            [
              { text: 'Retry', onPress: handleMarkEnRoute },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          break;

        case LocationErrorType.LOCATION_UNAVAILABLE:
          Alert.alert(
            'Location Unavailable',
            'Location services are currently unavailable. Please enable location services and try again.'
          );
          break;

        default:
          Alert.alert('Error', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
      Alert.alert(
        'Error',
        'Failed to mark en route. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.rideCard}>
        <Text style={styles.rideTitle}>Assigned Ride</Text>

        <View style={styles.rideDetail}>
          <Text style={styles.label}>Rider:</Text>
          <Text style={styles.value}>{ride.riderName}</Text>
        </View>

        <View style={styles.rideDetail}>
          <Text style={styles.label}>Pickup:</Text>
          <Text style={styles.value}>{ride.pickupAddress}</Text>
        </View>

        <View style={styles.rideDetail}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, styles.statusBadge]}>
            {ride.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.enRouteButton, isLoading && styles.buttonDisabled]}
        onPress={handleMarkEnRoute}
        disabled={isLoading || ride.status !== 'assigned'}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.enRouteButtonText}>Mark En Route</Text>
            <Text style={styles.enRouteButtonSubtext}>
              This will notify the rider
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Your location will be captured once to calculate ETA. The rider will
        receive an SMS with your estimated arrival time.
      </Text>

      {/* Debug info (remove in production) */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>
            Last DD Location: {locationService.getLastCapturedLocation()
              ? `${locationService.getLastCapturedLocation()?.latitude.toFixed(6)}, ${locationService.getLastCapturedLocation()?.longitude.toFixed(6)}`
              : 'None'}
          </Text>
          <Text style={styles.debugText}>
            Pickup Location: {ride.pickupLocation.latitude.toFixed(6)}, {ride.pickupLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  rideCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  rideTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  rideDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  statusBadge: {
    backgroundColor: '#FFA500',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 5,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  enRouteButton: {
    backgroundColor: '#34C759',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  enRouteButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  enRouteButtonSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  debugContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
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

export default DDEnRouteExample;
