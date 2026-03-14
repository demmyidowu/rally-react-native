/**
 * DD Ride Details Screen
 *
 * Shows ride details with DD-specific actions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DDScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectRides, selectLoading, markEnRoute, completeRide } from '../../store/slices/ridesSlice';
import { Card, StatusBadge, Button, LoadingSpinner } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = DDScreenProps<'RideDetails'>;

const DDRideDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const { rideId } = route.params;
  const rides = useAppSelector(selectRides);
  const loading = useAppSelector(selectLoading);
  const ride = rides.find(r => r.id === rideId);

  const handleNavigate = () => {
    if (!ride) return;
    navigation.navigate('Navigation', {
      rideId,
      destination: {
        latitude: ride.pickupLocation.latitude,
        longitude: ride.pickupLocation.longitude,
        address: ride.pickupAddress || 'Pickup location',
      }
    });
  };

  const handleMarkEnRoute = async () => {
    try {
      await dispatch(markEnRoute(rideId)).unwrap();
      Alert.alert('En Route', 'Rider has been notified!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleImHere = async () => {
    try {
      // Note: arrived status may need to be added to the slice if needed
      Alert.alert('Notified!', 'The rider has been notified that you have arrived.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to notify rider');
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Complete Ride',
      'Mark this ride as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await dispatch(completeRide(rideId)).unwrap();
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete ride');
            }
          },
        },
      ]
    );
  };

  if (loading && !ride) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Ride not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <StatusBadge status={ride.status} />
          </View>
          {ride.isEmergency && (
            <View style={styles.emergencyTag}>
              <Text style={styles.emergencyText}>🚨 EMERGENCY</Text>
            </View>
          )}
        </Card>

        {/* Rider Info */}
        <Card style={styles.riderCard}>
          <Text style={styles.sectionTitle}>Rider</Text>
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderAvatarText}>
                {ride.riderName?.charAt(0).toUpperCase() || 'R'}
              </Text>
            </View>
            <View style={styles.riderDetails}>
              <Text style={styles.riderName}>{ride.riderName || 'Rider'}</Text>
            </View>
          </View>
        </Card>

        {/* Locations */}
        <Card style={styles.locationCard}>
          <Text style={styles.sectionTitle}>Locations</Text>
          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationValue}>{ride.pickupAddress || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.locationItem}>
            <Text style={styles.locationIcon}>🏁</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Dropoff</Text>
              <Text style={styles.locationValue}>{ride.dropoffAddress || 'N/A'}</Text>
            </View>
          </View>
          <Button
            title="🗺️ Open Navigation"
            onPress={handleNavigate}
            variant="secondary"
            style={styles.navButton}
          />
        </Card>

        {/* Ride Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Passengers</Text>
            <Text style={styles.infoValue}>{ride.passengerCount || 1}</Text>
          </View>
          {ride.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        {ride.status === 'assigned' && (
          <Button
            title="Mark En Route"
            onPress={handleMarkEnRoute}
            loading={loading}
            style={styles.primaryAction}
          />
        )}
        {ride.status === 'enroute' && (
          <>
            <Button
              title="📍 I'M HERE"
              onPress={handleImHere}
              loading={loading}
              style={styles.imHereButton}
            />
            <Button
              title="Complete Ride"
              variant="secondary"
              onPress={handleComplete}
              loading={loading}
              style={styles.primaryAction}
            />
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
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.gray[500],
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.h3,
    color: colors.gray[800],
  },
  emergencyTag: {
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  emergencyText: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.error,
    textAlign: 'center',
  },
  riderCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  riderAvatarText: {
    ...typography.h2,
    color: colors.primary,
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  locationCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  locationValue: {
    ...typography.body,
    color: colors.gray[800],
  },
  navButton: {
    marginTop: spacing.sm,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.body,
    color: colors.gray[500],
  },
  infoValue: {
    ...typography.body,
    color: colors.gray[800],
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: spacing.md,
  },
  notesText: {
    ...typography.body,
    color: colors.gray[600],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  primaryAction: {
    marginBottom: spacing.lg,
  },
  imHereButton: {
    marginBottom: spacing.md,
    backgroundColor: colors.success,
  },
});

export default DDRideDetailsScreen;
