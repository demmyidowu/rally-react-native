/**
 * Request Ride Screen
 *
 * Allows riders to request a new ride with:
 * - Current location capture
 * - Destination input
 * - Number of passengers
 * - Emergency option
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { requestRide, selectLoading } from '../../store/slices/ridesSlice';
import { locationService } from '../../services/locationService';
import { createGeoPoint } from '../../services/firestoreService';
import { Button, Input, Header, Card } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = RiderScreenProps<'RequestRide'>;

const RequestRideScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  const isEmergency = route.params?.isEmergency ?? false;

  const [destination, setDestination] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState<'pending' | 'capturing' | 'captured' | 'error'>('pending');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = async () => {
    setLocationStatus('capturing');
    setLocationError(null);

    try {
      const result = await locationService.captureLocationOnce();
      const address = await locationService.reverseGeocode(
        result.coordinate.latitude,
        result.coordinate.longitude
      );
      setCurrentLocation({
        latitude: result.coordinate.latitude,
        longitude: result.coordinate.longitude,
        address: address || 'Location captured',
      });
      setLocationStatus('captured');
    } catch (error: any) {
      setLocationStatus('error');
      setLocationError(error.message || 'Failed to get location');
    }
  };

  const handleSubmit = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please capture your current location.');
      return;
    }

    if (!destination.trim()) {
      Alert.alert('Destination Required', 'Please enter your destination.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to request a ride.');
      return;
    }

    try {
      await dispatch(requestRide({
        riderId: user.id,
        riderName: user.name,
        riderPhone: user.phoneNumber || '',
        classYear: user.classYear || 1,
        pickupLocation: createGeoPoint(
          currentLocation.latitude,
          currentLocation.longitude
        ),
        dropoffLocation: undefined, // Will be geocoded from destination  
        isEmergency,
        notes: notes.trim() || undefined,
      })).unwrap();

      Alert.alert(
        isEmergency ? 'Emergency Ride Requested' : 'Ride Requested',
        'Your ride has been added to the queue. You will be notified when a DD is assigned.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request ride');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={isEmergency ? 'Emergency Ride' : 'Request a Ride'}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEmergency && (
            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyIcon}>🚨</Text>
              <View style={styles.emergencyTextContainer}>
                <Text style={styles.emergencyTitle}>Emergency Ride</Text>
                <Text style={styles.emergencySubtitle}>
                  You will be prioritized in the queue
                </Text>
              </View>
            </View>
          )}

          {/* Location Section */}
          <Card style={styles.locationCard}>
            <Text style={styles.sectionTitle}>Pickup Location</Text>

            {locationStatus === 'capturing' && (
              <View style={styles.locationStatus}>
                <Text style={styles.locationStatusText}>📍 Capturing your location...</Text>
              </View>
            )}

            {locationStatus === 'captured' && currentLocation && (
              <View style={styles.locationCaptured}>
                <Text style={styles.locationAddress}>{currentLocation.address}</Text>
                <TouchableOpacity onPress={captureLocation} style={styles.recaptureButton}>
                  <Text style={styles.recaptureText}>Update Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {locationStatus === 'error' && (
              <View style={styles.locationError}>
                <Text style={styles.locationErrorText}>{locationError}</Text>
                <Button
                  title="Try Again"
                  variant="secondary"
                  onPress={captureLocation}
                  style={styles.retryButton}
                />
              </View>
            )}

            {locationStatus === 'pending' && (
              <Button
                title="Capture My Location"
                onPress={captureLocation}
              />
            )}
          </Card>

          {/* Destination */}
          <Card style={styles.formCard}>
            <Input
              label="Destination"
              placeholder="Where do you want to go?"
              value={destination}
              onChangeText={setDestination}
              editable={!loading}
            />

            {/* Passenger Count */}
            <View style={styles.passengerSection}>
              <Text style={styles.passengerLabel}>Number of Passengers</Text>
              <View style={styles.passengerButtons}>
                {[1, 2, 3, 4].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.passengerButton,
                      passengerCount === num && styles.passengerButtonActive,
                    ]}
                    onPress={() => setPassengerCount(num)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.passengerButtonText,
                        passengerCount === num && styles.passengerButtonTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <Input
              label="Notes (Optional)"
              placeholder="Any special instructions?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </Card>

          {/* Submit Button */}
          <Button
            title={isEmergency ? 'Request Emergency Ride' : 'Request Ride'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || locationStatus !== 'captured'}
            style={isEmergency ? styles.emergencySubmitButton : styles.submitButton}
          />

          {/* Info */}
          <Text style={styles.infoText}>
            Your location is captured once when requesting a ride. It is not tracked continuously.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    ...typography.h3,
    color: colors.error,
  },
  emergencySubtitle: {
    ...typography.caption,
    color: colors.error,
  },
  locationCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  locationStatus: {
    padding: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.md,
  },
  locationStatusText: {
    ...typography.body,
    color: colors.info,
    textAlign: 'center',
  },
  locationCaptured: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationAddress: {
    ...typography.body,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  recaptureButton: {
    alignSelf: 'flex-start',
  },
  recaptureText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  locationError: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationErrorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.sm,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  passengerSection: {
    marginBottom: spacing.lg,
  },
  passengerLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  passengerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  passengerButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  passengerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  passengerButtonText: {
    ...typography.h3,
    color: colors.gray[600],
  },
  passengerButtonTextActive: {
    color: colors.white,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  emergencySubmitButton: {
    backgroundColor: colors.error,
  },
  infoText: {
    ...typography.caption,
    color: colors.gray[400],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default RequestRideScreen;
