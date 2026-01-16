/**
 * EmergencyButton Component
 * Big red emergency button with confirmation modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing, typography, borderRadius, shadows } from './theme';

export interface EmergencyButtonProps {
  onEmergency: () => void;
  disabled?: boolean;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onEmergency,
  disabled = false,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePress = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    onEmergency();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Emergency button"
        accessibilityHint="Request emergency ride with highest priority"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={48} color={colors.white} />
        </View>
        <Text style={styles.buttonText}>EMERGENCY</Text>
        <Text style={styles.buttonSubtext}>Tap for immediate priority</Text>
      </TouchableOpacity>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={56} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Emergency Ride Request</Text>
            <Text style={styles.modalMessage}>
              This will send an emergency alert to all admins and give your ride
              the highest priority in the queue.
            </Text>
            <Text style={styles.modalWarning}>
              Only use this feature for genuine emergencies.
            </Text>
            <View style={styles.modalActions}>
              <Button
                title="Confirm Emergency"
                onPress={handleConfirm}
                variant="danger"
                fullWidth
              />
              <View style={styles.buttonSpacer} />
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="secondary"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    ...shadows.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
    opacity: 0.6,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  buttonText: {
    ...typography.h1,
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  buttonSubtext: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalMessage: {
    ...typography.body,
    color: colors.gray[700],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalWarning: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'column',
  },
  buttonSpacer: {
    height: spacing.md,
  },
});
