/**
 * QueuePosition Component
 * Display queue position with animated progress indicator
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from './theme';

export interface QueuePositionProps {
  position: number;
  totalInQueue: number;
  estimatedWaitTime?: number;
}

export const QueuePosition: React.FC<QueuePositionProps> = ({
  position,
  totalInQueue,
  estimatedWaitTime,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progress = totalInQueue > 0 ? (totalInQueue - position) / totalInQueue : 0;
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [position, totalInQueue]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getPositionColor = (): string => {
    if (position === 1) return colors.success;
    if (position <= 3) return colors.info;
    if (position <= 5) return colors.warning;
    return colors.gray[500];
  };

  const positionColor = getPositionColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.positionContainer}>
          <View
            style={[
              styles.positionBadge,
              { backgroundColor: positionColor + '15' },
            ]}
          >
            <Ionicons name="list" size={24} color={positionColor} />
            <Text style={[styles.positionNumber, { color: positionColor }]}>
              #{position}
            </Text>
          </View>
          <View style={styles.positionInfo}>
            <Text style={styles.positionLabel}>Position in Queue</Text>
            <Text style={styles.totalInQueue}>
              {totalInQueue} {totalInQueue === 1 ? 'ride' : 'rides'} in queue
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: positionColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(((totalInQueue - position) / totalInQueue) * 100)}% Complete
        </Text>
      </View>

      {estimatedWaitTime !== undefined && (
        <View style={styles.waitTimeContainer}>
          <Ionicons name="time" size={20} color={colors.info} />
          <View style={styles.waitTimeInfo}>
            <Text style={styles.waitTimeLabel}>Estimated Wait</Text>
            <Text style={styles.waitTimeValue}>
              {formatWaitTime(estimatedWaitTime)}
            </Text>
          </View>
        </View>
      )}

      {position === 1 && (
        <View style={styles.nextUpBanner}>
          <Ionicons name="flash" size={20} color={colors.white} />
          <Text style={styles.nextUpText}>You're next!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  positionNumber: {
    ...typography.h2,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  positionInfo: {
    flex: 1,
  },
  positionLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  totalInQueue: {
    ...typography.caption,
    color: colors.gray[600],
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    ...typography.small,
    color: colors.gray[600],
    textAlign: 'right',
  },
  waitTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.md,
  },
  waitTimeInfo: {
    marginLeft: spacing.md,
  },
  waitTimeLabel: {
    ...typography.caption,
    color: colors.gray[600],
    marginBottom: spacing.xs / 2,
  },
  waitTimeValue: {
    ...typography.h3,
    color: colors.info,
    fontWeight: '600',
  },
  nextUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  nextUpText: {
    ...typography.body,
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});
