/**
 * Navigation Utilities
 *
 * Helper functions for navigation outside of React components
 * Useful for navigating from:
 * - Push notifications
 * - Deep links
 * - Redux thunks
 * - Service layer
 */

import { createNavigationContainerRef, NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

// ============================================================================
// Navigation Ref
// ============================================================================

/**
 * Navigation reference for navigating outside React components
 * Must be attached to NavigationContainer in AppNavigator
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// ============================================================================
// Navigation Helper Functions
// ============================================================================

/**
 * Navigate to a screen (type-safe)
 * @param name Screen name
 * @param params Screen params
 */
export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never, params as never);
  } else {
    console.warn('Navigation is not ready yet');
  }
}

/**
 * Go back to previous screen
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation state to a specific screen
 * Useful after logout or authentication changes
 */
export function resetNavigation<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: name as never, params: params as never }],
    });
  }
}

/**
 * Get current route name
 */
export function getCurrentRouteName(): string | undefined {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
}

// ============================================================================
// Deep Linking Helpers (for Notifications)
// ============================================================================

/**
 * Navigate to a specific ride details screen
 * Can be called from push notification tap
 * @param rideId Ride ID
 * @param source Source tab (rider, dd, or admin)
 */
export function navigateToRide(
  rideId: string,
  source: 'rider' | 'dd' | 'admin' = 'rider'
) {
  if (!navigationRef.isReady()) {
    console.warn('Navigation is not ready yet');
    return;
  }

  // Navigate to appropriate tab and then to ride details
  // This assumes Main navigator is already mounted
  try {
    if (source === 'rider') {
      navigationRef.navigate('Main' as never);
      // @ts-ignore - nested navigation
      navigationRef.navigate('Rider', {
        screen: 'RideDetails',
        params: { rideId },
      });
    } else if (source === 'dd') {
      navigationRef.navigate('Main' as never);
      // @ts-ignore - nested navigation
      navigationRef.navigate('DD', {
        screen: 'RideDetails',
        params: { rideId },
      });
    } else if (source === 'admin') {
      navigationRef.navigate('Main' as never);
      // @ts-ignore - nested navigation
      navigationRef.navigate('Admin', {
        screen: 'RideDetails',
        params: { rideId },
      });
    }
  } catch (error) {
    console.error('Error navigating to ride:', error);
  }
}

/**
 * Navigate to DD Dashboard
 * Useful when DD receives ride assignment notification
 */
export function navigateToDDDashboard() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main' as never);
    // @ts-ignore - nested navigation
    navigationRef.navigate('DD', { screen: 'DDDashboard' });
  }
}

/**
 * Navigate to DD Active Rides
 * Useful when DD needs to view all active rides
 */
export function navigateToDDActiveRides() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main' as never);
    // @ts-ignore - nested navigation
    navigationRef.navigate('DD', { screen: 'ActiveRides' });
  }
}

/**
 * Navigate to Admin Alerts
 * Useful for emergency ride notifications to admins
 */
export function navigateToAdminAlerts() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main' as never);
    // @ts-ignore - nested navigation
    navigationRef.navigate('Admin', { screen: 'AdminDashboard' });
  }
}

/**
 * Navigate to Rider Dashboard
 * Useful after requesting a ride
 */
export function navigateToRiderDashboard() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main' as never);
    // @ts-ignore - nested navigation
    navigationRef.navigate('Rider', { screen: 'RiderDashboard' });
  }
}

/**
 * Navigate to Queue Status
 * Useful after requesting a ride to see queue position
 */
export function navigateToQueueStatus() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Main' as never);
    // @ts-ignore - nested navigation
    navigationRef.navigate('Rider', { screen: 'QueueStatus' });
  }
}

/**
 * Navigate to Emergency Ride modal
 * Accessible from anywhere in the app
 */
export function navigateToEmergencyRide() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('EmergencyRide' as never);
  }
}

/**
 * Navigate based on notification type
 * Centralized handler for push notification taps
 * @param notificationType Type of notification
 * @param rideId Associated ride ID
 */
export function handleNotificationNavigation(
  notificationType: 'ride_assigned' | 'dd_enroute' | 'ride_completed' | 'ride_cancelled' | 'emergency_ride',
  rideId?: string
) {
  if (!navigationRef.isReady()) {
    console.warn('Navigation is not ready yet');
    return;
  }

  switch (notificationType) {
    case 'ride_assigned':
      // DD received ride assignment → navigate to DD dashboard
      if (rideId) {
        navigateToRide(rideId, 'dd');
      } else {
        navigateToDDDashboard();
      }
      break;

    case 'dd_enroute':
      // Rider notified DD is en route → navigate to ride details
      if (rideId) {
        navigateToRide(rideId, 'rider');
      } else {
        navigateToRiderDashboard();
      }
      break;

    case 'ride_completed':
    case 'ride_cancelled':
      // Ride ended → navigate to ride history/details
      if (rideId) {
        navigateToRide(rideId, 'rider');
      } else {
        navigateToRiderDashboard();
      }
      break;

    case 'emergency_ride':
      // Admin notified of emergency → navigate to admin dashboard
      navigateToAdminAlerts();
      break;

    default:
      console.warn('Unknown notification type:', notificationType);
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if navigation is ready
 */
export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}

/**
 * Wait for navigation to be ready
 * @param timeout Maximum time to wait (ms)
 */
export async function waitForNavigation(timeout = 5000): Promise<boolean> {
  const startTime = Date.now();

  while (!navigationRef.isReady()) {
    if (Date.now() - startTime > timeout) {
      console.warn('Navigation ready timeout');
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return true;
}
