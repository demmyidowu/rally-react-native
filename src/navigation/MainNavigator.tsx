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
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

// Import navigators
import AdminNavigator from './AdminNavigator';
import DDNavigator from './DDNavigator';
import RiderNavigator from './RiderNavigator';

// Import icons (placeholder - will use actual icon library)
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export const MainNavigator: React.FC = () => {
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#512888', // K-State purple
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Rider Tab - Available for all users */}
      <Tab.Screen
        name="Rider"
        component={RiderNavigator}
        options={{
          tabBarLabel: 'Rider',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
