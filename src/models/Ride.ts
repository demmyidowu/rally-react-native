import { GeoPoint } from 'firebase/firestore';

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
 * All timestamps are ISO strings for Redux serialization
 */
export interface Ride {
  /** Unique identifier for the ride */
  id: string;

  /** ID of the user requesting the ride */
  riderId: string;

  /** Name of the rider */
  riderName?: string;

  /** ID of the designated driver assigned to this ride */
  ddId?: string;

  /** Name of the designated driver */
  ddName?: string;

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

  /** Timestamp when the ride was requested - ISO string */
  requestedAt: string;

  /** Timestamp when the ride was assigned to a DD - ISO string */
  assignedAt?: string;

  /** Timestamp when the DD marked themselves as en route - ISO string */
  enrouteAt?: string;

  /** Timestamp when the DD arrived at pickup location - ISO string */
  arrivedAt?: string;

  /** Timestamp when the ride was completed - ISO string */
  completedAt?: string;

  /** Timestamp when the ride was cancelled - ISO string */
  cancelledAt?: string;

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
 * All timestamps are ISO strings after conversion
 */
export interface RideDocument {
  id?: string;
  riderId: string;
  riderName?: string;
  ddId?: string;
  ddName?: string;
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
  requestedAt: string;
  assignedAt?: string;
  enRouteAt?: string;
  arrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
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

