/**
 * Notification Service
 *
 * Manages push notifications for the Rally app using expo-notifications.
 * Handles permission requests, FCM token management, notification handlers,
 * and navigation based on notification type.
 *
 * Features:
 * - Request and manage notification permissions (iOS & Android)
 * - Register for push notifications and get FCM token
 * - Handle received notifications (foreground)
 * - Handle notification taps (background/terminated)
 * - Save FCM token to Firestore
 * - Configure notification channels (Android)
 * - Local notifications support
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
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
  handleNotification: async (notification) => {
    const data = notification.request.content.data as NotificationData;

    // Emergency alerts should always show, even in foreground
    if (data.type === NotificationType.EMERGENCY_ALERT) {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    }

    // Other notifications can be shown based on preference
    // For now, show all notifications in foreground
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
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
      this.setupNotificationListeners();

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
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
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
    const data = notification.request.content.data as NotificationData;
    console.log('📬 Notification received (foreground):', data.type);

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
    const data = response.notification.request.content.data as NotificationData;
    console.log('👆 Notification tapped:', data.type);

    if (this.navigationCallback) {
      this.navigationCallback(data.type, data.data);
    }
  }

  /**
   * Request notification permissions from user
   * Handles iOS and Android differences
   *
   * @returns Permission status
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Notifications require a physical device');
        return NotificationPermissionStatus.DENIED;
      }

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
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      // Map expo status to our enum
      if (finalStatus === 'granted') {
        console.log('✅ Notification permissions granted');
        return NotificationPermissionStatus.GRANTED;
      } else if (finalStatus === 'denied') {
        console.log('❌ Notification permissions denied');
        return NotificationPermissionStatus.DENIED;
      } else {
        return NotificationPermissionStatus.UNDETERMINED;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return NotificationPermissionStatus.DENIED;
    }
  }

  /**
   * Register for push notifications and get FCM token
   *
   * @returns FCM token or null if registration failed
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check permissions first
      const permissionStatus = await this.requestPermissions();
      if (permissionStatus !== NotificationPermissionStatus.GRANTED) {
        console.warn('⚠️ Cannot register for push notifications without permissions');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your Expo project ID
      });

      const token = tokenData.data;
      console.log('🔑 FCM token obtained:', token);

      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Get device push token (for FCM)
   * Alternative method for getting the device token directly
   *
   * @returns Device push token
   */
  async getDevicePushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        const token = await Notifications.getDevicePushTokenAsync();
        return token.data;
      } else if (Platform.OS === 'ios') {
        const token = await Notifications.getDevicePushTokenAsync();
        return token.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting device push token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to user's Firestore document
   *
   * @param userId - User's Firebase UID
   * @param token - FCM token to save
   */
  async saveTokenToFirestore(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        lastTokenUpdate: new Date(),
        devicePlatform: Platform.OS,
      });

      console.log('💾 FCM token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving FCM token to Firestore:', error);
      throw error;
    }
  }

  /**
   * Complete registration flow: get token and save to Firestore
   *
   * @param userId - User's Firebase UID
   * @returns FCM token or null
   */
  async completeRegistration(userId: string): Promise<string | null> {
    try {
      const token = await this.registerForPushNotifications();

      if (token) {
        await this.saveTokenToFirestore(userId, token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('❌ Error completing notification registration:', error);
      return null;
    }
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
   * Cancel a scheduled notification
   *
   * @param notificationId - ID of notification to cancel
   */
  async cancelNotification(notificationId: string): Promise<void> {
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
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🚫 All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling all notifications:', error);
      throw error;
    }
  }

  /**
   * Set app icon badge count (iOS)
   *
   * @param count - Badge count (0 to clear)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('🔢 Badge count set to:', count);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
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
   * Check current permission status
   *
   * @returns Current permission status
   */
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status === 'granted') {
        return NotificationPermissionStatus.GRANTED;
      } else if (status === 'denied') {
        return NotificationPermissionStatus.DENIED;
      } else {
        return NotificationPermissionStatus.UNDETERMINED;
      }
    } catch (error) {
      console.error('❌ Error getting permission status:', error);
      return NotificationPermissionStatus.UNDETERMINED;
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
   * Clean up listeners when service is no longer needed
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    console.log('🧹 Notification service cleaned up');
  }
}

// Export singleton instance
export default new NotificationService();
