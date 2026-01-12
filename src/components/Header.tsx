/**
 * Header Component
 * Custom header with title, back button, and action buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from './theme';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: HeaderAction[];
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightActions,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBack && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.rightActions}>
          {rightActions?.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.actionButton}
              accessibilityLabel={action.accessibilityLabel}
              accessibilityRole="button"
            >
              <Ionicons name={action.icon} size={24} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {!rightActions && <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.md,
    paddingBottom: spacing.sm,
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.black,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
    marginLeft: spacing.sm,
  },
  placeholder: {
    width: 40,
  },
});
