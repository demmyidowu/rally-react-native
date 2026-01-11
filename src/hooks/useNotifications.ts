/**
 * useNotifications Hook
 *
 * React hook for managing push notifications in components.
 * Provides easy access to notification service functionality.
 *
 * Usage:
 * ```tsx
 * const { requestPermissions, registerForPush, permissionStatus } = useNotifications();
 *
 * useEffect(() => {
 *   registerForPush(userId);
 * }, [userId]);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { NotificationPermissionStatus, NotificationType } from '../types/notifications';

interface UseNotificationsReturn {
  permissionStatus: NotificationPermissionStatus;
  isLoading: boolean;
  error: string | null;
  requestPermissions: () => Promise<NotificationPermissionStatus>;
  registerForPush: (userId: string) => Promise<string | null>;
  scheduleNotification: (title: string, body: string, data?: Record<string, any>) => Promise<string>;
  setBadgeCount: (count: number) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

/**
 * Hook for managing notifications
 *
 * @param autoInitialize - Automatically initialize notification service on mount
 * @param navigationCallback - Callback for handling notification navigation
 * @returns Notification service methods and state
 */
export const useNotifications = (
  autoInitialize: boolean = true,
  navigationCallback?: (type: NotificationType, data: any) => void
): UseNotificationsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    NotificationPermissionStatus.UNDETERMINED
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize notification service
   */
  useEffect(() => {
    if (autoInitialize) {
      const init = async () => {
        try {
          await notificationService.initialize(navigationCallback);
          const status = await notificationService.getPermissionStatus();
          setPermissionStatus(status);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to initialize notifications');
          console.error('Failed to initialize notifications:', err);
        }
      };

      init();

      // Cleanup on unmount
      return () => {
        notificationService.cleanup();
      };
    }
  }, [autoInitialize, navigationCallback]);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<NotificationPermissionStatus> => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await notificationService.requestPermissions();
      setPermissionStatus(status);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permissions';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register for push notifications and save token to Firestore
   */
  const registerForPush = useCallback(async (userId: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await notificationService.completeRegistration(userId);
      return token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register for push notifications';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Schedule a local notification
   */
  const scheduleNotification = useCallback(
    async (title: string, body: string, data?: Record<string, any>): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const notificationId = await notificationService.scheduleLocalNotification(title, body, data);
        return notificationId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to schedule notification';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Set app icon badge count
   */
  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    try {
      await notificationService.setBadgeCount(count);
    } catch (err) {
      console.error('Failed to set badge count:', err);
    }
  }, []);

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    try {
      await notificationService.cancelAllNotifications();
    } catch (err) {
      console.error('Failed to cancel notifications:', err);
    }
  }, []);

  return {
    permissionStatus,
    isLoading,
    error,
    requestPermissions,
    registerForPush,
    scheduleNotification,
    setBadgeCount,
    cancelAllNotifications,
  };
};

export default useNotifications;
