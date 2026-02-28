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
import {
  selectAccessibleEvents,
  fetchAccessibleEvents,
  selectLoading as selectEventsLoading,
} from '../../store/slices/eventsSlice';
import { Event } from '../../models/Event';
import { locationService } from '../../services/locationService';
import { createGeoPoint } from '../../services/firestoreService';
import { validatePickupLocation, GeofenceValidationResult } from '../../services/geofenceService';
import { getUniversityIdFromChapterId } from '../../services/chapterService';
import { Button, Card, AddressAutocomplete } from '../../components';
import { colors, spacing, typography, borderRadius, shadows, borders } from '../../components/theme';
import { EmptyState } from '../../components';

type Props = RiderScreenProps<'RequestRide'>;

type LocationMode = 'auto' | 'manual';

const RequestRideScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const accessibleEvents = useAppSelector(selectAccessibleEvents);
  const loading = useAppSelector(selectLoading);
  const eventsLoading = useAppSelector(selectEventsLoading);

  const isEmergency = route.params?.isEmergency ?? false;

  // Selected event state - auto-select if only one available
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  // Geofence validation state
  const [geofenceResult, setGeofenceResult] = useState<GeofenceValidationResult | null>(null);
  const [validatingGeofence, setValidatingGeofence] = useState(false);

  useEffect(() => {
    captureLocation();
    // Fetch accessible events for this rider based on access rules
    if (user?.id) {
      console.log('[RequestRide] Fetching accessible events for user:', user.id, 'chapterId:', user.chapterId);
      dispatch(fetchAccessibleEvents({ userId: user.id, userChapterId: user.chapterId }));
    }
  }, [dispatch, user?.id, user?.chapterId]);

  /**
   * Validate pickup location against university geofence
   */
  const validateGeofence = async (latitude: number, longitude: number) => {
    // Get university ID from user's chapter
    const universityId = user?.chapterId
      ? getUniversityIdFromChapterId(user.chapterId)
      : 'ksu';

    setValidatingGeofence(true);
    try {
      const result = await validatePickupLocation(
        { latitude, longitude },
        universityId
      );
      setGeofenceResult(result);
      return result.isValid;
    } catch (error) {
      console.error('Geofence validation error:', error);
      // On error, allow the request (fail open)
      setGeofenceResult({ isValid: true });
      return true;
    } finally {
      setValidatingGeofence(false);
    }
  };

  // Auto-select event when accessible events are loaded
  useEffect(() => {
    if (accessibleEvents.length === 1 && !selectedEvent) {
      setSelectedEvent(accessibleEvents[0]);
    } else if (accessibleEvents.length > 1 && !selectedEvent) {
      // Default to first event if multiple available
      setSelectedEvent(accessibleEvents[0]);
    }
  }, [accessibleEvents, selectedEvent]);

  const captureLocation = async () => {
    setLocationStatus('capturing');
    setLocationError(null);
    setGeofenceResult(null);

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

      // Validate geofence after location capture
      await validateGeofence(result.coordinate.latitude, result.coordinate.longitude);
    } catch (error: any) {
      setLocationStatus('error');
      setLocationError(error.message || 'Failed to get location. You can enter your address manually.');
    }
  };

  const handleManualAddressSelect = async (address: string, latitude: number, longitude: number) => {
    setGeofenceResult(null);
    setCurrentLocation({
      latitude,
      longitude,
      address,
    });
    setLocationStatus('captured');

    // Validate geofence for manually entered address
    await validateGeofence(latitude, longitude);
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

    if (!selectedEvent) {
      Alert.alert('No Event Selected', 'Please select an event to request a ride from.');
      return;
    }

    try {
      console.log('[RequestRide] Submitting ride request with:', {
        riderId: user.id,
        riderChapterId: user.chapterId,
        selectedEventId: selectedEvent.id,
        selectedEventChapterId: selectedEvent.chapterId,
        hasSelectedEvent: !!selectedEvent,
      });

      await dispatch(requestRide({
        riderId: user.id,
        riderName: user.name,
        riderPhone: user.phoneNumber || '',
        classYear: user.classYear || 1,
        riderChapterId: user.chapterId,
        eventId: selectedEvent.id,
        eventChapterId: selectedEvent.chapterId,
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
            <View style={styles.locationCapturingRow}>
              <Ionicons name="locate" size={18} color={colors.info} style={{ marginRight: spacing.xs }} />
              <Text style={styles.locationStatusText}>Capturing your location...</Text>
            </View>
          </View>
        )}

        {locationStatus === 'captured' && currentLocation && (
          <View>
            <View style={[
              styles.locationCaptured,
              geofenceResult && !geofenceResult.isValid && styles.locationCapturedInvalid
            ]}>
              <Ionicons
                name={geofenceResult && !geofenceResult.isValid ? "warning" : "checkmark-circle"}
                size={20}
                color={geofenceResult && !geofenceResult.isValid ? colors.error : colors.success}
              />
              <View style={styles.locationCapturedContent}>
                <Text style={[
                  styles.locationAddress,
                  geofenceResult && !geofenceResult.isValid && styles.locationAddressInvalid
                ]}>
                  {currentLocation.address}
                </Text>
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

            {/* Geofence validation error */}
            {geofenceResult && !geofenceResult.isValid && (
              <View style={styles.geofenceError}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.geofenceErrorText}>
                  {geofenceResult.errorMessage}
                </Text>
              </View>
            )}

            {/* Geofence validation in progress */}
            {validatingGeofence && (
              <View style={styles.geofenceValidating}>
                <Text style={styles.geofenceValidatingText}>
                  Verifying service area...
                </Text>
              </View>
            )}
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

  // Show empty state if no accessible events
  if (!eventsLoading && accessibleEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon="calendar-outline"
          title="No Active Events"
          message="There are no active events you can request rides from right now. Please check back later."
          actionTitle="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
              <View style={styles.emergencyIconContainer}>
                <Ionicons name="alert-circle" size={32} color={colors.error} />
              </View>
              <View style={styles.emergencyTextContainer}>
                <Text style={styles.emergencyTitle}>Emergency Ride</Text>
                <Text style={styles.emergencySubtitle}>
                  You will be prioritized in the queue
                </Text>
              </View>
            </View>
          )}

          {/* Event Selector - show if multiple events available */}
          {accessibleEvents.length > 1 && (
            <Card style={styles.eventCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Select Event</Text>
              </View>
              <View style={styles.eventSelector}>
                {accessibleEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventOption,
                      selectedEvent?.id === event.id && styles.eventOptionSelected,
                    ]}
                    onPress={() => setSelectedEvent(event)}
                  >
                    <Text
                      style={[
                        styles.eventOptionText,
                        selectedEvent?.id === event.id && styles.eventOptionTextSelected,
                      ]}
                    >
                      {event.name}
                    </Text>
                    {selectedEvent?.id === event.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Show selected event if only one available */}
          {accessibleEvents.length === 1 && selectedEvent && (
            <Card style={styles.selectedEventBadge}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.selectedEventText}>{selectedEvent.name}</Text>
            </Card>
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
                <View style={styles.noteIconContainer}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
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
            loading={loading || validatingGeofence}
            disabled={loading || validatingGeofence || !currentLocation || !selectedEvent || (geofenceResult !== null && !geofenceResult.isValid)}
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
  emergencyIconContainer: {
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
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  eventSelector: {
    gap: spacing.sm,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: borders.thin,
    borderColor: colors.gray[200],
  },
  eventOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  eventOptionText: {
    ...typography.body,
    color: colors.gray[700],
    flex: 1,
  },
  eventOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
    ...shadows.xs,
  },
  selectedEventText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
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
  locationCapturingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationStatusText: {
    ...typography.body,
    color: colors.info,
  },
  locationCaptured: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationCapturedInvalid: {
    backgroundColor: colors.errorLight,
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
  locationAddressInvalid: {
    color: colors.error,
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
  noteIconContainer: {
    marginRight: spacing.sm,
    marginTop: spacing.md,
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
  geofenceError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  geofenceErrorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  geofenceValidating: {
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  geofenceValidatingText: {
    ...typography.caption,
    color: colors.gray[500],
  },
});

export default RequestRideScreen;
