/**
 * DD Navigator
 *
 * Designated Driver screens for managing active rides and status
 * Accessible to all users (everyone can be a DD)
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DDStackParamList } from './types';

// Placeholder screens - will be implemented by react-native-developer
import DDDashboardScreen from '../screens/DD/DDDashboardScreen';
import ActiveRidesScreen from '../screens/DD/ActiveRidesScreen';
import RideDetailsScreen from '../screens/DD/RideDetailsScreen';
import NavigationScreen from '../screens/DD/NavigationScreen';
import ToggleStatusScreen from '../screens/DD/ToggleStatusScreen';

const Stack = createStackNavigator<DDStackParamList>();

export const DDNavigator: React.FC = () => {
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
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="DDDashboard"
        component={DDDashboardScreen}
        options={{
          title: 'DD Dashboard',
          headerLeft: () => null, // No back button on main dashboard
        }}
      />
      <Stack.Screen
        name="ActiveRides"
        component={ActiveRidesScreen}
        options={{
          title: 'Active Rides',
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
        name="Navigation"
        component={NavigationScreen}
        options={{
          title: 'Navigation',
          headerShown: false, // Full-screen navigation
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="ToggleStatus"
        component={ToggleStatusScreen}
        options={{
          title: 'Toggle Status',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default DDNavigator;
