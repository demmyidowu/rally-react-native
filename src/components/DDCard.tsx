/**
 * DDCard Component
 * Display DD information with activity status and ride count
 */

import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { colors, spacing, typography } from './theme';
import { DDAssignment } from '../models/DDAssignment';
import { User } from '../models/User';

export interface DDCardProps {
  ddAssignment: DDAssignment;
  user: User;
  activeRidesCount: number;
  onToggleActive?: () => void;
  showToggle?: boolean;
  onPress?: () => void;
}

export const DDCard: React.FC<DDCardProps> = ({
  ddAssignment,
  user,
  activeRidesCount,
  onToggleActive,
  showToggle = true,
  onPress,
}) => {
  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Avatar
          uri={ddAssignment.photoURL}
          name={user.name}
          size={56}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user.name}</Text>
          {ddAssignment.carDescription && (
            <View style={styles.carInfo}>
              <Ionicons name="car" size={16} color={colors.gray[600]} />
              <Text style={styles.carText}>{ddAssignment.carDescription}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="list" size={20} color={colors.primary} />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{activeRidesCount}</Text>
            <Text style={styles.statLabel}>Active Rides</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{ddAssignment.totalRides}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons
              name={ddAssignment.isActive ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={ddAssignment.isActive ? colors.success : colors.gray[400]}
            />
          </View>
          <View style={styles.statTextContainer}>
            <Text
              style={[
                styles.statusText,
                ddAssignment.isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              {ddAssignment.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {showToggle && onToggleActive && (
        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.gray[500]}
            />
            <Text style={styles.toggleLabel}>
              {ddAssignment.isActive ? 'Accepting Rides' : 'Not Accepting Rides'}
            </Text>
          </View>
          <Switch
            value={ddAssignment.isActive}
            onValueChange={onToggleActive}
            trackColor={{
              false: colors.gray[300],
              true: colors.primary + '40',
            }}
            thumbColor={ddAssignment.isActive ? colors.primary : colors.gray[500]}
            ios_backgroundColor={colors.gray[300]}
            accessibilityLabel="Toggle DD active status"
          />
        </View>
      )}

      {(ddAssignment.inactiveToggles ?? 0) > 5 && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={styles.warningText}>
            Toggled inactive {ddAssignment.inactiveToggles} times
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    ...typography.h3,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  carText: {
    ...typography.caption,
    color: colors.gray[600],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: spacing.xs,
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.black,
  },
  statLabel: {
    ...typography.small,
    color: colors.gray[600],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statusActive: {
    color: colors.success,
  },
  statusInactive: {
    color: colors.gray[500],
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[300],
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.gray[700],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderRadius: 4,
  },
  warningText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: '600',
  },
});
