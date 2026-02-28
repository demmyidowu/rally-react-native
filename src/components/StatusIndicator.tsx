/**
 * StatusIndicator Component
 * Visual status indicators with animated dot
 * Replaces emoji status circles (green/red dots)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, spacing, typography } from './theme';

export type StatusType = 'active' | 'inactive' | 'pending' | 'error';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showPulse?: boolean;
  style?: ViewStyle;
}

const getStatusColor = (status: StatusType): string => {
  switch (status) {
    case 'active':
      return colors.success;
    case 'inactive':
      return colors.gray[400];
    case 'pending':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return colors.gray[400];
  }
};

const getStatusLabel = (status: StatusType): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'pending':
      return 'Pending';
    case 'error':
      return 'Error';
    default:
      return status;
  }
};

const getDotSize = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small':
      return 8;
    case 'large':
      return 16;
    case 'medium':
    default:
      return 12;
  }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'medium',
  showPulse = true,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showPulse && status === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    return undefined;
  }, [showPulse, status, pulseAnim, opacityAnim]);

  const dotSize = getDotSize(size);
  const statusColor = getStatusColor(status);
  const displayLabel = label || getStatusLabel(status);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dotContainer}>
        {showPulse && status === 'active' && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: statusColor,
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
              },
            ]}
          />
        )}
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.label,
          { color: statusColor },
          size === 'small' && styles.labelSmall,
          size === 'large' && styles.labelLarge,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pulseRing: {
    position: 'absolute',
  },
  dot: {},
  label: {
    ...typography.body,
    fontWeight: '600',
  },
  labelSmall: {
    ...typography.caption,
  },
  labelLarge: {
    ...typography.h3,
  },
});
