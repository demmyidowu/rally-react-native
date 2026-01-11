/**
 * Notification Types and Interfaces
 *
 * Defines the structure of push notifications used in the Rally app.
 * These types align with notifications sent from Cloud Functions.
 */

/**
 * Notification categories that determine the app's response
 */
export enum NotificationType {
  RIDE_ASSIGNED = 'ride_assigned',
  DD_EN_ROUTE = 'dd_en_route',
  RIDE_COMPLETED = 'ride_completed',
  EMERGENCY_ALERT = 'emergency_alert',
  DD_ACTIVITY_WARNING = 'dd_activity_warning',
  YEAR_TRANSITION = 'year_transition',
  GENERAL = 'general',
}

/**
 * Data payload for ride-related notifications
 */
export interface RideNotificationData {
  rideId: string;
  riderId?: string;
  ddId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  eta?: number; // in minutes
  isEmergency?: boolean;
}

/**
 * Data payload for emergency alerts
 */
export interface EmergencyNotificationData {
  rideId: string;
  riderId: string;
  riderName: string;
  location: string;
  timestamp: string;
}

/**
 * Data payload for DD activity warnings
 */
export interface ActivityWarningData {
  ddId: string;
  inactiveCount: number;
  warningLevel: 'first' | 'second' | 'final';
}

/**
 * Generic notification data structure
 */
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: RideNotificationData | EmergencyNotificationData | ActivityWarningData | Record<string, any>;
}

/**
 * Notification permission status
 */
export enum NotificationPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  UNDETERMINED = 'undetermined',
}

/**
 * Configuration for notification channels (Android)
 */
export interface NotificationChannel {
  id: string;
  name: string;
  importance: number;
  description?: string;
  sound?: string;
  vibrationPattern?: number[];
  enableLights?: boolean;
  lightColor?: string;
}
