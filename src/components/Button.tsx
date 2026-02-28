/**
 * Button Component
 * Primary button with multiple variants for Rally app
 * Enhanced with press animations and refined styling
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows, animations } from './theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom container style */
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}) => {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: animations.buttonPress.scale,
      duration: animations.buttonPress.duration,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animations.buttonPress.duration,
      useNativeDriver: true,
    }).start();
  };

  const getIconColor = () => {
    if (isDisabled) return colors.gray[500];
    switch (variant) {
      case 'secondary':
      case 'outline':
        return colors.primary;
      default:
        return colors.white;
    }
  };

  const containerStyle: ViewStyle[] = [
    styles.container,
    styles[variant],
    fullWidth ? styles.fullWidth : undefined,
    isDisabled ? styles.disabled : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles] as TextStyle,
    isDisabled ? styles.disabledText : undefined,
  ].filter(Boolean) as TextStyle[];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled }}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'secondary' || variant === 'outline' ? colors.primary : colors.white}
            size="small"
          />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={getIconColor()}
                style={styles.icon}
              />
            )}
            <Text style={textStyle}>{title}</Text>
            {/* Balance icon spacing for centered text when fullWidth */}
            {icon && fullWidth && <View style={styles.iconSpacer} />}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 52,
    ...shadows.sm,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.xs,
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.gray[300],
    borderColor: colors.gray[300],
    opacity: 0.6,
    ...shadows.xs,
  },
  text: {
    ...typography.body,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.primary,
  },
  outlineText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.white,
  },
  disabledText: {
    color: colors.gray[500],
  },
  icon: {
    marginRight: spacing.sm,
  },
  iconSpacer: {
    width: 20 + spacing.sm, // Match icon size + marginRight
  },
});
