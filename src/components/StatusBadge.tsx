/**
 * StatusBadge Component
 * Display status badges for rides and events
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';
import { RideStatus, getRideStatusDisplayName } from '../models/Ride';
import { EventStatus, getEventStatusDisplayName } from '../models/Event';

export interface StatusBadgeProps {
  status: RideStatus | EventStatus;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  const getStatusColor = (): string => {
    // Ride statuses
    if (status === RideStatus.QUEUED) return colors.warning;
    if (status === RideStatus.ASSIGNED) return colors.info;
    if (status === RideStatus.ENROUTE) return colors.secondary;
    if (status === RideStatus.COMPLETED) return colors.success;
    if (status === RideStatus.CANCELLED) return colors.gray[500];

    // Event statuses
    if (status === EventStatus.SCHEDULED) return colors.info;
    if (status === EventStatus.ACTIVE) return colors.success;
    if (status === EventStatus.COMPLETED) return colors.gray[500];
    if (status === EventStatus.CANCELLED) return colors.error;

    return colors.gray[400];
  };

  const getDisplayName = (): string => {
    // Check if it's a RideStatus
    if (Object.values(RideStatus).includes(status as RideStatus)) {
      return getRideStatusDisplayName(status as RideStatus);
    }
    // Otherwise it's an EventStatus
    return getEventStatusDisplayName(status as EventStatus);
  };

  const backgroundColor = getStatusColor();
  const displayName = getDisplayName();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor + '15' },
        size === 'small' && styles.containerSmall,
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor },
          size === 'small' && styles.dotSmall,
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: backgroundColor },
          size === 'small' && styles.textSmall,
        ]}
      >
        {displayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  containerSmall: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs / 2,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
  textSmall: {
    ...typography.small,
    fontWeight: '600',
  },
});
