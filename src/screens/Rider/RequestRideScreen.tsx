/**
 * Request Ride Screen
 *
 * Allows riders to request a new ride with:
 * - Current location capture (with manual entry fallback)
 * - Destination input with Google Places autocomplete
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { requestRide, selectLoading } from '../../store/slices/ridesSlice';
import { locationService } from '../../services/locationService';
import { createGeoPoint } from '../../services/firestoreService';
import { Button, Header, Card, AddressAutocomplete } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = RiderScreenProps<'RequestRide'>;

type LocationMode = 'auto' | 'manual';

const RequestRideScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  const isEmergency = route.params?.isEmergency ?? false;

  // Location states
  const [locationMode, setLocationMode] = useState<LocationMode>('auto');
  const [locationStatus, setLocationStatus] = useState<'pending' | 'capturing' | 'captured' | 'error'>('pending');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form states
  const [notes, setNotes] = useState('');

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
      setLocationMode('auto');
    } catch (error: any) {
      setLocationStatus('error');
      setLocationError(error.message || 'Failed to get location. You can enter your address manually.');
    }
  };

  const handleManualAddressSelect = (address: string, latitude: number, longitude: number) => {
    setCurrentLocation({
      latitude,
      longitude,
      address,
    });
    setLocationStatus('captured');
  };



  const switchToManualEntry = () => {
    setLocationMode('manual');
    setLocationStatus('pending');
    setCurrentLocation(null);
  };

  const switchToAutoLocation = () => {
    setLocationMode('auto');
    captureLocation();
  };

  const handleSubmit = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please provide your pickup location.');
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
        pickupAddress: currentLocation.address,
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

  const renderPickupLocation = () => {
    // Manual entry mode
    if (locationMode === 'manual') {
      return (
        <View>
          <AddressAutocomplete
            label="Enter Pickup Address"
            placeholder="Start typing your address..."
            onAddressSelect={handleManualAddressSelect}
            onError={(error) => setLocationError(error)}
            error={locationError || undefined}
          />
          {currentLocation && (
            <View style={styles.locationCaptured}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.locationAddress}>{currentLocation.address}</Text>
            </View>
          )}
          <TouchableOpacity onPress={switchToAutoLocation} style={styles.switchModeButton}>
            <Ionicons name="locate" size={16} color={colors.primary} />
            <Text style={styles.switchModeText}>Use my current location instead</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Auto location mode
    return (
      <View>
        {locationStatus === 'capturing' && (
          <View style={styles.locationStatus}>
            <Text style={styles.locationStatusText}>📍 Capturing your location...</Text>
          </View>
        )}

        {locationStatus === 'captured' && currentLocation && (
          <View style={styles.locationCaptured}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={styles.locationCapturedContent}>
              <Text style={styles.locationAddress}>{currentLocation.address}</Text>
              <View style={styles.locationActions}>
                <TouchableOpacity onPress={captureLocation} style={styles.actionLink}>
                  <Text style={styles.actionLinkText}>Refresh location</Text>
                </TouchableOpacity>
                <Text style={styles.actionDivider}>•</Text>
                <TouchableOpacity onPress={switchToManualEntry} style={styles.actionLink}>
                  <Text style={styles.actionLinkText}>Enter different address</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {locationStatus === 'error' && (
          <View style={styles.locationError}>
            <Ionicons name="warning" size={24} color={colors.error} />
            <View style={styles.locationErrorContent}>
              <Text style={styles.locationErrorText}>{locationError}</Text>
              <View style={styles.errorActions}>
                <Button
                  title="Try Again"
                  variant="secondary"
                  onPress={captureLocation}
                  style={styles.errorButton}
                />
                <Button
                  title="Enter Address Manually"
                  variant="primary"
                  onPress={switchToManualEntry}
                  style={styles.errorButton}
                />
              </View>
            </View>
          </View>
        )}

        {locationStatus === 'pending' && (
          <Button
            title="Capture My Location"
            onPress={captureLocation}
          />
        )}
      </View>
    );
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

          {/* Pickup Location Section */}
          <Card style={styles.locationCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Pickup Location</Text>
            </View>
            {renderPickupLocation()}
          </Card>

          {/* Notes */}
          <Card style={styles.formCard}>
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes (Optional)</Text>
              <View style={styles.notesInputContainer}>
                <Text style={styles.noteIcon}>📝</Text>
                <View style={styles.notesTextAreaWrapper}>
                  <TextInput
                    style={styles.notesTextArea}
                    placeholder="Any special instructions?"
                    placeholderTextColor={colors.gray[400]}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>
          </Card>

          {/* Submit Button */}
          <Button
            title={isEmergency ? 'Request Emergency Ride' : 'Request Ride'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !currentLocation}
            style={isEmergency ? styles.emergencySubmitButton : styles.submitButton}
          />

          {/* Info */}
          <Text style={styles.infoText}>
            Your pickup location is used once to connect you with a DD. It is not tracked continuously.
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
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginLeft: spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationCapturedContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  locationAddress: {
    ...typography.body,
    color: colors.success,
    flex: 1,
    marginLeft: spacing.sm,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  actionLink: {
    paddingVertical: spacing.xs,
  },
  actionLinkText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  actionDivider: {
    ...typography.caption,
    color: colors.gray[400],
    marginHorizontal: spacing.sm,
  },
  locationError: {
    flexDirection: 'row',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationErrorContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  locationErrorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
  errorActions: {
    gap: spacing.sm,
  },
  errorButton: {
    marginBottom: spacing.xs,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  switchModeText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  destinationConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.sm,
  },
  destinationText: {
    ...typography.caption,
    color: colors.success,
    marginLeft: spacing.xs,
    flex: 1,
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
  notesSection: {
    marginBottom: spacing.sm,
  },
  notesLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  notesInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
    marginTop: spacing.sm,
  },
  notesTextAreaWrapper: {
    flex: 1,
  },
  notesTextArea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    ...typography.body,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  emergencySubmitButton: {
    backgroundColor: colors.error,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.gray[400],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default RequestRideScreen;
