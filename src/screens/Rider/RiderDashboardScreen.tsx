/**
 * Rider Dashboard Screen
 *
 * Main dashboard for riders showing:
 * - Current ride status (if any)
 * - Request ride button
 * - Recent rides
 * - Profile info
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import {
  selectMyRide,
  selectQueuePosition,
  fetchMyRide,
  cancelRide,
  upgradeRideToEmergency,
  selectLoading,
} from '../../store/slices/ridesSlice';
import {
  selectAccessibleEvents,
  fetchAccessibleEvents,
} from '../../store/slices/eventsSlice';
import { RideStatus } from '../../models/Ride';
import {
  Button,
  Card,
  RideCard,
  QueuePosition,
  StatusBadge,
  EmergencyButton,
  ActionCard,
  SectionHeader,
} from '../../components';
import { colors, spacing, typography, borderRadius, shadows, borders } from '../../components/theme';

type Props = RiderScreenProps<'RiderDashboard'>;

const RiderDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const myRide = useAppSelector(selectMyRide);
  const queuePosition = useAppSelector(selectQueuePosition);
  const loading = useAppSelector(selectLoading);
  const accessibleEvents = useAppSelector(selectAccessibleEvents);

  // Check if rider has access to any events
  const hasAccessibleEvents = accessibleEvents.length > 0;

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchMyRide(user.id));
      // Fetch accessible events to know if rider can request rides
      dispatch(fetchAccessibleEvents({ userId: user.id, userChapterId: user.chapterId }));
    }
  }, [dispatch, user?.id, user?.chapterId]);

  const handleRefresh = () => {
    if (user?.id) {
      dispatch(fetchMyRide(user.id));
      dispatch(fetchAccessibleEvents({ userId: user.id, userChapterId: user.chapterId }));
    }
  };

  const handleRequestRide = () => {
    navigation.navigate('RequestRide');
  };

  const handleEmergencyRide = () => {
    // Check if there are any accessible events
    if (!hasAccessibleEvents && !myRide) {
      Alert.alert(
        'No Active Events',
        'There are no active events available right now. Emergency rides can only be requested during an active event.'
      );
      return;
    }

    // Check if user has an active ride that can be upgraded
    if (myRide && myRide.status !== RideStatus.COMPLETED && myRide.status !== RideStatus.CANCELLED) {
      // Already have an active ride - offer to upgrade it
      Alert.alert(
        'Upgrade to Emergency',
        'This will upgrade your current ride to emergency priority. You will be moved to the front of the queue.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(upgradeRideToEmergency({ rideId: myRide.id })).unwrap();
                Alert.alert('Emergency', 'Your ride has been upgraded to emergency priority.');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to upgrade ride');
              }
            },
          },
        ]
      );
    } else {
      // No active ride - create new emergency ride
      navigation.navigate('RequestRide', { isEmergency: true });
    }
  };

  const handleCancelRide = () => {
    if (!myRide) return;

    // Check if this is a late cancellation (DD has arrived)
    const isLateCancel = myRide.status === RideStatus.ARRIVED;

    if (isLateCancel) {
      // Show warning about penalty
      Alert.alert(
        'Late Cancellation Warning',
        'Your DD has already arrived. Cancelling now will apply a priority penalty to your next ride request (You will be further back in the queue).\n\nAre you sure you want to cancel?',
        [
          { text: 'No, Keep Ride', style: 'cancel' },
          {
            text: 'Cancel Anyway',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(cancelRide({ rideId: myRide.id, applyPenalty: true })).unwrap();
                Alert.alert(
                  'Ride Cancelled',
                  'Your ride has been cancelled. A priority penalty will be applied to your next ride request.'
                );
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel ride');
              }
            },
          },
        ]
      );
    } else {
      // Standard cancellation without penalty
      Alert.alert(
        'Cancel Ride',
        'Are you sure you want to cancel this ride request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(cancelRide({ rideId: myRide.id, applyPenalty: false })).unwrap();
                Alert.alert('Cancelled', 'Your ride request has been cancelled.');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel ride');
              }
            },
          },
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
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Rider'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'R'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Ride Status */}
        {myRide ? (
          <Card style={styles.currentRideCard}>
            <View style={styles.currentRideHeader}>
              <SectionHeader title="Current Ride" icon="car-outline" />
              <StatusBadge status={myRide.status} />
            </View>

            {queuePosition && queuePosition > 0 && myRide.status === RideStatus.QUEUED && (
              <QueuePosition
                position={queuePosition}
                totalInQueue={queuePosition - 1}
                estimatedWaitTime={queuePosition * 15}
              />
            )}

            <RideCard
              ride={myRide}
              showDD={!!myRide.ddId}
              ddName={myRide.ddName}
            />

            {/* Show cancel button for all statuses except completed/cancelled */}
            {myRide.status !== RideStatus.COMPLETED && myRide.status !== RideStatus.CANCELLED && (
              <View style={styles.cancelButton}>
                <Button
                  title={myRide.status === RideStatus.ARRIVED ? 'Cancel Ride (Penalty)' : 'Cancel Ride'}
                  variant="secondary"
                  onPress={() => handleCancelRide()}
                />
              </View>
            )}

          </Card>
        ) : (
          /* Request Ride Section */
          <Card style={styles.requestCard} variant="elevated">
            <View style={styles.requestIconContainer}>
              <Ionicons
                name={hasAccessibleEvents ? 'car-outline' : 'calendar-outline'}
                size={48}
                color={hasAccessibleEvents ? colors.primary : colors.gray[400]}
              />
            </View>
            <Text style={styles.requestTitle}>
              {hasAccessibleEvents ? 'Need a Ride?' : 'No Active Events'}
            </Text>
            <Text style={styles.requestSubtitle}>
              {hasAccessibleEvents
                ? 'Request a safe ride from a designated driver'
                : 'There are no active events available right now. Please check back later.'}
            </Text>
            <Button
              title="Request a Ride"
              onPress={handleRequestRide}
              fullWidth
              icon="arrow-forward-outline"
              disabled={!hasAccessibleEvents}
            />
          </Card>
        )}

        {/* Emergency Button */}
        <View style={styles.emergencyButton}>
          <EmergencyButton
            onEmergency={handleEmergencyRide}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <ActionCard
            icon="document-text-outline"
            title="My Rides"
            subtitle="View history"
            onPress={() => navigation.navigate('MyRides')}
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

        {/* Join Chapter CTA - only show if user has no chapter */}
        {!user?.chapterId && (
          <TouchableOpacity
            style={styles.joinChapterCard}
            onPress={() => navigation.navigate('JoinChapter')}
          >
            <View style={styles.joinChapterIconContainer}>
              <Ionicons name="business-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.joinChapterContent}>
              <Text style={styles.joinChapterTitle}>Join a Chapter</Text>
              <Text style={styles.joinChapterSubtitle}>Request to join your Greek organization</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumberContainer}>
              <Text style={styles.infoNumber}>1</Text>
            </View>
            <Text style={styles.infoText}>Request a ride with your current location</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumberContainer}>
              <Text style={styles.infoNumber}>2</Text>
            </View>
            <Text style={styles.infoText}>Wait for a DD to be assigned</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumberContainer}>
              <Text style={styles.infoNumber}>3</Text>
            </View>
            <Text style={styles.infoText}>Get notified when your ride is on the way</Text>
          </View>
        </Card>
      </ScrollView>
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
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
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
  cancelButton: {
    marginTop: spacing.md,
  },
  requestCard: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  requestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  requestTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  requestSubtitle: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emergencyButton: {
    marginBottom: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.primary,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  infoNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoNumber: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    ...typography.body,
    color: colors.gray[600],
    paddingTop: 4,
  },
  joinChapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: borders.thin,
    borderColor: colors.primaryLight,
    ...shadows.sm,
  },
  joinChapterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  joinChapterContent: {
    flex: 1,
  },
  joinChapterTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  joinChapterSubtitle: {
    ...typography.caption,
    color: colors.gray[500],
  },
});

export default RiderDashboardScreen;
