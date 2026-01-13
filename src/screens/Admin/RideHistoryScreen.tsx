/**
 * Ride History Screen (Admin)
 *
 * View all rides with filtering and statistics.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { selectRides, fetchActiveRides, selectLoading } from '../../store/slices/ridesSlice';
import { Ride } from '../../models/Ride';
import { Header, Card, EmptyState, LoadingSpinner, StatusBadge } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = AdminScreenProps<'RideHistory'>;

type FilterStatus = 'all' | 'completed' | 'active' | 'cancelled';

const RideHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const rides = useAppSelector(selectRides);
  const loading = useAppSelector(selectLoading);

  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (user?.chapterId) {
      dispatch(fetchActiveRides());
    }
  }, [dispatch, user?.chapterId]);

  const handleRefresh = () => {
    if (user?.chapterId) {
      dispatch(fetchActiveRides());
    }
  };

  const getFilteredRides = (): Ride[] => {
    if (!rides) return [];

    switch (filter) {
      case 'active':
        return rides.filter((r) =>
          ['queued', 'assigned', 'enroute'].includes(r.status)
        );
      case 'completed':
        return rides.filter((r) => r.status === 'completed');
      case 'cancelled':
        return rides.filter((r) => r.status === 'cancelled');
      default:
        return rides;
    }
  };

  const filteredRides = getFilteredRides();

  // Calculate stats
  const stats = {
    total: rides?.length || 0,
    completed: rides?.filter(r => r.status === 'completed').length || 0,
    active: rides?.filter(r => ['queued', 'assigned', 'enroute'].includes(r.status)).length || 0,
    emergency: rides?.filter(r => r.isEmergency).length || 0,
  };

  const renderRide = ({ item }: { item: Ride }) => (
    <Card style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View>
          <Text style={styles.riderName}>{item.riderName || 'Rider'}</Text>
          <Text style={styles.rideTime}>
            {item.requestedAt?.toLocaleString?.() || 'N/A'}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.rideDetails}>
        <Text style={styles.locationText}>📍 {item.pickupAddress || 'N/A'}</Text>
        <Text style={styles.locationText}>🏁 {item.dropoffAddress || 'N/A'}</Text>
      </View>
      {item.ddName && (
        <Text style={styles.ddInfo}>DD: {item.ddName}</Text>
      )}
      {item.isEmergency && (
        <View style={styles.emergencyBadge}>
          <Text style={styles.emergencyText}>🚨 Emergency</Text>
        </View>
      )}
    </Card>
  );

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Ride History" showBack onBack={() => navigation.goBack()} />

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.emergencyValue]}>{stats.emergency}</Text>
          <Text style={styles.statLabel}>Emergency</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rides List */}
      {loading && filteredRides.length === 0 ? (
        <LoadingSpinner />
      ) : filteredRides.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title="No Rides Found"
          message={filter === 'all' ? "No rides yet." : `No ${filter} rides.`}
        />
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRide}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  emergencyValue: {
    color: colors.error,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray[500],
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: 2,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    color: colors.gray[600],
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
  },
  rideCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  riderName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  rideTime: {
    ...typography.caption,
    color: colors.gray[500],
  },
  rideDetails: {
    marginBottom: spacing.sm,
  },
  locationText: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },
  ddInfo: {
    ...typography.caption,
    color: colors.primary,
  },
  emergencyBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  emergencyText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
});

export default RideHistoryScreen;
