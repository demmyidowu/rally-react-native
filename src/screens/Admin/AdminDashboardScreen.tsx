/**
 * Admin Dashboard Screen
 *
 * Main admin dashboard with event overview, stats, and quick actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent, fetchActiveEvent, selectLoading as selectEventsLoading } from '../../store/slices/eventsSlice';
import { Card, StatusBadge } from '../../components';
import { colors, spacing, typography, borderRadius, shadows } from '../../components/theme';
import { AdminAlert, AlertType } from '../../models/AdminAlert';
import { fetchAdminAlerts } from '../../services';

type Props = AdminScreenProps<'AdminDashboard'>;

/**
 * Get icon for alert type
 */
const getAlertIcon = (type: AlertType): string => {
  switch (type) {
    case AlertType.EMERGENCY_RIDE:
      return '🚨';
    case AlertType.DD_INACTIVE_TOGGLE:
      return '⚠️';
    case AlertType.DD_PROLONGED_INACTIVE:
      return '⏰';
    case AlertType.SYSTEM_ERROR:
      return '❌';
    default:
      return '📢';
  }
};

/**
 * Format time ago for display
 */
const formatTimeAgo = (timestamp: { toDate?: () => Date } | Date): string => {
  const date = timestamp instanceof Date ? timestamp : timestamp?.toDate?.() || new Date();
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

  // Alert state
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  /**
   * Load recent alerts for the chapter
   */
  const loadAlerts = useCallback(async () => {
    if (!user?.chapterId) return;

    try {
      setLoadingAlerts(true);
      const recentAlerts = await fetchAdminAlerts(user.chapterId, false);
      setAlerts(recentAlerts.slice(0, 5)); // Show 5 most recent
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  }, [user?.chapterId]);

  useEffect(() => {
    if (user?.chapterId) {
      dispatch(fetchActiveEvent(user.chapterId));
      loadAlerts();
    }
  }, [dispatch, user?.chapterId, loadAlerts]);

  const handleRefresh = () => {
    if (user?.chapterId) {
      dispatch(fetchActiveEvent(user.chapterId));
      loadAlerts();
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
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
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
                  <Text style={styles.alertIcon}>{getAlertIcon(alert.type)}</Text>
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
  alertsList: {
    gap: spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  alertItemUnread: {
    backgroundColor: colors.primaryLight,
  },
  alertIcon: {
    fontSize: 24,
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
