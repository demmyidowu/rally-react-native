/**
 * Notification Service Tests
 *
 * Unit tests for the notification service.
 * These tests verify permission handling, token management,
 * and notification scheduling functionality.
 */

import notificationService from '../src/services/notificationService';
import * as Notifications from 'expo-notifications';
import { NotificationType } from '../src/types/notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  AndroidNotificationPriority: {
    HIGH: 'high',
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock Firebase
jest.mock('../src/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNotificationPermissions', () => {
    it('should return granted: true when permissions are already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should request permissions when not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result.granted).toBe(true);
      expect(result.status).toBe('granted');
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return granted: false when permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await notificationService.requestNotificationPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });

    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission request failed')
      );

      const result = await notificationService.requestNotificationPermissions();

      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });
  });

  describe('registerForPushNotifications', () => {
    const testUserId = 'test-user-id';

    it('should return null if permissions are denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const token = await notificationService.registerForPushNotifications(testUserId);

      expect(token).toBeNull();
    });

    it('should return token when permissions are granted', async () => {
      const mockToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      const token = await notificationService.registerForPushNotifications(testUserId);

      expect(token).toBe(mockToken);
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    });

    it('should handle token retrieval errors', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Failed to get token')
      );

      const token = await notificationService.registerForPushNotifications(testUserId);

      expect(token).toBeNull();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a notification and return ID', async () => {
      const mockId = 'notification-123';

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);

      const id = await notificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { type: NotificationType.GENERAL }
      );

      expect(id).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { type: NotificationType.GENERAL },
          sound: 'default',
          priority: 'high',
        },
        trigger: null,
      });
    });

    it('should schedule notification with custom trigger', async () => {
      const mockId = 'notification-456';
      const trigger = { type: 'timeInterval' as const, seconds: 60, repeats: false };

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);

      const id = await notificationService.scheduleLocalNotification(
        'Delayed Notification',
        'This appears in 60 seconds',
        {},
        trigger
      );

      expect(id).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Delayed Notification',
          body: 'This appears in 60 seconds',
          data: {},
          sound: 'default',
          priority: 'high',
        },
        trigger,
      });
    });
  });

  describe('setBadgeCount', () => {
    it('should set badge count', async () => {
      await notificationService.setBadgeCount(5);

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should clear badge when count is 0', async () => {
      await notificationService.setBadgeCount(0);

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('cancelScheduledNotification', () => {
    it('should cancel specific notification', async () => {
      const notificationId = 'notification-123';

      await notificationService.cancelScheduledNotification(notificationId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        notificationId
      );
    });
  });

  describe('cancelAllScheduledNotifications', () => {
    it('should cancel all scheduled notifications', async () => {
      await notificationService.cancelAllScheduledNotifications();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('getNavigationParams', () => {
    it('should return correct params for RIDE_ASSIGNED', () => {
      const params = notificationService.getNavigationParams(
        NotificationType.RIDE_ASSIGNED,
        { rideId: 'ride123' }
      );

      expect(params).toEqual({
        screen: 'DDDashboard',
        params: { rideId: 'ride123' },
      });
    });

    it('should return correct params for DD_EN_ROUTE', () => {
      const params = notificationService.getNavigationParams(
        NotificationType.DD_EN_ROUTE,
        { rideId: 'ride456' }
      );

      expect(params).toEqual({
        screen: 'ActiveRide',
        params: { rideId: 'ride456' },
      });
    });

    it('should return correct params for EMERGENCY_ALERT', () => {
      const params = notificationService.getNavigationParams(
        NotificationType.EMERGENCY_ALERT,
        { rideId: 'ride789', riderId: 'rider123' }
      );

      expect(params).toEqual({
        screen: 'AdminDashboard',
        params: { emergency: true, rideId: 'ride789' },
      });
    });

    it('should return null for unknown notification type', () => {
      const params = notificationService.getNavigationParams(
        'UNKNOWN_TYPE' as NotificationType,
        {}
      );

      expect(params).toBeNull();
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('should return current permission status', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const status = await notificationService.getNotificationPermissionStatus();

      expect(status).toBe('granted');
    });
  });

  describe('getScheduledNotifications', () => {
    it('should return list of scheduled notifications', async () => {
      const mockNotifications = [
        { identifier: 'notif-1', content: { title: 'Test 1' } },
        { identifier: 'notif-2', content: { title: 'Test 2' } },
      ];

      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      const notifications = await notificationService.getScheduledNotifications();

      expect(notifications).toEqual(mockNotifications);
      expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValue(
        new Error('Failed to get notifications')
      );

      const notifications = await notificationService.getScheduledNotifications();

      expect(notifications).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should remove notification listeners', () => {
      // Mock subscription objects
      const mockReceivedSubscription = { remove: jest.fn() };
      const mockResponseSubscription = { remove: jest.fn() };

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockReceivedSubscription
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseSubscription
      );

      // Initialize to create listeners
      notificationService.initialize();

      // Cleanup
      notificationService.cleanup();

      // Service calls .remove() on each subscription
      expect(mockReceivedSubscription.remove).toHaveBeenCalled();
      expect(mockResponseSubscription.remove).toHaveBeenCalled();
    });
  });
});
