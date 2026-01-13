/**
 * DDEnRouteExample.tsx
 * Rally React Native
 *
 * Example component showing DD marking ride as en route with location capture
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
} from 'react-native';
import { locationService } from '@/services/locationService';

interface DDEnRouteExampleProps {
  rideId: string;
  riderName: string;
  riderAddress: string;
  onEnRoute?: () => void;
}

/**
 * Example: DD marks ride as en route
 *
 * Flow:
 * 1. DD taps "Mark En Route"
 * 2. Capture DD's current location (one-time)
 * 3. Update ride status to "enroute" in Firestore
 * 4. Cloud Function calculates ETA and sends SMS to rider
 */
export function DDEnRouteExample({
  rideId: _rideId,
  riderName,
  riderAddress,
  onEnRoute,
}: DDEnRouteExampleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkEnRoute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Check permission (should already be granted for DD)
      const hasPermission = await locationService.hasLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission is required');
      }

      // Step 2: Capture DD's current location (no address needed)
      console.log('Capturing DD location for ETA calculation...');
      const { coordinate } = await locationService.captureLocationOnce();

      console.log('DD location captured:', {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      // Step 3: Update ride in Firestore
      // In a real implementation, this would call a service
      // that updates Firestore and triggers Cloud Function for ETA
      /*
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'enroute',
        ddLocation: geoPoint,
        enrouteTime: new Date(),
      });
      */

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsLoading(false);

      // Success - show confirmation
      Alert.alert(
        'En Route',
        `You are now en route to ${riderName}. The rider has been notified.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onEnRoute) {
                onEnRoute();
              }
            },
          },
        ]
      );
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark en route';
      setError(errorMessage);

      Alert.alert('Error', errorMessage, [
        { text: 'OK', onPress: () => setError(null) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Rider Info */}
      <View style={styles.riderCard}>
        <Text style={styles.sectionLabel}>PICKUP</Text>
        <Text style={styles.riderName}>{riderName}</Text>
        <Text style={styles.riderAddress}>{riderAddress}</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Mark En Route Button */}
      <TouchableOpacity
        style={[styles.enRouteButton, isLoading && styles.buttonDisabled]}
        onPress={handleMarkEnRoute}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.enRouteIcon}>🚗</Text>
            <Text style={styles.enRouteButtonText}>Mark En Route</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info Text */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📍 Your current location will be captured to calculate ETA
        </Text>
        <Text style={styles.infoText}>
          📱 The rider will receive an SMS with your ETA
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  riderCard: {
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  riderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  riderAddress: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
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
  },
  enRouteButton: {
    backgroundColor: '#34C759',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  enRouteIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  enRouteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e8f9ed',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  infoText: {
    fontSize: 14,
    color: '#1a7a33',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default DDEnRouteExample;
