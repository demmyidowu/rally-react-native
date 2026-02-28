/**
 * Ride Details Screen (Admin)
 *
 * View ride details from admin perspective.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectRides, selectLoading } from '../../store/slices/ridesSlice';
import { Card, StatusBadge, LoadingSpinner } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = AdminScreenProps<'RideDetails'>;

const AdminRideDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId } = route.params;
  const rides = useAppSelector(selectRides);
  const ride = rides.find(r => r.id === rideId);
  const loading = useAppSelector(selectLoading);

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <StatusBadge status={ride.status} />
          </View>
          {ride.isEmergency && (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyText}>🚨 Emergency Ride</Text>
            </View>
          )}
        </Card>

        {/* Rider Info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Rider</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{ride.riderName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{ride.riderPhone || 'N/A'}</Text>
          </View>
        </Card>

        {/* DD Info */}
        {ride.ddId && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Designated Driver</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{ride.ddName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Car</Text>
              <Text style={styles.value}>N/A</Text>
            </View>
          </Card>
        )}

        {/* Locations */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Locations</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>📍 Pickup</Text>
            <Text style={styles.locationValue}>{ride.pickupAddress || 'N/A'}</Text>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>🏁 Dropoff</Text>
            <Text style={styles.locationValue}>{ride.dropoffAddress || 'N/A'}</Text>
          </View>
        </Card>

        {/* Ride Info */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Passengers</Text>
            <Text style={styles.value}>1</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Requested</Text>
            <Text style={styles.value}>{formatDate(ride.requestedAt)}</Text>
          </View>
          {ride.completedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Completed</Text>
              <Text style={styles.value}>{formatDate(ride.completedAt)}</Text>
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
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.gray[500],
  },
  value: {
    ...typography.body,
    color: colors.gray[800],
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  emergencyBadge: {
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
  locationRow: {
    marginBottom: spacing.md,
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
});

export default AdminRideDetailsScreen;
