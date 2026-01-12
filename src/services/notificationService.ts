/**
 * Notification Service
 *
 * Manages push notifications for the Rally app using expo-notifications.
 * Handles permission requests, FCM token management, notification handlers,
 * and navigation based on notification type.
 *
 * Features:
 * - Request and manage notification permissions (iOS & Android)
 * - Register for push notifications and get Expo Push Token (wraps FCM)
 * - Handle received notifications (foreground)
 * - Handle notification taps (background/terminated)
 * - Save FCM token to Firestore
 * - Configure notification channels (Android)
 * - Local notifications support
 * - Badge count management (iOS only)
 * - Navigation based on notification type
 *
 * Usage Example:
 * ```typescript
 * import notificationService, { registerForPushNotifications, setupNotificationListeners } from './services/notificationService';
 * import { navigationRef } from './navigation';
 *
 * // In App.tsx or main component
 * useEffect(() => {
 *   // Register for push notifications
 *   if (currentUser) {
 *     registerForPushNotifications(currentUser.id);
 *   }
 *
 *   // Set up notification listeners with navigation
 *   const cleanup = setupNotificationListeners(navigationRef);
 *
 *   return cleanup;
 * }, [currentUser]);
 * ```
 *
 * Cloud Functions Integration:
 * The Cloud Functions send these notification types:
 * 1. ride_assigned - When ride is assigned to DD
 * 2. dd_en_route - When DD marks en route (with ETA)
 * 3. emergency_alert - When emergency ride is requested
 * 4. dd_inactive_alert - When DD toggles inactive multiple times
 *
 * Platform Differences:
 * - iOS: Requires user permission for notifications
 * - Android: Permissions granted by default (SDK 33+)
 * - iOS: Badge count works
 * - Android: Badge count may not work on all launchers
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  NotificationType,
  NotificationData,
  NotificationPermissionStatus,
  NotificationChannel,
  RideNotificationData,
  EmergencyNotificationData,
} from '../types/notifications';

/**
 * Notification channels for Android
 */
const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  {
    id: 'default',
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'General notifications',
  },
  {
    id: 'rides',
    name: 'Ride Updates',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Notifications about ride requests and updates',
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableLights: true,
    lightColor: '#FF6B35',
  },
  {
    id: 'emergency',
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    description: 'Critical emergency notifications',
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500],
    enableLights: true,
    lightColor: '#FF0000',
  },
  {
    id: 'activity',
    name: 'Activity Warnings',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'DD activity monitoring alerts',
    sound: 'default',
  },
];

/**
 * Configure how notifications are handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (
    notification
  ): Promise<Notifications.NotificationBehavior> => {
    const data = notification.request.content.data;
    const notifData = data as unknown as NotificationData;

    // Emergency alerts should always show, even in foreground
    if (notifData.type === NotificationType.EMERGENCY_ALERT) {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }

    // Other notifications can be shown based on preference
    // For now, show all notifications in foreground
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Notification Service Class
 */
class NotificationService {
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;
  private navigationCallback?: (type: NotificationType, data: any) => void;

  /**
   * Initialize notification service
   * Sets up Android channels and notification handlers
   */
  async initialize(navigationCallback?: (type: NotificationType, data: any) => void): Promise<void> {
    try {
      this.navigationCallback = navigationCallback;

      // Configure Android notification channels
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      // Set up notification listeners
      this.setupListeners();

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Configure Android notification channels
   */
  private async configureAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    for (const channel of NOTIFICATION_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        description: channel.description,
        sound: channel.sound,
        vibrationPattern: channel.vibrationPattern,
        enableLights: channel.enableLights,
        lightColor: channel.lightColor,
      });
    }

    console.log('📱 Android notification channels configured');
  }

  /**
   * Set up notification event listeners (private)
   */
  private setupListeners(): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listener for user tapping on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('👂 Notification listeners set up');
  }

  /**
   * Handle notification received in foreground
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    const notifData = data as unknown as NotificationData;
    console.log('📬 Notification received (foreground):', notifData.type);

    // You can add custom logic here, such as:
    // - Update Redux store
    // - Show in-app banner
    // - Play custom sound
    // - Update badge count
  }

  /**
   * Handle user tapping on notification
   * Navigates to appropriate screen based on notification type
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    const notifData = data as unknown as NotificationData;
    console.log('👆 Notification tapped:', notifData.type);

    if (this.navigationCallback) {
      this.navigationCallback(notifData.type, notifData.data);
    }
  }

  /**
   * Handle notification received while app is in foreground
   * Public wrapper for attaching custom handlers
   *
   * @param callback - Function called when notification is received
   * @returns Cleanup function to remove listener
   */
  onNotificationReceived(
    callback: (notification: Notifications.Notification) => void
  ): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);

    return () => {
      subscription.remove();
    };
  }

  /**
   * Handle notification tap (user tapped notification)
   * Navigate to appropriate screen based on notification data
   *
   * @param callback - Function called when notification is tapped
   * @returns Cleanup function to remove listener
   */
  onNotificationTap(
    callback: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);

    return () => {
      subscription.remove();
    };
  }

  /**
   * Set up all notification listeners
   * Returns cleanup function to remove all listeners
   *
   * @param navigation - Navigation object or callback for handling navigation
   * @returns Cleanup function
   */
  setupNotificationListeners(
    navigation: any | ((type: NotificationType, data: any) => void)
  ): () => void {
    // If navigation is a function, use it as callback
    // Otherwise, extract navigate function from navigation object
    const navigationCallback =
      typeof navigation === 'function'
        ? navigation
        : (type: NotificationType, data: any) => {
            const params = this.getNavigationParams(type, data);
            if (params && navigation?.navigate) {
              navigation.navigate(params.screen, params.params);
            }
          };

    // Initialize with navigation callback
    this.initialize(navigationCallback);

    // Return cleanup function
    return () => {
      this.cleanup();
    };
  }

  /**
   * Request notification permissions from user
   * Handles iOS and Android differences
   *
   * iOS: Requires user approval
   * Android: Granted by default (SDK 33+)
   *
   * @returns Permission status object with granted boolean and status string
   */
  async requestNotificationPermissions(): Promise<{ granted: boolean; status: string }> {
    try {
      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';

      if (granted) {
        console.log('✅ Notification permissions granted');
      } else {
        console.log('❌ Notification permissions denied');
      }

      return { granted, status: finalStatus };
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return { granted: false, status: 'denied' };
    }
  }

  /**
   * Get notification permission status
   *
   * @returns Current permission status as string
   */
  async getNotificationPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('❌ Error getting permission status:', error);
      return 'undetermined';
    }
  }

  /**
   * Check if notifications are enabled
   *
   * @returns true if notifications are granted, false otherwise
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking notifications enabled:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token (wraps FCM token)
   *
   * @returns Expo push token string or null if failed
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      // Get the Expo project ID from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.warn('⚠️ Expo project ID not configured in app.json');
        // Fallback: still try to get token without project ID (for development)
        const tokenData = await Notifications.getExpoPushTokenAsync();
        return tokenData.data;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      console.log('🔑 Expo push token obtained');

      return token;
    } catch (error) {
      console.error('❌ Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Register device for push notifications
   * Saves token to user's Firestore document
   *
   * @param userId - User's Firebase UID
   * @returns Expo push token or null if registration failed
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      // Check permissions first
      const { granted } = await this.requestNotificationPermissions();
      if (!granted) {
        console.warn('⚠️ Cannot register for push notifications without permissions');
        return null;
      }

      // Get Expo push token
      const token = await this.getExpoPushToken();

      if (token) {
        // Save token to Firestore
        await this.updateFCMToken(userId, token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Update FCM token in Firestore
   *
   * @param userId - User's Firebase UID
   * @param token - FCM token to save
   */
  async updateFCMToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        lastTokenUpdate: Timestamp.now(),
        devicePlatform: Platform.OS,
      });

      console.log('💾 FCM token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving FCM token to Firestore:', error);
      throw error;
    }
  }

  /**
   * Listen for token updates
   * Note: Expo notifications doesn't provide a direct token refresh listener,
   * but tokens rarely change. This is a placeholder for future implementation.
   *
   * @param callback - Function called when token is refreshed
   * @returns Cleanup function
   */
  onTokenRefresh(callback: (token: string) => void): () => void {
    // Token refresh handling
    // In Expo, tokens are managed automatically and rarely change
    // This is a placeholder for compatibility with the API requirements
    console.log('⚠️ Token refresh listener is not directly supported in Expo');

    // Return a no-op cleanup function
    return () => {
      console.log('Token refresh listener cleanup');
    };
  }

  /**
   * Schedule a local notification
   *
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data
   * @param trigger - When to show notification (null = immediately)
   * @returns Notification ID
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput | null
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null, // null = show immediately
      });

      console.log('📅 Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   *
   * @param notificationId - ID of notification to cancel
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('🚫 Notification cancelled:', notificationId);
    } catch (error) {
      console.error('❌ Error cancelling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🚫 All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
      throw error;
    }
  }

  /**
   * Set app badge count (iOS only)
   *
   * @param count - Badge count (0 to clear)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Notifications.setBadgeCountAsync(count);
        console.log('🔢 Badge count set to:', count);
      } else {
        console.log('ℹ️ Badge count is iOS-only feature');
      }
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  }

  /**
   * Get current badge count
   *
   * @returns Current badge count (iOS only, returns 0 on Android)
   */
  async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'ios') {
        return await Notifications.getBadgeCountAsync();
      }
      return 0;
    } catch (error) {
      console.error('❌ Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Configure notification behavior
   * Sets up notification channels and handlers
   */
  configureNotifications(): void {
    // Android notification channels are configured in initialize()
    // iOS notification settings are requested via requestNotificationPermissions()
    console.log('✅ Notification configuration complete');
  }

  /**
   * Set notification handler for foreground notifications
   * Controls whether to show notification when app is active
   */
  setNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (
        notification
      ): Promise<Notifications.NotificationBehavior> => {
        const data = notification.request.content.data;
        const notifData = data as unknown as NotificationData;

        // Emergency alerts should always show, even in foreground
        if (notifData.type === NotificationType.EMERGENCY_ALERT) {
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        }

        // Other notifications can be shown based on preference
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    console.log('✅ Notification handler configured');
  }

  /**
   * Get all scheduled notifications
   *
   * @returns Array of scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Navigate based on notification type
   * Helper method for common navigation patterns
   *
   * @param type - Notification type
   * @param data - Notification data
   * @returns Navigation parameters
   */
  getNavigationParams(
    type: NotificationType,
    data: any
  ): { screen: string; params?: any } | null {
    switch (type) {
      case NotificationType.RIDE_ASSIGNED:
        // Navigate to DD dashboard
        return {
          screen: 'DDDashboard',
          params: { rideId: (data as RideNotificationData).rideId },
        };

      case NotificationType.DD_EN_ROUTE:
        // Navigate to rider's active ride screen
        return {
          screen: 'ActiveRide',
          params: { rideId: (data as RideNotificationData).rideId },
        };

      case NotificationType.RIDE_COMPLETED:
        // Navigate to ride history
        return {
          screen: 'RideHistory',
          params: { rideId: (data as RideNotificationData).rideId },
        };

      case NotificationType.EMERGENCY_ALERT:
        // Navigate to admin dashboard with emergency flag
        return {
          screen: 'AdminDashboard',
          params: {
            emergency: true,
            rideId: (data as EmergencyNotificationData).rideId,
          },
        };

      case NotificationType.DD_ACTIVITY_WARNING:
        // Navigate to DD profile/settings
        return {
          screen: 'DDProfile',
        };

      default:
        return null;
    }
  }

  /**
   * Handle notification navigation
   * Navigate to appropriate screen based on notification type
   *
   * Notification type handlers:
   * - ride_assigned → Navigate to DD Dashboard (DD receives this)
   * - dd_enroute → Navigate to rider's active ride (Rider receives this)
   * - emergency_alert → Navigate to Admin Alerts (Admin receives this)
   * - dd_inactive_alert → Navigate to Admin Alerts (Admin receives this)
   *
   * @param data - Rally notification data
   * @param navigation - Navigation object with navigate method
   */
  handleNotificationNavigation(
    data: { type: string; rideId?: string; eventId?: string; title: string; body: string },
    navigation: any
  ): void {
    if (!navigation || !navigation.navigate) {
      console.error('❌ Navigation object is required');
      return;
    }

    const notificationType = data.type as NotificationType;
    const params = this.getNavigationParams(notificationType, data);

    if (params) {
      console.log(`📍 Navigating to ${params.screen}`, params.params);
      navigation.navigate(params.screen, params.params);
    } else {
      console.log('ℹ️ No navigation configured for notification type:', data.type);
    }
  }

  /**
   * Clean up listeners when service is no longer needed
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
    console.log('🧹 Notification service cleaned up');
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;

// Export bound methods for convenience (maintains 'this' context)
export const requestNotificationPermissions = notificationService.requestNotificationPermissions.bind(notificationService);
export const getNotificationPermissionStatus = notificationService.getNotificationPermissionStatus.bind(notificationService);
export const areNotificationsEnabled = notificationService.areNotificationsEnabled.bind(notificationService);
export const getExpoPushToken = notificationService.getExpoPushToken.bind(notificationService);
export const registerForPushNotifications = notificationService.registerForPushNotifications.bind(notificationService);
export const updateFCMToken = notificationService.updateFCMToken.bind(notificationService);
export const onTokenRefresh = notificationService.onTokenRefresh.bind(notificationService);
export const onNotificationReceived = notificationService.onNotificationReceived.bind(notificationService);
export const onNotificationTap = notificationService.onNotificationTap.bind(notificationService);
export const setupNotificationListeners = notificationService.setupNotificationListeners.bind(notificationService);
export const scheduleLocalNotification = notificationService.scheduleLocalNotification.bind(notificationService);
export const cancelScheduledNotification = notificationService.cancelScheduledNotification.bind(notificationService);
export const cancelAllScheduledNotifications = notificationService.cancelAllScheduledNotifications.bind(notificationService);
export const setBadgeCount = notificationService.setBadgeCount.bind(notificationService);
export const getBadgeCount = notificationService.getBadgeCount.bind(notificationService);
export const clearBadgeCount = notificationService.clearBadgeCount.bind(notificationService);
export const configureNotifications = notificationService.configureNotifications.bind(notificationService);
export const setNotificationHandler = notificationService.setNotificationHandler.bind(notificationService);
export const getNavigationParams = notificationService.getNavigationParams.bind(notificationService);
export const handleNotificationNavigation = notificationService.handleNotificationNavigation.bind(notificationService);
export const initialize = notificationService.initialize.bind(notificationService);
export const cleanup = notificationService.cleanup.bind(notificationService);
