import { Timestamp } from 'firebase/firestore';

/**
 * Designated Driver Assignment model
 *
 * Tracks DD assignments for specific events and their activity status.
 * Stored as subcollection: events/{eventId}/ddAssignments/{userId}
 */
export interface DDAssignment {
  /** Unique identifier (same as userId) */
  id: string;

  /** Reference to the user who is the DD */
  userId: string;

  /** Reference to the event */
  eventId: string;

  /** URL to DD's photo for rider identification */
  photoURL?: string;

  /** Description of DD's car (e.g., "Blue Toyota Camry") */
  carDescription?: string;

  /** Whether the DD is currently active and accepting rides */
  isActive: boolean;

  /** Track how many times DD toggled inactive (for monitoring excessive toggling) */
  inactiveToggles: number;

  /** Timestamp of last time DD became active */
  lastActiveTimestamp?: Timestamp;

  /** Timestamp of last time DD became inactive */
  lastInactiveTimestamp?: Timestamp;

  /** Total number of rides completed by this DD */
  totalRidesCompleted: number;

  /** Timestamp when the DD assignment was created */
  createdAt: Timestamp;

  /** Timestamp when the DD assignment was last updated */
  updatedAt: Timestamp;
}
