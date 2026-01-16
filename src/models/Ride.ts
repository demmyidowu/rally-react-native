import { GeoPoint, Timestamp } from 'firebase/firestore';

/**
 * Ride status enumeration
 */
export enum RideStatus {
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  ENROUTE = 'enroute',
  ARRIVED = 'arrived',
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

  /** Name of the rider */
  riderName?: string;

  /** Phone number of the rider */
  riderPhone?: string;

  /** ID of the designated driver assigned to this ride */
  ddId?: string;

  /** Name of the designated driver */
  ddName?: string;

  /** Phone number of the designated driver */
  ddPhone?: string;

  /** Reference to the chapter (optional for new signups without chapter) */
  chapterId?: string;

  /** Reference to the event (optional for non-event rides) */
  eventId?: string;

  /** Pickup location using Firebase GeoPoint for geolocation queries */
  pickupLocation: GeoPoint;

  /** Human-readable pickup address */
  pickupAddress?: string;

  /** Dropoff location */
  dropoffLocation?: GeoPoint;

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

  /** Timestamp when the DD arrived at pickup location */
  arrivedAt?: Timestamp;

  /** Timestamp when the ride was completed */
  completedAt?: Timestamp;

  /** Timestamp when the ride was cancelled */
  cancelledAt?: Timestamp;

  /** Reason for cancellation if applicable */
  cancellationReason?: string;

  /** Number of passengers for this ride */
  passengerCount?: number;

  /** DD's car description for rider identification */
  ddCarDescription?: string;

  /** Estimated ETA for DD arrival */
  estimatedETA?: number;

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
      return 'On the Way';
    case RideStatus.ARRIVED:
      return 'Arrived';
    case RideStatus.COMPLETED:
      return 'Completed';
    case RideStatus.CANCELLED:
      return 'Cancelled';
  }
};

/**
 * RideDocument represents the Firestore document structure used by slices
 * Uses flexible types to support both Firestore SDK and converted data
 */
export interface RideDocument {
  id?: string;
  riderId: string;
  riderName?: string;
  riderPhone?: string;
  ddId?: string;
  ddName?: string;
  ddPhone?: string;
  chapterId?: string;
  eventId?: string;
  pickupLocation: GeoPoint;
  pickupAddress?: string;
  dropoffLocation?: GeoPoint;
  dropoffAddress?: string;
  status: RideStatus;
  priority: number;
  isEmergency: boolean;
  estimatedWaitTime?: number;
  queuePosition?: number;
  requestedAt: Timestamp;
  assignedAt?: Timestamp;
  enRouteAt?: Timestamp;
  arrivedAt?: Timestamp;
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  notes?: string;
}

/**
 * RideRequest for creating a new ride
 */
export interface RideRequest {
  riderId: string;
  pickupLocation: GeoPoint;
  pickupAddress?: string;
  dropoffLocation?: GeoPoint;
  dropoffAddress?: string;
  isEmergency: boolean;
  notes?: string;
}

