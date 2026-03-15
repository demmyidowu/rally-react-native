/**
 * Alert type enumeration for different types of admin notifications
 */
export enum AlertType {
  /** Emergency button was pressed by a rider */
  EMERGENCY_RIDE = 'emergency_request',

  /** DD toggled inactive excessively or was inactive too long */
  DD_INACTIVE = 'dd_inactive',

  /** Year transition completed */
  YEAR_TRANSITION = 'year_transition',

  /** System-level errors requiring admin attention */
  SYSTEM_ERROR = 'system_error',

  /** DD flagged an emergency ride as non-emergency; penalty already applied */
  DD_ABUSE_REPORT = 'dd_abuse_report',
}

/**
 * Admin Alert model for notifying admins of important events
 *
 * Stored in Firestore collection: `adminAlerts`
 * All timestamps are ISO strings for Redux serialization
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

  /** Firebase UID of the rider who triggered an emergency ride */
  riderId?: string;

  /** True once an emergency abuse penalty has been applied — prevents double-penalty */
  abusePenaltyApplied?: boolean;

  /** Whether the alert has been read/acknowledged by an admin */
  isRead: boolean;

  /** Timestamp when the alert was created - ISO string */
  createdAt: string;
}

/**
 * Get display name for alert type
 */
export const getAlertTypeDisplayName = (type: AlertType): string => {
  switch (type) {
    case AlertType.EMERGENCY_RIDE:
      return 'Emergency Ride';
    case AlertType.DD_INACTIVE:
      return 'DD Inactive';
    case AlertType.YEAR_TRANSITION:
      return 'Year Transition';
    case AlertType.SYSTEM_ERROR:
      return 'System Error';
    case AlertType.DD_ABUSE_REPORT:
      return 'Abuse Report';
  }
};
