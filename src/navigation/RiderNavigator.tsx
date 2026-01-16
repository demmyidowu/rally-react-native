/**
 * Rider Navigator
 *
 * Rider screens for requesting rides and viewing ride status
 * Accessible to all users (everyone can request rides)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RiderStackParamList } from './types';

// Placeholder screens - will be implemented by react-native-developer
import RiderDashboardScreen from '../screens/Rider/RiderDashboardScreen';
import RequestRideScreen from '../screens/Rider/RequestRideScreen';
import MyRidesScreen from '../screens/Rider/MyRidesScreen';
import RideDetailsScreen from '../screens/Rider/RideDetailsScreen';
import JoinChapterScreen from '../screens/Rider/JoinChapterScreen';
import ProfileScreen from '../screens/Rider/ProfileScreen';

const Stack = createStackNavigator<RiderStackParamList>();

export const RiderNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#512888', // K-State purple
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#F5F5F5' },
      }}
    >
      <Stack.Screen
        name="RiderDashboard"
        component={RiderDashboardScreen}
        options={{
          title: 'Rider Dashboard',
          headerLeft: () => null, // No back button on main dashboard
        }}
      />
      <Stack.Screen
        name="RequestRide"
        component={RequestRideScreen}
        options={{
          title: 'Request Ride',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="MyRides"
        component={MyRidesScreen}
        options={{
          title: 'My Rides',
        }}
      />
      <Stack.Screen
        name="RideDetails"
        component={RideDetailsScreen}
        options={{
          title: 'Ride Details',
        }}
      />
      <Stack.Screen
        name="JoinChapter"
        component={JoinChapterScreen}
        options={{
          title: 'Join a Chapter',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default RiderNavigator;
