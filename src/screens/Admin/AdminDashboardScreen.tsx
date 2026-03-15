/**
 * Admin Dashboard Screen
 *
 * Main admin dashboard with event overview, stats, and quick actions.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent, fetchActiveEvent, selectLoading as selectEventsLoading } from '../../store/slices/eventsSlice';
import { selectActiveRides, fetchActiveRides } from '../../store/slices/ridesSlice';
import { fetchDDAssignments, selectStats } from '../../store/slices/ddAssignmentsSlice';
import { Card, StatusBadge, ActionCard, SectionHeader } from '../../components';
import { colors, spacing, typography, borderRadius, borders } from '../../components/theme';
import { AdminAlert, AlertType } from '../../models/AdminAlert';
import { observeAdminAlerts } from '../../services';

type Props = AdminScreenProps<'AdminDashboard'>;

/**
 * Get icon for alert type
 */
const getAlertIcon = (type: AlertType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case AlertType.EMERGENCY_RIDE:
      return 'alert-circle';
    case AlertType.DD_INACTIVE:
      return 'warning-outline';
    case AlertType.SYSTEM_ERROR:
      return 'close-circle-outline';
    default:
      return 'notifications-outline';
  }
};

/**
 * Get color for alert type
 */
const getAlertIconColor = (type: AlertType): string => {
  switch (type) {
    case AlertType.EMERGENCY_RIDE:
      return colors.error;
    case AlertType.DD_INACTIVE:
      return colors.warning;
    case AlertType.SYSTEM_ERROR:
      return colors.error;
    default:
      return colors.primary;
  }
};

/**
 * Format time ago for display
 * Accepts ISO string (from converted timestamps), Date, or Firestore Timestamp
 */
const formatTimeAgo = (timestamp: string | Date | { toDate?: () => Date }): string => {
  let date: Date;
  if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = timestamp?.toDate?.() || new Date();
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
};

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const loading = useAppSelector(selectEventsLoading);
  const activeRides = useAppSelector(selectActiveRides);
  const ddStats = useAppSelector(selectStats);

  // Alert state
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    if (!user?.chapterId) return;
    dispatch(fetchActiveEvent(user.chapterId));
    dispatch(fetchActiveRides());

    const unsubscribe = observeAdminAlerts(user.chapterId, (newAlerts) => {
      setAlerts(newAlerts.slice(0, 5));
      setLoadingAlerts(false);
    });

    return () => unsubscribe();
  }, [dispatch, user?.chapterId]);

  useEffect(() => {
    if (activeEvent?.id) {
      dispatch(fetchDDAssignments(activeEvent.id));
    }
  }, [dispatch, activeEvent?.id]);

  const handleRefresh = () => {
    if (user?.chapterId) {
      dispatch(fetchActiveEvent(user.chapterId));
      dispatch(fetchActiveRides());
      // alerts are live — no manual reload needed
    }
    if (activeEvent?.id) {
      dispatch(fetchDDAssignments(activeEvent.id));
    }
  };

  const quickStats = {
    activeRides: activeRides.filter(r => r.eventId === activeEvent?.id).length,
    activeDDs: (activeEvent?.assignedDDs?.length) || 0,
    completedRides: ddStats.reduce((sum, s) => sum + s.totalRides, 0),
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
        <Card style={styles.eventCard} variant="elevated">
          {activeEvent ? (
            <>
              <View style={styles.eventHeader}>
                <Text style={styles.eventName}>{activeEvent.name || 'Active Event'}</Text>
                <StatusBadge status={activeEvent.status} />
              </View>
              <Text style={styles.eventTime}>
                Started at {new Date(activeEvent.startTime || Date.now()).toLocaleTimeString()}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.noEventText}>No Active Event</Text>
              <TouchableOpacity
                style={styles.createEventButton}
                onPress={() => navigation.navigate('CreateEvent')}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.white} style={{ marginRight: spacing.xs }} />
                <Text style={styles.createEventText}>Create Event</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <SectionHeader title="Quick Stats" icon="stats-chart-outline" />
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
        <SectionHeader title="Management" icon="grid-outline" style={{ marginTop: spacing.sm }} />
        <View style={styles.actionsGrid}>
          <ActionCard
            icon="calendar-outline"
            title="Events"
            subtitle="Manage events"
            onPress={() => navigation.navigate('EventManagement')}
            style={styles.actionCardItem}
          />
          <ActionCard
            icon="car-outline"
            title="DDs"
            subtitle="Manage drivers"
            onPress={() => navigation.navigate('DDManagement')}
            style={styles.actionCardItem}
          />
          <ActionCard
            icon="people-outline"
            title="Members"
            subtitle="View members"
            onPress={() => navigation.navigate('MemberManagement')}
            style={styles.actionCardItem}
          />
          <ActionCard
            icon="document-text-outline"
            title="History"
            subtitle="Ride history"
            onPress={() => navigation.navigate('RideHistory')}
            style={styles.actionCardItem}
          />
          <ActionCard
            icon="download-outline"
            title="Requests"
            subtitle="Join requests"
            onPress={() => navigation.navigate('JoinRequests')}
            style={styles.actionCardItem}
          />
        </View>

        {/* Alerts Summary */}
        <Card style={styles.alertsCard}>
          <SectionHeader
            title="Recent Alerts"
            icon="notifications-outline"
            action={{ label: 'View All', onPress: () => navigation.navigate('Alerts') }}
          />
          {loadingAlerts ? (
            <View style={styles.noAlertsContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : alerts.length > 0 ? (
            <View style={styles.alertsList}>
              {alerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={[
                    styles.alertItem,
                    !alert.isRead && styles.alertItemUnread,
                  ]}
                  onPress={() => navigation.navigate('Alerts')}
                >
                  <View style={[styles.alertIconContainer, { backgroundColor: `${getAlertIconColor(alert.type)}15` }]}>
                    <Ionicons
                      name={getAlertIcon(alert.type)}
                      size={20}
                      color={getAlertIconColor(alert.type)}
                    />
                  </View>
                  <View style={styles.alertContent}>
                    <Text
                      style={[
                        styles.alertMessage,
                        !alert.isRead && styles.alertMessageUnread,
                      ]}
                      numberOfLines={2}
                    >
                      {alert.message}
                    </Text>
                    <Text style={styles.alertTime}>
                      {formatTimeAgo(alert.createdAt)}
                    </Text>
                  </View>
                  {!alert.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noAlertsContainer}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.gray[300]} />
              <Text style={styles.noAlertsText}>No new alerts</Text>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
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
  actionCardItem: {
    width: '47%',
  },
  alertsCard: {
    padding: spacing.lg,
  },
  noAlertsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noAlertsText: {
    ...typography.body,
    color: colors.gray[400],
  },
  alertsList: {
    gap: spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: borders.thin,
    borderColor: colors.gray[100],
  },
  alertItemUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    ...typography.body,
    color: colors.gray[700],
  },
  alertMessageUnread: {
    fontWeight: '600',
    color: colors.gray[800],
  },
  alertTime: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default AdminDashboardScreen;
