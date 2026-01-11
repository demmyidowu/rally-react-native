import { GeoPoint, Timestamp } from 'firebase/firestore';

/**
 * Ride status enumeration
 */
export enum RideStatus {
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  ENROUTE = 'enroute',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Ride model representing ride requests
 *
 * Stored in Firestore collection: `rides`
 */
export interface Ride {
  /** Unique identifier for the ride */
  id: string;

  /** ID of the user requesting the ride */
  riderId: string;

  /** ID of the designated driver assigned to this ride */
  ddId?: string;

  /** Reference to the chapter */
  chapterId: string;

  /** Reference to the event */
  eventId: string;

  /** Pickup location using Firebase GeoPoint for geolocation queries */
  pickupLocation: GeoPoint;

  /** Human-readable pickup address */
  pickupAddress: string;

  /** Human-readable dropoff address */
  dropoffAddress?: string;

  /** Current status of the ride */
  status: RideStatus;

  /**
   * Priority score for queue ordering
   * Algorithm: (classYear × 10) + (waitTime × 0.5), or 9999 for emergency
   */
  priority: number;

  /** Whether this is an emergency ride (sets priority to 9999) */
  isEmergency: boolean;

  /** Estimated wait time in minutes until DD arrives */
  estimatedWaitTime?: number;

  /** Overall position in queue across all DDs */
  queuePosition?: number;

  /** Timestamp when the ride was requested */
  requestedAt: Timestamp;

  /** Timestamp when the ride was assigned to a DD */
  assignedAt?: Timestamp;

  /** Timestamp when the DD marked themselves as en route */
  enrouteAt?: Timestamp;

  /** Timestamp when the ride was completed */
  completedAt?: Timestamp;

  /** Timestamp when the ride was cancelled */
  cancelledAt?: Timestamp;

  /** Reason for cancellation if applicable */
  cancellationReason?: string;

  /** Additional notes about the ride */
  notes?: string;
}

/**
 * Get display name for ride status
 */
export const getRideStatusDisplayName = (status: RideStatus): string => {
  switch (status) {
    case RideStatus.QUEUED:
      return 'Queued';
    case RideStatus.ASSIGNED:
      return 'Assigned';
    case RideStatus.ENROUTE:
      return 'En Route';
    case RideStatus.COMPLETED:
      return 'Completed';
    case RideStatus.CANCELLED:
      return 'Cancelled';
  }
};
