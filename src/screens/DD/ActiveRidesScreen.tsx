/**
 * Active Rides Screen (DD)
 *
 * Shows all rides assigned to the DD with action buttons.
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
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
  selectLoading,
} from '../../store/slices/ddAssignmentsSlice';
import { selectActiveRides, markEnRoute, completeRide } from '../../store/slices/ridesSlice';
import { Ride } from '../../models/Ride';
import { Header, RideCard, EmptyState, LoadingSpinner } from '../../components';
import { colors, spacing } from '../../components/theme';

type Props = DDScreenProps<'ActiveRides'>;

const ActiveRidesScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const activeEvent = useAppSelector(selectActiveEvent);
  const myAssignment = useAppSelector(selectMyAssignment);
  const allActiveRides = useAppSelector(selectActiveRides);
  const loading = useAppSelector(selectLoading);

  // Filter rides to only those assigned to this DD
  const assignedRideIds = myAssignment?.currentRides ?? [];
  const assignedRides = allActiveRides.filter(r => assignedRideIds.includes(r.id));

  useEffect(() => {
    if (user?.id && activeEvent?.id) {
      dispatch(fetchMyDDAssignment({ eventId: activeEvent.id, ddId: user.id }));
    }
  }, [dispatch, user?.id, activeEvent?.id]);

  const handleRefresh = () => {
    if (user?.id && activeEvent?.id) {
      dispatch(fetchMyDDAssignment({ eventId: activeEvent.id, ddId: user.id }));
    }
  };

  const handleMarkEnRoute = async (ride: Ride) => {
    try {
      await dispatch(markEnRoute(ride.id)).unwrap();

      Alert.alert('En Route', 'Rider has been notified you are on your way!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update ride status');
    }
  };

  const handleComplete = async (ride: Ride) => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to mark this ride as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await dispatch(completeRide(ride.id)).unwrap();
              Alert.alert('Success', 'Ride marked as complete!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete ride');
            }
          },
        },
      ]
    );
  };

  const handleViewRide = (ride: Ride) => {
    navigation.navigate('RideDetails', { rideId: ride.id });
  };

  const handleNavigate = (ride: Ride) => {
    // Navigate to the pickup location
    navigation.navigate('Navigation', {
      rideId: ride.id,
      destination: {
        latitude: ride.pickupLocation.latitude,
        longitude: ride.pickupLocation.longitude,
        address: ride.pickupAddress || 'Pickup location',
      }
    });
  };

  const activeRides = assignedRides?.filter(
    (r) => ['assigned', 'enroute'].includes(r.status)
  ) || [];

  const renderRide = ({ item }: { item: Ride }) => (
    <RideCard
      ride={item}
      onPress={() => handleViewRide(item)}
      variant="dd"
      showActions
      onMarkEnRoute={() => handleMarkEnRoute(item)}
      onComplete={() => handleComplete(item)}
      onNavigate={() => handleNavigate(item)}
      style={styles.rideCard}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Active Rides" showBack onBack={() => navigation.goBack()} />

      {loading && activeRides.length === 0 ? (
        <LoadingSpinner />
      ) : activeRides.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title="No Active Rides"
          message="You don't have any active ride assignments. Stay active to receive new rides."
        />
      ) : (
        <FlatList
          data={activeRides}
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
  listContent: {
    padding: spacing.lg,
  },
  rideCard: {
    marginBottom: spacing.md,
  },
});

export default ActiveRidesScreen;
