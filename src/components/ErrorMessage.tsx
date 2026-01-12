/**
 * ErrorMessage Component
 * Display error messages with retry button and optional dismiss
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing, typography, borderRadius } from './theme';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  dismissable?: boolean;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  dismissable = false,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={24} color={colors.error} />
          </View>
          {dismissable && onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.dismissButton}
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            icon="refresh"
            variant="primary"
            fullWidth
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    backgroundColor: colors.error + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.full,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
});
