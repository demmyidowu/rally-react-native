/**
 * Assign DD Screen
 *
 * Assign a DD to an active or upcoming event.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectEvents, fetchAllEvents, selectLoading } from '../../store/slices/eventsSlice';
import { Event } from '../../models/Event';
import { Card, Button, EmptyState, LoadingSpinner, StatusBadge } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { doc, updateDoc, arrayUnion, addDoc, collection, query, where, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'AssignDD'>;

const AssignDDScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const events = useAppSelector(selectEvents);
  const loading = useAppSelector(selectLoading);

  const { ddId, ddName, eventId: _eventId } = route.params || {};
  const selectedDdId = ddId || '';
  const selectedDdName = ddName || 'Unknown DD';
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (user?.chapterId) {
      dispatch(fetchAllEvents());
    }
  }, [dispatch, user?.chapterId]);

  const activeEvents = events?.filter(e =>
    e.status === 'active' || e.status === 'scheduled'
  ) || [];

  const handleAssign = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event to assign to.');
      return;
    }

    console.log('[AssignDD] Starting assignment with:', {
      ddId: selectedDdId,
      ddName: selectedDdName,
      eventId: selectedEventId,
    });

    setAssigning(true);
    try {
      // Add DD to event's assignedDDs array
      const eventRef = doc(db, 'events', selectedEventId);
      await updateDoc(eventRef, {
        assignedDDs: arrayUnion(selectedDdId),
      });
      console.log('[AssignDD] Added ddId to event.assignedDDs array');

      // Check if ddAssignment already exists
      const assignmentQuery = query(
        collection(db, 'ddAssignments'),
        where('eventId', '==', selectedEventId),
        where('ddId', '==', selectedDdId)
      );
      const existingAssignment = await getDocs(assignmentQuery);
      console.log('[AssignDD] Existing assignment check:', existingAssignment.empty ? 'none found' : 'already exists');

      // Create ddAssignment document if it doesn't exist
      if (existingAssignment.empty) {
        // Fetch DD's phone number from user document
        const ddUserDoc = await getDoc(doc(db, 'users', selectedDdId));
        const ddPhone = ddUserDoc.data()?.phoneNumber || '';

        const newAssignment = await addDoc(collection(db, 'ddAssignments'), {
          eventId: selectedEventId,
          ddId: selectedDdId,
          ddName: selectedDdName,
          ddPhone: ddPhone,
          isActive: false,
          currentRides: [],
          totalRides: 0,
          inactiveToggles: 0,
          assignedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        console.log('[AssignDD] Created new ddAssignment with id:', newAssignment.id, 'ddId:', selectedDdId);
      }

      Alert.alert('Success', `${selectedDdName} has been assigned to the event!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[AssignDD] Error assigning DD:', error);
      Alert.alert('Error', 'Failed to assign DD to event');
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderEvent = ({ item }: { item: Event }) => {
    const isSelected = selectedEventId === item.id;
    const isAlreadyAssigned = item.assignedDDs?.includes(selectedDdId);

    return (
      <TouchableOpacity
        onPress={() => !isAlreadyAssigned && setSelectedEventId(item.id)}
        disabled={isAlreadyAssigned}
      >
        <Card style={[
          styles.eventCard,
          isSelected && styles.eventCardSelected,
          isAlreadyAssigned && styles.eventCardDisabled,
        ].filter(Boolean) as any}>
          <View style={styles.eventHeader}>
            <Text style={[
              styles.eventName,
              isAlreadyAssigned && styles.disabledText,
            ]}>
              {item.name || 'Unnamed Event'}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={[
            styles.eventDate,
            isAlreadyAssigned && styles.disabledText,
          ]}>
            📅 {formatDate(item.startTime)}
          </Text>
          {item.location && (
            <Text style={[
              styles.eventLocation,
              isAlreadyAssigned && styles.disabledText,
            ]}>
              📍 {item.location}
            </Text>
          )}
          {isAlreadyAssigned && (
            <View style={styles.alreadyAssignedBadge}>
              <Text style={styles.alreadyAssignedText}>Already Assigned</Text>
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedText}>✓ Selected</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* DD Info */}
      <View style={styles.ddInfoContainer}>
        <Text style={styles.ddInfoLabel}>Assigning:</Text>
        <Text style={styles.ddInfoName}>{selectedDdName}</Text>
      </View>

      {/* Event List */}
      {loading ? (
        <LoadingSpinner />
      ) : activeEvents.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Events Available"
          message="There are no active or scheduled events to assign to."
          actionTitle="Create Event"
          onAction={() => navigation.navigate('CreateEvent')}
        />
      ) : (
        <>
          <FlatList
            data={activeEvents}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.listHeader}>Select an event:</Text>
            }
          />
          <View style={styles.footer}>
            <Button
              title="Assign to Event"
              onPress={handleAssign}
              loading={assigning}
              disabled={!selectedEventId || assigning}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ddInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  ddInfoLabel: {
    ...typography.body,
    color: colors.primaryDark,
    marginRight: spacing.sm,
  },
  ddInfoName: {
    ...typography.h3,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
  },
  listHeader: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  eventCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  eventCardDisabled: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventName: {
    ...typography.h3,
    color: colors.gray[800],
    flex: 1,
  },
  eventDate: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  eventLocation: {
    ...typography.caption,
    color: colors.gray[500],
  },
  disabledText: {
    color: colors.gray[400],
  },
  alreadyAssignedBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  alreadyAssignedText: {
    ...typography.caption,
    color: colors.gray[500],
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  selectedText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});

export default AssignDDScreen;
