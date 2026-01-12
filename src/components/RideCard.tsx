/**
 * RideCard Component
 * Display ride information with status, location, DD info
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { colors, spacing, typography } from './theme';
import { Ride, getRideStatusDisplayName } from '../models/Ride';

export interface RideCardProps {
  ride: Ride;
  onPress?: () => void;
  showDD?: boolean;
  showPriority?: boolean;
  riderName?: string;
  ddName?: string;
}

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  onPress,
  showDD = false,
  showPriority = false,
  riderName,
  ddName,
}) => {
  const formatTimestamp = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
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
});
