/**
 * Admin Dashboard Screen
 *
 * Main admin dashboard with event overview, stats, and quick actions.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent, fetchActiveEvent, selectLoading as selectEventsLoading } from '../../store/slices/eventsSlice';
import { Card, StatusBadge } from '../../components';
import { colors, spacing, typography, borderRadius, shadows } from '../../components/theme';

type Props = AdminScreenProps<'AdminDashboard'>;

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const loading = useAppSelector(selectEventsLoading);

  useEffect(() => {
    if (user?.chapterId) {
      dispatch(fetchActiveEvent(user.chapterId));
    }
  }, [dispatch, user?.chapterId]);

  const handleRefresh = () => {
    if (user?.chapterId) {
      dispatch(fetchActiveEvent(user.chapterId));
    }
  };

  // Quick stats - these would come from a separate stats endpoint in production
  const quickStats = {
    activeRides: 0,  // TODO: Fetch from rides slice
    activeDDs: (activeEvent?.assignedDDs?.length) || 0,
    completedRides: 0,  // TODO: Fetch from rides slice
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>
        </View>

        {/* Active Event Card */}
        <Card style={styles.eventCard}>
          {activeEvent ? (
            <>
              <View style={styles.eventHeader}>
                <Text style={styles.eventName}>{activeEvent.name || 'Active Event'}</Text>
                <StatusBadge status={activeEvent.status} />
              </View>
              <Text style={styles.eventTime}>
                Started at {new Date(activeEvent.startTime?.toDate?.() || Date.now()).toLocaleTimeString()}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.noEventText}>No Active Event</Text>
              <TouchableOpacity
                style={styles.createEventButton}
                onPress={() => navigation.navigate('CreateEvent')}
              >
                <Text style={styles.createEventText}>+ Create Event</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quickStats.activeRides}</Text>
              <Text style={styles.statLabel}>Active Rides</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quickStats.activeDDs}</Text>
              <Text style={styles.statLabel}>Active DDs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quickStats.completedRides}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitleLarge}>Management</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('EventManagement')}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionTitle}>Events</Text>
            <Text style={styles.actionSubtitle}>Manage events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('DDManagement')}
          >
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionTitle}>DDs</Text>
            <Text style={styles.actionSubtitle}>Manage drivers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MemberManagement')}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTitle}>Members</Text>
            <Text style={styles.actionSubtitle}>View members</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('RideHistory')}
          >
            <Text style={styles.actionIcon}>📜</Text>
            <Text style={styles.actionTitle}>History</Text>
            <Text style={styles.actionSubtitle}>Ride history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('JoinRequests')}
          >
            <Text style={styles.actionIcon}>📥</Text>
            <Text style={styles.actionTitle}>Requests</Text>
            <Text style={styles.actionSubtitle}>Join requests</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts Summary */}
        <Card style={styles.alertsCard}>
          <View style={styles.alertsHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.noAlertsContainer}>
            <Text style={styles.noAlertsText}>No new alerts</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.caption,
    color: colors.gray[500],
  },
  userName: {
    ...typography.h2,
    color: colors.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  eventCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventName: {
    ...typography.h2,
    color: colors.white,
  },
  eventTime: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
  },
  noEventText: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  createEventButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  createEventText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  sectionTitleLarge: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h1,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.gray[500],
  },
  alertsCard: {
    padding: spacing.lg,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    ...typography.caption,
    color: colors.primary,
  },
  noAlertsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  noAlertsText: {
    ...typography.body,
    color: colors.gray[400],
  },
});

export default AdminDashboardScreen;
