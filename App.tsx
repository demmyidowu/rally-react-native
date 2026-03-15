/**
 * Rally App Entry Point
 *
 * Sets up:
 * - Redux store with persistence
 * - Navigation container
 * - Push notification listeners
 * - Auth state management
 */

import React, { useEffect, Component, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
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

// Components
import OfflineBanner from './src/components/OfflineBanner';

// Theme
import { colors } from './src/components/theme';

/**
 * Error Boundary — catches uncaught render errors in production
 */
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    console.error('Uncaught render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            The app encountered an unexpected error. Please restart the app.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

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
      <OfflineBanner />
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
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: colors.gray[500],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
