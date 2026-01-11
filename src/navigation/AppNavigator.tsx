/**
 * App Navigator
 *
 * Root navigation container for Rally React Native
 * Handles:
 * - Auth flow vs Main app flow based on authentication state
 * - Deep linking for notifications
 * - Loading states
 * - Navigation persistence (optional)
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootState } from '../store/store';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Import types
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['rally://', 'https://rally.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Signup: 'signup',
          EmailVerification: 'verify-email',
        },
      },
      Main: {
        screens: {
          Admin: {
            screens: {
              AdminDashboard: 'admin',
              EventManagement: 'admin/events',
              CreateEvent: 'admin/events/create',
              EditEvent: 'admin/events/edit/:eventId',
              DDManagement: 'admin/dds',
              AssignDD: 'admin/dds/assign/:eventId',
              MemberManagement: 'admin/members',
              MemberDetails: 'admin/members/:userId',
              RideHistory: 'admin/rides',
              RideDetails: 'admin/rides/:rideId',
            },
          },
          DD: {
            screens: {
              DDDashboard: 'dd',
              ActiveRides: 'dd/rides',
              RideDetails: 'dd/rides/:rideId',
              Navigation: 'dd/navigation/:rideId',
              ToggleStatus: 'dd/status',
            },
          },
          Rider: {
            screens: {
              RiderDashboard: 'rider',
              RequestRide: 'rider/request',
              MyRides: 'rider/rides',
              RideDetails: 'rider/rides/:rideId',
              QueueStatus: 'rider/queue',
            },
          },
        },
      },
      EmergencyRide: 'emergency',
      Notification: 'notification/:type/:rideId',
    },
  },
};

export const AppNavigator: React.FC = () => {
  // Get auth state from Redux
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.loading);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#512888" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - Show login/signup flow
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              animationTypeForReplace: 'pop', // Pop animation when logging out
            }}
          />
        ) : (
          // Main Stack - Show main app
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{
              animationTypeForReplace: 'push', // Push animation when logging in
            }}
          />
        )}

        {/* Global modals that can be accessed from anywhere */}
        {isAuthenticated && (
          <>
            <Stack.Screen
              name="EmergencyRide"
              component={EmergencyRideModal}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Emergency Ride',
                headerStyle: {
                  backgroundColor: '#D32F2F', // Red for emergency
                },
                headerTintColor: '#FFFFFF',
              }}
            />
            <Stack.Screen
              name="Notification"
              component={NotificationModal}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Notification',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ============================================================================
// Global Modal Components (Placeholders)
// ============================================================================

const EmergencyRideModal: React.FC = () => {
  return (
    <View style={styles.modalContainer}>
      {/* Will be implemented by react-native-developer */}
    </View>
  );
};

const NotificationModal: React.FC = () => {
  return (
    <View style={styles.modalContainer}>
      {/* Will be implemented by react-native-developer */}
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default AppNavigator;
