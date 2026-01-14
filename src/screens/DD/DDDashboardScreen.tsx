/**
 * DD Dashboard Screen
 *
 * Main dashboard for Designated Drivers showing:
 * - Active/Inactive toggle
 * - Current assigned rides
 * - Stats and performance
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Switch,
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
import { selectActiveRides } from '../../store/slices/ridesSlice';
import { Card, RideCard, StatusBadge, CarInfoModal, CarInfo } from '../../components';
import { colors, spacing, typography, borderRadius, shadows } from '../../components/theme';

type Props = DDScreenProps<'DDDashboard'>;

const DDDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const myAssignment = useAppSelector(selectMyAssignment);
  const allActiveRides = useAppSelector(selectActiveRides);
  const loading = useAppSelector(selectLoading);

  // Filter rides to those assigned to this DD
  const assignedRideIds = myAssignment?.currentRides ?? [];
  const assignedRides = allActiveRides.filter(r => assignedRideIds.includes(r.id));

  const [isActive, setIsActive] = useState(myAssignment?.isActive ?? false);
  const [showCarModal, setShowCarModal] = useState(false);

  useEffect(() => {
    if (user?.id && activeEvent?.id) {
      dispatch(fetchMyDDAssignment({ eventId: activeEvent.id, ddId: user.id }));
    }
  }, [dispatch, user?.id, activeEvent?.id]);

  useEffect(() => {
    setIsActive(myAssignment?.isActive ?? false);
  }, [myAssignment?.isActive]);

  const handleRefresh = () => {
    if (user?.id && activeEvent?.id) {
      dispatch(fetchMyDDAssignment({ eventId: activeEvent.id, ddId: user.id }));
    }
  };

  const handleToggleActive = (value: boolean) => {
    if (!myAssignment) return;

    if (value) {
      // Going active - show car info modal
      setShowCarModal(true);
    } else {
      // Going inactive - no modal needed
      confirmToggle(false);
    }
  };

  const confirmToggle = async (value: boolean, carInfo?: CarInfo) => {
    if (!myAssignment) return;

    try {
      setIsActive(value);
      const carDescription = carInfo
        ? `${carInfo.color} ${carInfo.make} ${carInfo.model}`
        : undefined;

      await dispatch(toggleDDActive({
        assignmentId: myAssignment.id,
        isActive: value,
        carDescription,
      })).unwrap();
    } catch (error: any) {
      setIsActive(!value);
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleCarInfoConfirm = (carInfo: CarInfo) => {
    setShowCarModal(false);
    confirmToggle(true, carInfo);
  };

  const handleCarInfoCancel = () => {
    setShowCarModal(false);
    // Don't toggle - user cancelled
  };

  const handleViewRide = (rideId: string) => {
    navigation.navigate('RideDetails', { rideId });
  };

  const currentRide = assignedRides?.find(
    (r) => r.status === 'assigned' || r.status === 'enroute'
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>DD Dashboard</Text>
            <Text style={styles.userName}>{user?.name || 'Driver'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <View style={[styles.avatar, isActive && styles.avatarActive]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'D'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusTitle}>
                {isActive ? 'You are Active' : 'You are Inactive'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isActive
                  ? 'You can receive ride assignments'
                  : 'Toggle active to receive rides'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
              thumbColor={isActive ? colors.primary : colors.gray[400]}
              ios_backgroundColor={colors.gray[300]}
            />
          </View>
          <View style={[styles.statusIndicator, isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusIndicatorText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
              {isActive ? '🟢 Active' : '🔴 Inactive'}
            </Text>
          </View>
        </Card>

        {/* Current Ride */}
        {currentRide && (
          <Card style={styles.currentRideCard}>
            <View style={styles.currentRideHeader}>
              <Text style={styles.sectionTitle}>Current Ride</Text>
              <StatusBadge status={currentRide.status} />
            </View>
            <RideCard
              ride={currentRide}
              onPress={() => handleViewRide(currentRide.id)}
              variant="dd"
              showActions
              onMarkEnRoute={() => { }}
              onComplete={() => { }}
            />
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ActiveRides')}
          >
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionTitle}>Active Rides</Text>
            <Text style={styles.actionSubtitle}>
              {assignedRides?.length || 0} rides
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ToggleStatus')}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Manage status</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {myAssignment && (
          <Card style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Tonight's Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{myAssignment.totalRides || 0}</Text>
                <Text style={styles.statLabel}>Rides Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{myAssignment.currentRides?.length || 0}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{myAssignment.inactiveToggles || 0}</Text>
                <Text style={styles.statLabel}>Toggles</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 DD Tips</Text>
          <Text style={styles.tipItem}>• Enter your car info when going active</Text>
          <Text style={styles.tipItem}>• Accept rides promptly - you're automatically en route</Text>
          <Text style={styles.tipItem}>• Complete rides to help more members</Text>
          <Text style={styles.tipItem}>• Tap the pickup address to open in Maps</Text>
        </Card>
      </ScrollView>

      {/* Car Info Modal - shown when trying to go active */}
      <CarInfoModal
        visible={showCarModal}
        onConfirm={handleCarInfoConfirm}
        onCancel={handleCarInfoCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.caption,
    color: colors.gray[500],
  },
  userName: {
    ...typography.h2,
    color: colors.primary,
  },
  profileButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.gray[400],
  },
  avatarActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.success,
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.h3,
    color: colors.gray[800],
  },
  statusSubtitle: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  statusIndicator: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.gray[100],
  },
  statusIndicatorText: {
    ...typography.body,
    fontWeight: '600',
  },
  statusActiveText: {
    color: colors.success,
  },
  statusInactiveText: {
    color: colors.gray[500],
  },
  currentRideCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  currentRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.gray[500],
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h1,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  tipsCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
  },
  tipsTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  tipItem: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
});

export default DDDashboardScreen;
