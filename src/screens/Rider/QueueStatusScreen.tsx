/**
 * Queue Status Screen
 *
 * Shows the rider's current position in the queue and estimated wait time.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import {
  selectMyRide,
  selectQueuePosition,
  fetchMyRide,
  selectLoading,
} from '../../store/slices/ridesSlice';
import { Header, Card, QueuePosition, Button, EmptyState } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = RiderScreenProps<'QueueStatus'>;

const QueueStatusScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const myRide = useAppSelector(selectMyRide);
  const queuePosition = useAppSelector(selectQueuePosition);
  const loading = useAppSelector(selectLoading);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchMyRide(user.id));
    }
  }, [dispatch, user?.id]);

  const handleRefresh = () => {
    if (user?.id) {
      dispatch(fetchMyRide(user.id));
    }
  };

  const getStatusMessage = (): { title: string; message: string; icon: string } => {
    if (!myRide) {
      return {
        title: 'No Active Ride',
        message: 'You do not have a ride in the queue.',
        icon: '🚗',
      };
    }

    switch (myRide.status) {
      case 'queued':
        return {
          title: 'In Queue',
          message: 'Waiting for an available DD...',
          icon: '⏳',
        };
      case 'assigned':
        return {
          title: 'DD Assigned',
          message: 'Your DD is getting ready to pick you up.',
          icon: '👋',
        };
      case 'enroute':
        return {
          title: 'On The Way!',
          message: 'Your DD is heading to your location.',
          icon: '🚙',
        };
      case 'completed':
        return {
          title: 'Ride Complete',
          message: 'Thank you for using RallyRide!',
          icon: '✅',
        };
      case 'cancelled':
        return {
          title: 'Ride Cancelled',
          message: 'This ride was cancelled.',
          icon: '❌',
        };
      default:
        return {
          title: 'Unknown Status',
          message: 'Please refresh to update.',
          icon: '❓',
        };
    }
  };

  const statusInfo = getStatusMessage();
  const estimatedWait = queuePosition ? queuePosition * 15 : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Queue Status" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!myRide || !['queued', 'assigned', 'enroute'].includes(myRide.status) ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="car-outline"
              title={statusInfo.title}
              message={statusInfo.message}
              actionTitle="Request a Ride"
              onAction={() => navigation.navigate('RequestRide')}
            />
          </View>
        ) : (
          <>
            {/* Status Card */}
            <Card style={styles.statusCard}>
              <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
              <Text style={styles.statusTitle}>{statusInfo.title}</Text>
              <Text style={styles.statusMessage}>{statusInfo.message}</Text>
            </Card>

            {/* Queue Position */}
            {myRide.status === 'queued' && queuePosition && (
              <Card style={styles.queueCard}>
                <QueuePosition
                  position={queuePosition}
                  totalInQueue={Math.max(queuePosition + 5, 10)}
                  estimatedWaitTime={estimatedWait || undefined}
                />
              </Card>
            )}

            {/* DD Info */}
            {(myRide.status === 'assigned' || myRide.status === 'enroute') && (
              <Card style={styles.ddCard}>
                <Text style={styles.ddTitle}>Your Designated Driver</Text>
                <View style={styles.ddInfo}>
                  <View style={styles.ddAvatar}>
                    <Text style={styles.ddAvatarText}>
                      {myRide.ddName?.charAt(0).toUpperCase() || 'D'}
                    </Text>
                  </View>
                  <View style={styles.ddDetails}>
                    <Text style={styles.ddName}>{myRide.ddName || 'DD'}</Text>
                    {myRide.ddCarDescription && (
                      <Text style={styles.ddCar}>{myRide.ddCarDescription}</Text>
                    )}
                  </View>
                </View>
                {myRide.estimatedETA && (
                  <View style={styles.etaContainer}>
                    <Text style={styles.etaLabel}>Estimated Arrival</Text>
                    <Text style={styles.etaValue}>{myRide.estimatedETA} min</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Ride Details */}
            <Card style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Ride Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup</Text>
                <Text style={styles.detailValue}>{myRide.pickupAddress || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Destination</Text>
                <Text style={styles.detailValue}>{myRide.dropoffAddress || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Passengers</Text>
                <Text style={styles.detailValue}>{myRide.passengerCount || 1}</Text>
              </View>
            </Card>

            {/* Cancel Button */}
            {myRide.status === 'queued' && (
              <Button
                title="Cancel Ride"
                variant="secondary"
                onPress={() => { }}
                style={styles.cancelButton}
              />
            )}
          </>
        )}
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
    flexGrow: 1,
  },
  statusCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  statusMessage: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
  },
  queueCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ddCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  ddTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  ddInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ddAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ddAvatarText: {
    ...typography.h2,
    color: colors.primary,
  },
  ddDetails: {
    flex: 1,
  },
  ddName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  ddCar: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  etaLabel: {
    ...typography.body,
    color: colors.success,
  },
  etaValue: {
    ...typography.h3,
    color: colors.success,
  },
  detailsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailsTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    ...typography.body,
    color: colors.gray[500],
  },
  detailValue: {
    ...typography.body,
    color: colors.gray[800],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  actionButton: {
    marginTop: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default QueueStatusScreen;
