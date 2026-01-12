/**
 * Card Component
 * Card container for ride cards, DD cards, event cards
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from './theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevation?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  elevation = 'md',
  style,
}) => {
  const containerStyle: ViewStyle[] = [
    styles.container,
    shadows[elevation],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
