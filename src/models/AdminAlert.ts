import { Timestamp } from 'firebase/firestore';

/**
 * Alert type enumeration for different types of admin notifications
 */
export enum AlertType {
  /** DD toggled inactive more than 5 times in 30 minutes */
  DD_INACTIVE_TOGGLE = 'dd_inactive_toggle',

  /** DD has been inactive for more than 15 minutes during their shift */
  DD_PROLONGED_INACTIVE = 'dd_prolonged_inactive',

  /** Emergency button was pressed by a rider */
  EMERGENCY_RIDE = 'emergency_ride',

  /** System-level errors requiring admin attention */
  SYSTEM_ERROR = 'system_error',
}

/**
 * Admin Alert model for notifying admins of important events
 *
 * Stored in Firestore collection: `adminAlerts`
 */
export interface AdminAlert {
  /** Unique identifier for the alert */
  id: string;

  /** Reference to the chapter this alert belongs to */
  chapterId: string;

  /** Type of alert */
  type: AlertType;

  /** Human-readable message describing the alert */
  message: string;

  /** ID of the DD related to this alert (for DD-specific alerts) */
  ddId?: string;

  /** ID of the ride related to this alert (for ride-specific alerts) */
  rideId?: string;

  /** Whether the alert has been read/acknowledged by an admin */
  isRead: boolean;

  /** Timestamp when the alert was created */
  createdAt: Timestamp;
}

/**
 * Get display name for alert type
 */
export const getAlertTypeDisplayName = (type: AlertType): string => {
  switch (type) {
    case AlertType.DD_INACTIVE_TOGGLE:
      return 'DD Inactive Toggle';
    case AlertType.DD_PROLONGED_INACTIVE:
      return 'DD Prolonged Inactive';
    case AlertType.EMERGENCY_RIDE:
      return 'Emergency Ride';
    case AlertType.SYSTEM_ERROR:
      return 'System Error';
  }
};
