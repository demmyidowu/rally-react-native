/**
 * Main Navigator
 *
 * Tab-based navigation for authenticated users
 * Conditionally shows Admin tab based on user role
 *
 * Structure:
 * - Admin Tab (only if role === 'admin')
 * - DD Tab (all users)
 * - Rider Tab (all users)
 */

import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

// Import navigators
import AdminNavigator from './AdminNavigator';
import DDNavigator from './DDNavigator';
import RiderNavigator from './RiderNavigator';

// Import theme and icons
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, spacing } from '../components/theme';

const Tab = createBottomTabNavigator();

export const MainNavigator: React.FC = () => {
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
          height: Platform.OS === 'ios' ? 88 : 68,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: spacing.xs,
        },
        tabBarIconStyle: {
          marginTop: spacing.xs,
        },
      }}
    >
      {/* Admin Tab - Only visible for admin users */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "shield" : "shield-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      )}

      {/* DD Tab - Available for all users */}
      <Tab.Screen
        name="DD"
        component={DDNavigator}
        options={{
          tabBarLabel: 'DD',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "car" : "car-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Rider Tab - Available for all users */}
      <Tab.Screen
        name="Rider"
        component={RiderNavigator}
        options={{
          tabBarLabel: 'Rider',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
