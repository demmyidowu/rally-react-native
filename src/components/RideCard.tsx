/**
 * RideCard Component
 * Display ride information with status, location, DD info
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { colors, spacing, typography } from './theme';
import { Ride } from '../models/Ride';

export interface RideCardProps {
  ride: Ride;
  onPress?: () => void;
  showDD?: boolean;
  showPriority?: boolean;
  riderName?: string;
  ddName?: string;
  /** Card visual variant */
  variant?: 'default' | 'dd' | 'admin';
  /** Show action buttons for DD */
  showActions?: boolean;
  /** Callback for marking ride en route (on the way) */
  onMarkEnRoute?: () => void;
  /** Callback for marking DD arrived at pickup */
  onMarkArrived?: () => void;
  /** Callback for completing ride */
  onComplete?: () => void;
  /** Callback for opening navigation/directions */
  onGetDirections?: () => void;
  /** Custom container style */
  style?: ViewStyle;
}

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  onPress,
  showDD = false,
  showPriority = false,
  riderName,
  ddName,
  variant: _variant = 'default',
  showActions = false,
  onMarkEnRoute,
  onMarkArrived,
  onComplete,
  onGetDirections,
  style: _style,
}) => {
  const formatTimestamp = (timestamp: Timestamp | Date | any): string => {
    if (!timestamp) return 'N/A';

    // Handle Firestore Timestamp
    let date: Date;
    if (typeof timestamp?.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      // Try to create a date from whatever we have
      date = new Date(timestamp);
    }

    // Validate the date
    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatWaitTime = (minutes: number | undefined): string => {
    if (!minutes) return 'Calculating...';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {ride.isEmergency && (
            <View style={styles.emergencyBadge}>
              <Ionicons name="alert-circle" size={16} color={colors.white} />
              <Text style={styles.emergencyText}>EMERGENCY</Text>
            </View>
          )}
          <StatusBadge status={ride.status} />
        </View>
        {showPriority && ride.queuePosition !== undefined && (
          <View style={styles.queueBadge}>
            <Text style={styles.queueText}>#{ride.queuePosition}</Text>
          </View>
        )}
      </View>

      {riderName && (
        <View style={styles.row}>
          <Ionicons name="person" size={18} color={colors.gray[600]} />
          <Text style={styles.label}>Rider:</Text>
          <Text style={styles.value}>{riderName}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Ionicons name="location" size={18} color={colors.primary} />
        <Text style={styles.label}>Pickup:</Text>
        <Text style={styles.value} numberOfLines={1}>
          {ride.pickupAddress}
        </Text>
      </View>

      {ride.dropoffAddress && (
        <View style={styles.row}>
          <Ionicons name="flag" size={18} color={colors.success} />
          <Text style={styles.label}>Dropoff:</Text>
          <Text style={styles.value} numberOfLines={1}>
            {ride.dropoffAddress}
          </Text>
        </View>
      )}

      {showDD && ddName && (
        <View style={styles.ddSection}>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="car" size={18} color={colors.secondary} />
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{ddName}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.timeInfo}>
          <Ionicons name="time" size={16} color={colors.gray[500]} />
          <Text style={styles.timeText}>
            Requested {formatTimestamp(ride.requestedAt)}
          </Text>
        </View>
        {ride.estimatedWaitTime !== undefined && (
          <View style={styles.waitTimeContainer}>
            <Ionicons name="hourglass" size={16} color={colors.info} />
            <Text style={styles.waitTimeText}>
              ETA: {formatWaitTime(ride.estimatedWaitTime)}
            </Text>
          </View>
        )}
      </View>

      {showPriority && (
        <View style={styles.priorityContainer}>
          <Text style={styles.priorityText}>
            Priority: {ride.priority.toFixed(1)}
          </Text>
        </View>
      )}

      {ride.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{ride.notes}</Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actionsContainer}>
          {/* On the Way button - when assigned */}
          {ride.status === 'assigned' && onMarkEnRoute && (
            <TouchableOpacity style={styles.actionButton} onPress={onMarkEnRoute}>
              <Ionicons name="navigate" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>On the Way</Text>
            </TouchableOpacity>
          )}
          {/* I'm Here button - when en route */}
          {ride.status === 'enroute' && onMarkArrived && (
            <TouchableOpacity style={[styles.actionButton, styles.arrivedButton]} onPress={onMarkArrived}>
              <Ionicons name="location" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>I'm Here</Text>
            </TouchableOpacity>
          )}
          {/* Complete button - when arrived at pickup */}
          {ride.status === 'arrived' && onComplete && (
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={onComplete}>
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          {/* Get Directions button - always show if handler provided */}
          {onGetDirections && (
            <TouchableOpacity style={[styles.actionButton, styles.navButton]} onPress={onGetDirections}>
              <Ionicons name="map" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Get Directions</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    gap: spacing.xs,
  },
  emergencyText: {
    ...typography.small,
    color: colors.white,
    fontWeight: 'bold',
  },
  queueBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  queueText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray[700],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.gray[600],
    fontWeight: '600',
  },
  value: {
    ...typography.body,
    color: colors.black,
    flex: 1,
  },
  ddSection: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.small,
    color: colors.gray[500],
  },
  waitTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  waitTimeText: {
    ...typography.small,
    color: colors.info,
    fontWeight: '600',
  },
  priorityContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  priorityText: {
    ...typography.caption,
    color: colors.gray[600],
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: 4,
  },
  notesLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  notesText: {
    ...typography.caption,
    color: colors.gray[600],
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  arrivedButton: {
    backgroundColor: colors.info,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  navButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
});
