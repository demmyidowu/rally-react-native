/**
 * DD Management Screen
 *
 * Shows designated drivers assigned to the ACTIVE event only.
 * Displays event-specific stats from ddAssignments collection.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent, fetchActiveEvent } from '../../store/slices/eventsSlice';
import { selectAssignments, fetchDDAssignments } from '../../store/slices/ddAssignmentsSlice';
import { DDAssignment } from '../../models/DDAssignment';
import { Card, Button, EmptyState, LoadingSpinner, Input } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = AdminScreenProps<'DDManagement'>;

const DDManagementScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const ddAssignments = useAppSelector(selectAssignments);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.chapterId) return;

    setLoading(true);
    try {
      // First fetch active event for this chapter
      const eventResult = await dispatch(fetchActiveEvent(user.chapterId)).unwrap();

      // If there's an active event, fetch its DD assignments
      if (eventResult?.id) {
        await dispatch(fetchDDAssignments(eventResult.id)).unwrap();
      }
    } catch (error) {
      console.error('Error loading DD data:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, user?.chapterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDDs = ddAssignments.filter(dd =>
    dd.ddName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDD = ({ item }: { item: DDAssignment }) => (
    <Card style={styles.ddCard}>
      <View style={styles.ddHeader}>
        <View style={styles.ddAvatar}>
          <Text style={styles.ddAvatarText}>
            {item.ddName?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
        <View style={styles.ddInfo}>
          <Text style={styles.ddName}>{item.ddName}</Text>
          {item.carDescription && (
            <Text style={styles.ddCar}>🚗 {item.carDescription}</Text>
          )}
        </View>
      </View>
      <View style={styles.ddStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalRides || 0}</Text>
          <Text style={styles.statLabel}>Event Rides</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.currentRides?.length || 0}</Text>
          <Text style={styles.statLabel}>Current</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.isActive ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.isActive ? styles.activeText : styles.inactiveText
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </Card>
  );

  // No active event - show empty state with navigation to Event Management
  if (!loading && !activeEvent) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="calendar-outline"
            title="No Active Event"
            message="There is no active event. Start an event first to manage designated drivers."
          />
          <View style={styles.navigationButton}>
            <Button
              title="Go to Event Management"
              onPress={() => navigation.navigate('EventManagement')}
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Event Info */}
      {activeEvent && (
        <View style={styles.eventBanner}>
          <Text style={styles.eventLabel}>Active Event</Text>
          <Text style={styles.eventName}>{activeEvent.name}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          label="Search"
          placeholder="Search DD..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* DD List */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredDDs.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title="No DDs Assigned"
          message={searchQuery
            ? "No matching DDs found."
            : "No designated drivers are assigned to this event. Assign DDs from the Members page."}
        />
      ) : (
        <FlatList
          data={filteredDDs}
          renderItem={renderDD}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.primary]} />
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
  eventBanner: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  eventLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
  },
  eventName: {
    ...typography.h3,
    color: colors.white,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  listContent: {
    padding: spacing.lg,
  },
  ddCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  ddHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  ddAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ddAvatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  ddInfo: {
    flex: 1,
  },
  ddName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  ddCar: {
    ...typography.caption,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  ddStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray[500],
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  activeBadge: {
    backgroundColor: colors.successLight,
  },
  inactiveBadge: {
    backgroundColor: colors.gray[100],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.gray[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  navigationButton: {
    marginTop: spacing.xl,
  },
});

export default DDManagementScreen;
