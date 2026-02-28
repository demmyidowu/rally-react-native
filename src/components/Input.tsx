/**
 * Input Component
 * Text input with label, error, and validation
 * Enhanced with focus states and refined styling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardTypeOptions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, borders } from './theme';

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const getContainerStyle = () => {
    if (hasError) return styles.inputContainerError;
    if (isFocused) return styles.inputContainerFocused;
    if (!editable) return styles.inputContainerDisabled;
    return null;
  };

  const getIconColor = () => {
    if (hasError) return colors.error;
    if (isFocused) return colors.primary;
    return colors.gray[400];
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          getContainerStyle(),
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={getIconColor()}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          accessibilityLabel={label}
          accessibilityHint={placeholder}
          accessibilityState={{ disabled: !editable }}
        />
      </View>
      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={colors.error}
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  labelFocused: {
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: borders.thin,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: borders.medium,
    backgroundColor: colors.surfaceLight,
  },
  inputContainerError: {
    borderColor: colors.error,
    borderWidth: borders.medium,
    backgroundColor: colors.errorLight,
  },
  inputContainerDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.black,
    paddingVertical: spacing.sm,
  },
  inputWithIcon: {
    paddingLeft: spacing.xs,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  icon: {
    marginRight: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  errorIcon: {
    marginRight: spacing.xs,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
  },
});
