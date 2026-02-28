/**
 * Admin Navigator
 *
 * Admin-only screens for managing events, DDs, and members
 * Only accessible if user role === 'admin'
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminStackParamList } from './types';

// Placeholder screens - will be implemented by react-native-developer
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import EventManagementScreen from '../screens/Admin/EventManagementScreen';
import CreateEventScreen from '../screens/Admin/CreateEventScreen';
import EditEventScreen from '../screens/Admin/EditEventScreen';
import DDManagementScreen from '../screens/Admin/DDManagementScreen';
import AssignDDScreen from '../screens/Admin/AssignDDScreen';
import MemberManagementScreen from '../screens/Admin/MemberManagementScreen';
import MemberDetailsScreen from '../screens/Admin/MemberDetailsScreen';
import RideHistoryScreen from '../screens/Admin/RideHistoryScreen';
import RideDetailsScreen from '../screens/Admin/RideDetailsScreen';
import JoinRequestsScreen from '../screens/Admin/JoinRequestsScreen';
import AlertsScreen from '../screens/Admin/AlertsScreen';

const Stack = createStackNavigator<AdminStackParamList>();

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerStyle: {
          backgroundColor: '#7B68A8', // Lavender purple
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#F8F6FC' },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          headerShown: false, // Custom greeting header in screen
        }}
      />
      <Stack.Screen
        name="EventManagement"
        component={EventManagementScreen}
        options={{
          title: 'Event Management',
        }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: 'Create Event',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{
          title: 'Edit Event',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="DDManagement"
        component={DDManagementScreen}
        options={{
          title: 'DD Management',
        }}
      />
      <Stack.Screen
        name="AssignDD"
        component={AssignDDScreen}
        options={{
          title: 'Assign DD',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="MemberManagement"
        component={MemberManagementScreen}
        options={{
          title: 'Member Management',
        }}
      />
      <Stack.Screen
        name="MemberDetails"
        component={MemberDetailsScreen}
        options={{
          title: 'Member Details',
        }}
      />
      <Stack.Screen
        name="RideHistory"
        component={RideHistoryScreen}
        options={{
          title: 'Ride History',
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
        name="JoinRequests"
        component={JoinRequestsScreen}
        options={{
          title: 'Join Requests',
        }}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Alerts',
        }}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
