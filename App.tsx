/**
 * Rally App Entry Point
 *
 * Sets up:
 * - Redux store with persistence
 * - Navigation container
 * - Push notification listeners
 * - Auth state management
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Store
import { store, persistor } from './src/store';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { selectUser, fetchUserProfile } from './src/store/slices/authSlice';

// Navigation
import { AppNavigator } from './src/navigation';
import { navigationRef } from './src/navigation/navigationUtils';

// Services
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from './src/services/notificationService';

// Theme
import { colors } from './src/components/theme';

/**
 * Loading screen shown while Redux state is being rehydrated
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/**
 * Main app content with notification setup
 */
function AppContent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    // Fetch user profile on mount if not already loaded
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    // Set up push notifications when user is authenticated
    if (user?.id) {
      registerForPushNotifications(user.id);
    }

    // Set up notification listeners with navigation ref
    const cleanup = setupNotificationListeners(navigationRef);
    return cleanup;
  }, [user?.id]);

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <AppNavigator />
    </>
  );
}

/**
 * Root App component
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AppContent />
        </PersistGate>
      </Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
