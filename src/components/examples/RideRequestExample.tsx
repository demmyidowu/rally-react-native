/**
 * RideRequestExample.tsx
 * Rally React Native
 *
 * Example component showing how to request a ride with location capture
 * Created: 2026-01-11
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { LocationPermissionPrompt } from './LocationPermissionPrompt';
import { PermissionStatus } from '@/services/locationService';

/**
 * Example: Rider Dashboard with Ride Request
 *
 * Demonstrates the full flow:
 * 1. Check location permission
 * 2. Show permission prompt if needed
 * 3. Capture location when requesting ride
 * 4. Display location info
 * 5. Submit ride request
 */
export function RideRequestExample() {
  const {
    location,
    address,
    isLoading,
    error,
    permissionStatus,
    captureLocationWithAddress,
    clearError,
  } = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle ride request
  const handleRequestRide = async () => {
    try {
      clearError();

      // Step 1: Capture location and address
      await captureLocationWithAddress();

      // Step 2: Submit ride request (would call Firebase here)
      setIsSubmitting(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      Alert.alert(
        'Ride Requested',
        'Your ride has been requested successfully!',
        [{ text: 'OK' }]
      );

      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      // Error already set in state by useLocation hook
      Alert.alert(
        'Error',
        error || 'Failed to request ride. Please try again.',
        [{ text: 'OK', onPress: clearError }]
      );
    }
  };

  // If no permission, show permission prompt
  if (permissionStatus !== PermissionStatus.GRANTED) {
    return <LocationPermissionPrompt />;
  }

  // Main ride request UI
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Request a Ride</Text>
        <Text style={styles.subtitle}>
          Your location will be captured when you tap the button below
        </Text>
      </View>

      {/* Location Info (after capture) */}
      {location && address && (
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>Pickup Location</Text>
          <Text style={styles.address}>{address}</Text>
          <Text style={styles.coordinates}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={clearError}
          >
            <Text style={styles.retryButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Request Ride Button */}
      <TouchableOpacity
        style={[
          styles.requestButton,
          (isLoading || isSubmitting) && styles.requestButtonDisabled,
        ]}
        onPress={handleRequestRide}
        disabled={isLoading || isSubmitting}
      >
        {isLoading || isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.requestButtonText}>
            {location ? 'Submit Ride Request' : 'Capture Location & Request'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Info Text */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔋 Battery Efficient: Your location is captured only once when you
          tap the button
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  locationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  address: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 14,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorCard: {
    backgroundColor: '#fff0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  errorText: {
    fontSize: 14,
    color: '#cc0000',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  requestButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  requestButtonDisabled: {
    backgroundColor: '#ccc',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#005299',
    lineHeight: 20,
  },
});

export default RideRequestExample;
