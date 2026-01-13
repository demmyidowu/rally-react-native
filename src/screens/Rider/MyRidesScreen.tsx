/**
 * My Rides Screen
 *
 * Displays the rider's ride history with filtering options.
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
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import {
  selectMyRides,
  fetchMyRides,
  selectLoading,
} from '../../store/slices/ridesSlice';
import { Ride } from '../../models/Ride';
import { Header, RideCard, EmptyState, LoadingSpinner } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = RiderScreenProps<'MyRides'>;

type FilterStatus = 'all' | 'active' | 'completed' | 'cancelled';

const MyRidesScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const myRides = useAppSelector(selectMyRides);
  const loading = useAppSelector(selectLoading);

  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchMyRides(user.id));
    }
  }, [dispatch, user?.id]);

  const handleRefresh = () => {
    if (user?.id) {
      dispatch(fetchMyRides(user.id));
    }
  };

  const getFilteredRides = (): Ride[] => {
    if (!myRides) return [];

    switch (filter) {
      case 'active':
        return myRides.filter((r) =>
          ['queued', 'assigned', 'enroute'].includes(r.status)
        );
      case 'completed':
        return myRides.filter((r) => r.status === 'completed');
      case 'cancelled':
        return myRides.filter((r) => r.status === 'cancelled');
      default:
        return myRides;
    }
  };

  const filteredRides = getFilteredRides();

  const handleRidePress = (ride: Ride) => {
    navigation.navigate('RideDetails', { rideId: ride.id });
  };

  const renderRide = ({ item }: { item: Ride }) => (
    <RideCard
      ride={item}
      onPress={() => handleRidePress(item)}
      showActions={false}
      style={styles.rideCard}
    />
  );

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="My Rides" showBack onBack={() => navigation.goBack()} />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
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
          message={
            filter === 'all'
              ? "You haven't requested any rides yet."
              : `No ${filter} rides found.`
          }
        />
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRide}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
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
    marginHorizontal: spacing.xs,
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
    marginBottom: spacing.md,
  },
});

export default MyRidesScreen;
