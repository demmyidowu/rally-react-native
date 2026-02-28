/**
 * Ride Details Screen (Rider)
 *
 * Shows detailed information about a specific ride.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectRides, selectLoading } from '../../store/slices/ridesSlice';
import { Card, StatusBadge, Button, LoadingSpinner } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = RiderScreenProps<'RideDetails'>;

const RideDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId } = route.params;
  const rides = useAppSelector(selectRides);
  const loading = useAppSelector(selectLoading);
  const ride = rides.find(r => r.id === rideId);

  const handleCallDD = () => {
    if (ride?.ddPhone) {
      Linking.openURL(`tel:${ride.ddPhone}`);
    } else {
      Alert.alert('Unavailable', 'DD phone number is not available.');
    }
  };

  const handleTextDD = () => {
    if (ride?.ddPhone) {
      Linking.openURL(`sms:${ride.ddPhone}`);
    } else {
      Alert.alert('Unavailable', 'DD phone number is not available.');
    }
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

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <StatusBadge status={ride.status} />
          </View>
          {ride.isEmergency && (
            <View style={styles.emergencyTag}>
              <Text style={styles.emergencyText}>🚨 Emergency Ride</Text>
            </View>
          )}
        </Card>

        {/* DD Info */}
        {ride.ddId && (
          <Card style={styles.ddCard}>
            <Text style={styles.sectionTitle}>Your DD</Text>
            <View style={styles.ddInfo}>
              <View style={styles.ddAvatar}>
                <Text style={styles.ddAvatarText}>
                  {ride.ddName?.charAt(0).toUpperCase() || 'D'}
                </Text>
              </View>
              <View style={styles.ddDetails}>
                <Text style={styles.ddName}>{ride.ddName || 'Assigned DD'}</Text>
                {ride.ddCarDescription && (
                  <Text style={styles.ddCar}>{ride.ddCarDescription}</Text>
                )}
              </View>
            </View>
            {(ride.status === 'assigned' || ride.status === 'enroute') && (
              <View style={styles.ddActions}>
                <Button
                  title="Call"
                  onPress={handleCallDD}
                  style={styles.ddActionButton}
                />
                <Button
                  title="Text"
                  variant="secondary"
                  onPress={handleTextDD}
                  style={styles.ddActionButton}
                />
              </View>
            )}
          </Card>
        )}

        {/* Location Details */}
        <Card style={styles.detailsCard}>
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
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationValue}>{ride.dropoffAddress || 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {/* Ride Info */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Ride Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Passengers</Text>
            <Text style={styles.infoValue}>{ride.passengerCount || 1}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Requested</Text>
            <Text style={styles.infoValue}>{formatDate(ride.requestedAt)}</Text>
          </View>
          {ride.estimatedETA && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ETA</Text>
              <Text style={styles.infoValue}>{ride.estimatedETA} min</Text>
            </View>
          )}
          {ride.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          )}
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
    color: colors.error,
    textAlign: 'center',
  },
  ddCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
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
  ddActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ddActionButton: {
    flex: 1,
  },
  detailsCard: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
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
});

export default RideDetailsScreen;
