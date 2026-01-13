/**
 * Toggle Status Screen (DD)
 *
 * Allows DDs to toggle their active/inactive status with warnings.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DDScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent } from '../../store/slices/eventsSlice';
import {
  selectMyAssignment,
  fetchMyDDAssignment,
  toggleDDActive,
  selectLoading,
} from '../../store/slices/ddAssignmentsSlice';
import { Header, Card, Button } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = DDScreenProps<'ToggleStatus'>;

const ToggleStatusScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const myAssignment = useAppSelector(selectMyAssignment);
  const loading = useAppSelector(selectLoading);

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (user?.id && activeEvent?.id) {
      dispatch(fetchMyDDAssignment({ eventId: activeEvent.id, ddId: user.id }));
    }
  }, [dispatch, user?.id, activeEvent?.id]);

  useEffect(() => {
    setIsActive(myAssignment?.isActive ?? false);
  }, [myAssignment?.isActive]);

  const handleToggle = async () => {
    if (!myAssignment) return;

    const newStatus = !isActive;
    const toggleCount = myAssignment.inactiveToggles || 0;

    // Warn if toggling inactive too many times
    if (!newStatus && toggleCount >= 3) {
      Alert.alert(
        'Warning',
        `You've toggled inactive ${toggleCount} times tonight. Excessive toggling may result in alerts to admins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => performToggle(newStatus),
          },
        ]
      );
    } else {
      performToggle(newStatus);
    }
  };

  const performToggle = async (newStatus: boolean) => {
    if (!myAssignment) return;

    try {
      setIsActive(newStatus);
      await dispatch(toggleDDActive({
        assignmentId: myAssignment.id,
        isActive: newStatus,
      })).unwrap();

      Alert.alert(
        'Status Updated',
        newStatus
          ? 'You are now active and can receive ride assignments.'
          : 'You are now inactive and will not receive new rides.'
      );
    } catch (error: any) {
      setIsActive(!newStatus);
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Toggle Status" showBack onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Current Status */}
        <Card style={styles.statusCard}>
          <View style={[styles.statusIndicator, isActive ? styles.activeIndicator : styles.inactiveIndicator]}>
            <Text style={styles.statusEmoji}>{isActive ? '🟢' : '🔴'}</Text>
            <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveText]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {isActive
              ? 'You are currently receiving ride assignments.'
              : 'You are not receiving ride assignments.'}
          </Text>
        </Card>

        {/* Toggle Stats */}
        {myAssignment && (
          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>Tonight's Activity</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Inactive Toggles</Text>
              <Text style={[
                styles.statValue,
                (myAssignment.inactiveToggles || 0) > 5 && styles.warningText
              ]}>
                {myAssignment.inactiveToggles || 0}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Rides Completed</Text>
              <Text style={styles.statValue}>{myAssignment.totalRides || 0}</Text>
            </View>
          </Card>
        )}

        {/* Warning */}
        {(myAssignment?.inactiveToggles || 0) >= 5 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              You've toggled inactive multiple times. Admins may be notified.
            </Text>
          </View>
        )}

        {/* Toggle Button */}
        <Button
          title={isActive ? 'Go Inactive' : 'Go Active'}
          onPress={handleToggle}
          loading={loading}
          disabled={loading}
          variant={isActive ? 'secondary' : 'primary'}
          style={styles.toggleButton}
        />

        {/* Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ About Status</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Active:</Text> You will receive ride assignments based on shortest wait time.
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Inactive:</Text> You won't receive new assignments but can complete current rides.
          </Text>
          <Text style={styles.infoText}>
            • Avoid toggling inactive frequently as it affects service quality.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statusCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  activeIndicator: {
    backgroundColor: colors.successLight,
  },
  inactiveIndicator: {
    backgroundColor: colors.gray[100],
  },
  statusEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.h2,
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.gray[500],
  },
  statusDescription: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  statLabel: {
    ...typography.body,
    color: colors.gray[500],
  },
  statValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    flex: 1,
    ...typography.body,
  },
  toggleButton: {
    marginBottom: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: colors.gray[800],
  },
});

export default ToggleStatusScreen;
