/**
 * Edit Event Screen
 *
 * Form to edit an existing event, update details, and end the event.
 */

import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectActiveEvent, selectEvents, updateEvent, endEvent, activateEvent, selectLoading } from '../../store/slices/eventsSlice';
import { Input, Button, Card } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { EventStatus } from '../../models/Event';

type Props = AdminScreenProps<'EditEvent'>;

const EditEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const dispatch = useAppDispatch();
  const activeEvent = useAppSelector(selectActiveEvent);
  const allEvents = useAppSelector(selectEvents);
  const loading = useAppSelector(selectLoading);

  // Find the event from events list or active event
  const event = allEvents.find(e => e.id === eventId) || (activeEvent?.id === eventId ? activeEvent : null);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load event data
  useEffect(() => {
    if (event) {
      setName(event.name || '');
      setLocation(event.location || '');
      setDescription(event.description || '');
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [event]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Event name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;

    try {
      await dispatch(updateEvent({
        eventId,
        updates: {
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
        },
      })).unwrap();

      Alert.alert('Success', 'Event updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update event');
    }
  };

  const handleEndEvent = () => {
    Alert.alert(
      'End Event',
      'Are you sure you want to end this event? This will cancel all queued rides and mark the event as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Event',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(endEvent(eventId)).unwrap();
              Alert.alert('Event Ended', 'The event has been ended successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to end event');
            }
          },
        },
      ]
    );
  };

  const handleActivateEvent = () => {
    Alert.alert(
      'Activate Event',
      'Are you sure you want to start this event? DDs will be able to go active and riders can request rides. Any other active event will be ended.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await dispatch(activateEvent({ eventId, chapterId: event?.chapterId })).unwrap();
              Alert.alert('Event Activated', 'The event is now live!', [
                { text: 'OK' },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to activate event');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <Text style={styles.errorSubtext}>The event may have ended or been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEventActive = event.status === EventStatus.ACTIVE || event.status === EventStatus.SCHEDULED;

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
        >
          {/* Event Status */}
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={[styles.statusBadge,
              event.status === EventStatus.ACTIVE && styles.statusActive,
              event.status === EventStatus.SCHEDULED && styles.statusScheduled,
              event.status === EventStatus.COMPLETED && styles.statusCompleted,
              ]}>
                <Text style={styles.statusText}>
                  {event.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </Card>

          {/* Event Details */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            <Input
              label="Event Name"
              placeholder="e.g., Friday Night Rides"
              value={name}
              onChangeText={setName}
              error={errors.name}
              editable={!loading && isEventActive}
            />
            <Input
              label="Location (Optional)"
              placeholder="e.g., K-State Campus"
              value={location}
              onChangeText={setLocation}
              editable={!loading && isEventActive}
            />
            <Input
              label="Description (Optional)"
              placeholder="Event details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              editable={!loading && isEventActive}
            />
          </Card>

          {/* Actions */}
          {isEventActive && (
            <View style={styles.actions}>
              {/* Show Activate button for scheduled events */}
              {event.status === EventStatus.SCHEDULED && (
                <Button
                  title="Activate Event"
                  onPress={handleActivateEvent}
                  loading={loading}
                  fullWidth
                  style={styles.activateButton}
                />
              )}

              <Button
                title="Save Changes"
                onPress={handleUpdate}
                loading={loading}
                fullWidth
                style={styles.saveButton}
              />
              <Button
                title="End Event"
                onPress={handleEndEvent}
                variant="danger"
                fullWidth
                style={styles.endButton}
              />
            </View>
          )}

          {!isEventActive && (
            <Card style={styles.infoCard}>
              <Text style={styles.infoText}>
                This event has ended and cannot be edited.
              </Text>
            </Card>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.h3,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
  },
  statusCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    ...typography.body,
    color: colors.gray[600],
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[200],
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusScheduled: {
    backgroundColor: colors.info + '20',
  },
  statusCompleted: {
    backgroundColor: colors.gray[200],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray[700],
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  actions: {
    marginBottom: spacing.xl,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  activateButton: {
    marginBottom: spacing.md,
    backgroundColor: colors.success,
  },
  endButton: {
    marginBottom: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.gray[100],
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
  },
});

export default EditEventScreen;
