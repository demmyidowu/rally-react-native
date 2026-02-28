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
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DDScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveEvent } from '../../store/slices/eventsSlice';
import {
  selectMyAssignment,
  fetchMyActiveEventAssignment,
  toggleDDActive,
  selectLoading,
} from '../../store/slices/ddAssignmentsSlice';
import {
  selectActiveRides,
  fetchActiveRides,
  selectQueue,
  markEnRoute,
  markArrived,
  completeRide,
} from '../../store/slices/ridesSlice';
import { completeRideForDD } from '../../store/slices/ddAssignmentsSlice';
import { Card, RideCard, StatusBadge, CarInfoModal, CarInfo, ActionCard, SectionHeader, StatusIndicator } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { hasCompleteCarInfo, formatCarDescription } from '../../models/User';

type Props = DDScreenProps<'DDDashboard'>;

const DDDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const myAssignment = useAppSelector(selectMyAssignment);
  const allActiveRides = useAppSelector(selectActiveRides);
  const rideQueue = useAppSelector(selectQueue); // Pending rides waiting for assignment
  const loading = useAppSelector(selectLoading);

  // Filter rides to those assigned to this DD
  const assignedRideIds = myAssignment?.currentRides ?? [];
  const assignedRides = allActiveRides.filter(r => assignedRideIds.includes(r.id));

  const [isActive, setIsActive] = useState(myAssignment?.isActive ?? false);
  const [showCarModal, setShowCarModal] = useState(false);

  useEffect(() => {
    // Fetch active event and DD's assignment in one call
    if (user?.id) {
      console.log('[DDDashboard] Fetching assignment for user:', {
        id: user.id,
        name: user.name,
        chapterId: user.chapterId,
      });
      dispatch(fetchMyActiveEventAssignment({ ddId: user.id, chapterId: user.chapterId }));
      // Also fetch all active rides so DDs can see the queue
      dispatch(fetchActiveRides());
    }
  }, [dispatch, user?.id, user?.chapterId]);

  useEffect(() => {
    console.log('[DDDashboard] myAssignment updated:', myAssignment ? {
      id: myAssignment.id,
      ddId: myAssignment.ddId,
      isActive: myAssignment.isActive,
      eventId: myAssignment.eventId,
    } : null);
    console.log('[DDDashboard] activeEvent:', activeEvent ? {
      id: activeEvent.id,
      name: activeEvent.name,
      status: activeEvent.status,
    } : null);
    setIsActive(myAssignment?.isActive ?? false);
  }, [myAssignment?.isActive, myAssignment, activeEvent]);

  const handleRefresh = () => {
    if (user?.id) {
      console.log('[DDDashboard] Refreshing - user.id:', user.id);
      dispatch(fetchMyActiveEventAssignment({ ddId: user.id, chapterId: user.chapterId }));
      dispatch(fetchActiveRides());
    }
  };

  const handleToggleActive = (value: boolean) => {
    console.log('[DDDashboard] handleToggleActive called with value:', value);
    console.log('[DDDashboard] myAssignment:', myAssignment);
    console.log('[DDDashboard] activeEvent:', activeEvent);

    if (!myAssignment) {
      if (!activeEvent) {
        console.log('[DDDashboard] No active event - showing "No Active Event" alert');
        Alert.alert('No Active Event', 'There is no active event right now. Please wait for an admin to activate an event.');
      } else {
        console.log('[DDDashboard] Has active event but no assignment - showing "Not Assigned" alert');
        Alert.alert('Not Assigned', 'You are not assigned to the current event. Please ask an admin to assign you.');
      }
      return;
    }

    if (value) {
      // Going active - check if user already has car info saved
      if (user && hasCompleteCarInfo(user)) {
        // Use saved car info directly, skip modal
        console.log('[DDDashboard] Using saved car info:', formatCarDescription(user));
        confirmToggle(true, {
          color: user.carColor!,
          make: user.carMake!,
          model: user.carModel!,
        });
      } else {
        // No saved car info - show modal to collect it
        setShowCarModal(true);
      }
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

  // Get current ride (DD can only have 1 at a time)
  const currentRide = assignedRides?.find(
    (r) => r.status === 'assigned' || r.status === 'enroute' || r.status === 'arrived'
  );

  // Handle marking ride as "on the way"
  const handleMarkEnRoute = async () => {
    if (!currentRide) return;
    try {
      await dispatch(markEnRoute(currentRide.id)).unwrap();
      Alert.alert('On the Way!', 'The rider has been notified you are on your way.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update ride status');
    }
  };

  // Handle marking DD arrived at pickup
  const handleMarkArrived = async () => {
    if (!currentRide) return;
    try {
      await dispatch(markArrived(currentRide.id)).unwrap();
      Alert.alert('Arrived!', 'The rider has been notified you have arrived.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update ride status');
    }
  };

  // Handle completing the ride
  const handleCompleteRide = async () => {
    if (!currentRide || !myAssignment) return;

    Alert.alert(
      'Complete Ride',
      'Are you sure you want to mark this ride as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await dispatch(completeRide(currentRide.id)).unwrap();
              await dispatch(completeRideForDD({
                assignmentId: myAssignment.id,
                rideId: currentRide.id,
              })).unwrap();
              Alert.alert('Success', 'Ride completed!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete ride');
            }
          },
        },
      ]
    );
  };

  // Handle opening directions to pickup location
  const handleGetDirections = () => {
    if (!currentRide?.pickupAddress && !currentRide?.pickupLocation) return;

    const lat = currentRide.pickupLocation?.latitude;
    const lng = currentRide.pickupLocation?.longitude;
    const address = currentRide.pickupAddress;

    // Build URLs for different map apps
    const encodedAddress = address ? encodeURIComponent(address) : '';
    const googleMapsUrl = lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    const appleMapsUrl = lat && lng
      ? `http://maps.apple.com/?daddr=${lat},${lng}`
      : `http://maps.apple.com/?daddr=${encodedAddress}`;
    const wazeUrl = lat && lng
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Apple Maps', 'Google Maps', 'Waze'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) Linking.openURL(appleMapsUrl);
          else if (buttonIndex === 2) Linking.openURL(googleMapsUrl);
          else if (buttonIndex === 3) Linking.openURL(wazeUrl);
        }
      );
    } else {
      // Android - use Alert as action sheet
      Alert.alert(
        'Get Directions',
        'Open directions in:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Google Maps', onPress: () => Linking.openURL(googleMapsUrl) },
          { text: 'Waze', onPress: () => Linking.openURL(wazeUrl) },
        ]
      );
    }
  };

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
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
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
          <View style={[styles.statusIndicator, isActive ? styles.statusActiveStyle : styles.statusInactive]}>
            <StatusIndicator
              status={isActive ? 'active' : 'inactive'}
              size="medium"
              showPulse={isActive}
            />
          </View>
        </Card>

        {/* Current Ride */}
        {currentRide && (
          <Card style={styles.currentRideCard}>
            <View style={styles.currentRideHeader}>
              <SectionHeader title="Current Ride" icon="car-outline" />
              <StatusBadge status={currentRide.status} />
            </View>
            <RideCard
              ride={currentRide}
              variant="dd"
              showActions
              onMarkEnRoute={handleMarkEnRoute}
              onMarkArrived={handleMarkArrived}
              onComplete={handleCompleteRide}
              onGetDirections={handleGetDirections}
            />
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionCard
            icon="settings-outline"
            title="Car Settings"
            subtitle="Update car info"
            onPress={() => navigation.navigate('CarSettings')}
            style={{ flex: 1 }}
          />
          <ActionCard
            icon="person-outline"
            title="Profile"
            subtitle="View & edit"
            onPress={() => navigation.navigate('Profile')}
            style={{ flex: 1 }}
          />
        </View>

        {/* Ride Queue - Pending rides waiting for a DD */}
        {rideQueue.length > 0 && (
          <Card style={styles.queueCard} accentColor={colors.warning}>
            <View style={styles.queueHeader}>
              <SectionHeader title="Ride Queue" icon="alert-circle-outline" iconColor={colors.warning} />
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{rideQueue.length}</Text>
              </View>
            </View>
            <Text style={styles.queueSubtitle}>
              {isActive ? 'Rides waiting to be assigned' : 'Go active to receive rides'}
            </Text>
            {rideQueue.slice(0, 3).map((ride) => (
              <RideCard
                key={ride.id}
                ride={ride}
                riderName={ride.riderName}
                variant="dd"
                style={styles.queueRideCard}
              />
            ))}
            {rideQueue.length > 3 && (
              <Text style={styles.queueMoreText}>
                +{rideQueue.length - 3} more rides in queue
              </Text>
            )}
          </Card>
        )}

        {/* Stats */}
        {myAssignment && (
          <Card style={styles.statsCard}>
            <SectionHeader title="Tonight's Stats" icon="stats-chart-outline" />
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
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.tipsTitle}>DD Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.tipIcon} />
              <Text style={styles.tipText}>Enter your car info when going active</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.tipIcon} />
              <Text style={styles.tipText}>Accept rides promptly - you're automatically en route</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.tipIcon} />
              <Text style={styles.tipText}>Complete rides to help more members</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={styles.tipIcon} />
              <Text style={styles.tipText}>Tap the pickup address to open in Maps</Text>
            </View>
          </View>
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
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActiveStyle: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.gray[100],
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
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tipsTitle: {
    ...typography.h3,
    color: colors.primary,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    ...typography.body,
    color: colors.gray[600],
  },
  queueCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  queueBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 24,
    alignItems: 'center',
  },
  queueBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  queueSubtitle: {
    ...typography.caption,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  queueRideCard: {
    marginBottom: spacing.sm,
  },
  queueMoreText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default DDDashboardScreen;
