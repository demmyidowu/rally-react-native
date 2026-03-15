/**
 * Alerts Screen
 *
 * Full-screen list of all admin alerts for the chapter with filtering and mark as read functionality.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { AdminAlert, AlertType, getAlertTypeDisplayName } from '../../models/AdminAlert';
import { fetchAdminAlerts, markAlertAsRead } from '../../services';
import { colors, spacing, typography, borderRadius, shadows, borders } from '../../components/theme';
import { applyAbusePenalty } from '../../services/abuseService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'Alerts'>;

type FilterType = 'all' | 'unread' | 'emergency' | 'dd_activity';

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
 * Format timestamp for display
 * Accepts ISO string (from converted timestamps), Date, or Firestore Timestamp
 */
const formatTimestamp = (timestamp: string | Date | { toDate?: () => Date }): string => {
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
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const AlertsScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const user = useAppSelector(selectUser);

  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  /**
   * Load all alerts for the chapter
   */
  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (!user?.chapterId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const allAlerts = await fetchAdminAlerts(user.chapterId, false);
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.chapterId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  /**
   * Handle marking an alert as read
   */
  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  /**
   * Handle marking an emergency alert as abuse and applying a 7-day priority penalty
   */
  const handleMarkAsAbuse = async (alert: AdminAlert) => {
    if (!alert.rideId || !alert.chapterId) return;

    Alert.alert(
      'Apply Abuse Penalty?',
      "This will reduce the rider's ride priority for 7 days. Are you sure?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Penalty',
          style: 'destructive',
          onPress: async () => {
            try {
              let riderId = alert.riderId;
              if (!riderId && alert.rideId) {
                const rideSnap = await getDoc(doc(db, 'rides', alert.rideId));
                riderId = rideSnap.data()?.riderId;
              }
              if (!riderId) {
                Alert.alert('Error', 'Cannot identify rider for this alert.');
                return;
              }
              await applyAbusePenalty(riderId, alert.rideId!, alert.chapterId, false);
              await markAlertAsRead(alert.id);
              setAlerts((prev) =>
                prev.map((a) =>
                  a.id === alert.id ? { ...a, abusePenaltyApplied: true, isRead: true } : a
                )
              );
              Alert.alert('Penalty Applied', "The rider's ride priority has been reduced for 7 days.");
            } catch (error) {
              console.error('Failed to apply abuse penalty:', error);
              Alert.alert('Error', 'Failed to apply penalty. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Filter alerts based on selected filter
   */
  const filteredAlerts = alerts.filter((alert) => {
    switch (filter) {
      case 'unread':
        return !alert.isRead;
      case 'emergency':
        return alert.type === AlertType.EMERGENCY_RIDE;
      case 'dd_activity':
        return alert.type === AlertType.DD_INACTIVE;
      default:
        return true;
    }
  });

  /**
   * Render filter tab
   */
  const renderFilterTab = (tabFilter: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterTab, filter === tabFilter && styles.filterTabActive]}
      onPress={() => setFilter(tabFilter)}
    >
      <Text
        style={[
          styles.filterTabText,
          filter === tabFilter && styles.filterTabTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Render individual alert item
   */
  const renderAlertItem = ({ item }: { item: AdminAlert }) => {
    const iconColor = getAlertIconColor(item.type);

    return (
      <TouchableOpacity
        style={[styles.alertItem, !item.isRead && styles.alertItemUnread]}
        onPress={() => !item.isRead && handleMarkAsRead(item.id)}
        activeOpacity={item.isRead ? 1 : 0.7}
      >
        <View style={[styles.alertIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons
            name={getAlertIcon(item.type)}
            size={24}
            color={iconColor}
          />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertType}>{getAlertTypeDisplayName(item.type)}</Text>
            <Text style={styles.alertTime}>{formatTimestamp(item.createdAt)}</Text>
          </View>
          <Text
            style={[styles.alertMessage, !item.isRead && styles.alertMessageUnread]}
            numberOfLines={3}
          >
            {item.message}
          </Text>
          {!item.isRead && (
            <Text style={styles.tapToRead}>Tap to mark as read</Text>
          )}
          {item.type === AlertType.EMERGENCY_RIDE && item.rideId && !item.abusePenaltyApplied && (
            <TouchableOpacity
              style={styles.abuseButton}
              onPress={() => handleMarkAsAbuse(item)}
            >
              <Ionicons name="flag" size={14} color={colors.error} />
              <Text style={styles.abuseButtonText}>Mark as Emergency Abuse</Text>
            </TouchableOpacity>
          )}
          {item.type === AlertType.EMERGENCY_RIDE && item.abusePenaltyApplied && (
            <Text style={styles.penaltyAppliedLabel}>⚑ Penalty already applied</Text>
          )}
        </View>
        {!item.isRead && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.success}15` }]}>
        <Ionicons
          name={filter === 'unread' ? 'checkmark-circle-outline' : 'mail-open-outline'}
          size={48}
          color={filter === 'unread' ? colors.success : colors.gray[400]}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? 'All caught up!' : 'No alerts'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'unread'
          ? "You've read all your alerts"
          : 'No alerts matching this filter'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterTab('all', 'All')}
        {renderFilterTab('unread', 'Unread')}
        {renderFilterTab('emergency', 'Emergency')}
        {renderFilterTab('dd_activity', 'DD Activity')}
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={[
          styles.listContent,
          filteredAlerts.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAlerts(true)}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Unread count badge */}
      {filter === 'all' && alerts.filter((a) => !a.isRead).length > 0 && (
        <View style={styles.unreadBadge}>
          <Ionicons name="notifications" size={16} color={colors.white} style={{ marginRight: spacing.xs }} />
          <Text style={styles.unreadBadgeText}>
            {alerts.filter((a) => !a.isRead).length} unread
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: borders.thin,
    borderBottomColor: colors.gray[100],
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.caption,
    color: colors.gray[600],
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: borders.thin,
    borderColor: colors.gray[100],
    ...shadows.sm,
  },
  alertItemUnread: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertType: {
    ...typography.caption,
    color: colors.gray[500],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  alertTime: {
    ...typography.caption,
    color: colors.gray[400],
  },
  alertMessage: {
    ...typography.body,
    color: colors.gray[700],
    lineHeight: 20,
  },
  alertMessageUnread: {
    color: colors.gray[800],
    fontWeight: '500',
  },
  tapToRead: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.lg,
  },
  unreadBadgeText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  abuseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.error}12`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  abuseButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  penaltyAppliedLabel: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default AlertsScreen;
