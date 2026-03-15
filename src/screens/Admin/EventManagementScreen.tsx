/**
 * Event Management Screen
 *
 * Lists all events with options to create, edit, and manage.
 */

import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectEvents, fetchAllEvents, selectLoading } from '../../store/slices/eventsSlice';
import { Event } from '../../models/Event';
import { Card, StatusBadge, EmptyState } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = AdminScreenProps<'EventManagement'>;

type FilterStatus = 'all' | 'active' | 'scheduled' | 'completed';

const EventManagementScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const events = useAppSelector(selectEvents);
  const loading = useAppSelector(selectLoading);

  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (user?.chapterId) {
      dispatch(fetchAllEvents(user.chapterId));
    }
  }, [dispatch, user?.chapterId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateEvent')}
          style={{ marginRight: 16 }}
        >
          <Text style={{ fontSize: 28, color: colors.primary, lineHeight: 32 }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleRefresh = () => {
    if (user?.chapterId) {
      dispatch(fetchAllEvents(user.chapterId));
    }
  };

  const getFilteredEvents = (): Event[] => {
    if (!events) return [];

    // Sort order: active > scheduled > completed
    const statusOrder = { active: 0, scheduled: 1, completed: 2, cancelled: 3 };

    const sortEvents = (eventList: Event[]): Event[] => {
      return [...eventList].sort((a, b) => {
        const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
        const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
        return orderA - orderB;
      });
    };

    switch (filter) {
      case 'active':
        return events.filter((e) => e.status === 'active');
      case 'scheduled':
        return events.filter((e) => e.status === 'scheduled');
      case 'completed':
        return events.filter((e) => e.status === 'completed');
      default:
        return sortEvents(events);
    }
  };

  const filteredEvents = getFilteredEvents();

  const handleEventPress = (event: Event) => {
    navigation.navigate('EditEvent', { eventId: event.id });
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity onPress={() => handleEventPress(item)}>
      <Card style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{item.name || 'Unnamed Event'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.eventDetails}>
          <Text style={styles.eventDate}>📅 {formatDate(item.startTime)}</Text>
          {item.location && (
            <Text style={styles.eventLocation}>📍 {item.location}</Text>
          )}
        </View>
        <View style={styles.eventStats}>
          <Text style={styles.eventStat}>{item.assignedDDs?.length || 0} DDs</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Events"
          message={filter === 'all' ? "No events created yet." : `No ${filter} events.`}
          actionTitle="Create Event"
          onAction={() => navigation.navigate('CreateEvent')}
        />
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    color: colors.gray[600],
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
  },
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  eventDetails: {
    marginBottom: spacing.sm,
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
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventStat: {
    ...typography.caption,
    color: colors.primary,
  },
  eventStatDivider: {
    marginHorizontal: spacing.sm,
    color: colors.gray[300],
  },
});

export default EventManagementScreen;
