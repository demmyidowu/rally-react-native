/**
 * Card Component
 * Card container for ride cards, DD cards, event cards
 * Enhanced with variants, press animations, and accent colors
 */

import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Pressable } from 'react-native';
import { colors, spacing, borderRadius, shadows, animations, borders } from './theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevation?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'outlined';
  accentColor?: string;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  elevation = 'sm',
  variant = 'default',
  accentColor,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.timing(scaleAnim, {
        toValue: animations.cardPress.scale,
        duration: animations.cardPress.duration,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: animations.cardPress.duration,
        useNativeDriver: true,
      }).start();
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...shadows.lg,
        };
      case 'outlined':
        return {
          borderWidth: borders.thin,
          borderColor: colors.gray[200],
          shadowOpacity: 0,
          elevation: 0,
        };
      default:
        return {
          borderWidth: borders.thin,
          borderColor: colors.gray[100],
          ...shadows[elevation],
        };
    }
  };

  const containerStyle: ViewStyle[] = [
    styles.container,
    getVariantStyles(),
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={containerStyle}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
        >
          {children}
        </Pressable>
      </Animated.View>
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
