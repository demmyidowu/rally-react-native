import { Timestamp } from 'firebase/firestore';

/**
 * Designated Driver Assignment model
 *
 * Tracks DD assignments for specific events and their activity status.
 * Stored in collection: ddAssignments
 */
export interface DDAssignment {
  /** Unique identifier */
  id: string;

  /** Reference to the event */
  eventId: string;

  /** Reference to the user who is the DD */
  ddId: string;

  /** DD's display name */
  ddName: string;

  /** DD's phone number */
  ddPhone: string;

  /** URL to DD's photo for rider identification */
  photoURL?: string;

  /** Description of DD's car (e.g., "Blue Toyota Camry") */
  carDescription?: string;

  /** Whether the DD is currently active and accepting rides */
  isActive: boolean;

  /** Track how many times DD toggled inactive (for monitoring excessive toggling) */
  inactiveToggles?: number;

  /** Timestamp of last time DD toggled active status */
  lastToggleAt?: Date;

  /** Timestamp of last time DD became active */
  lastActiveTimestamp?: Date;

  /** Timestamp of last time DD became inactive */
  lastInactiveTimestamp?: Date;

  /** Total number of rides completed by this DD this event */
  totalRides: number;

  /** Current ride IDs assigned to this DD */
  currentRides: string[];

  /** Timestamp when the DD was assigned to the event */
  assignedAt: Date;

  /** Timestamp when the DD assignment was created */
  createdAt: Date;

  /** Timestamp when the DD assignment was last updated */
  updatedAt: Date;
}

/**
 * DDAssignment as stored in Firestore (with Timestamps instead of Dates)
 */
export interface DDAssignmentDocument {
  id?: string;
  eventId: string;
  ddId: string;
  ddName: string;
  ddPhone: string;
  photoURL?: string;
  carDescription?: string;
  isActive: boolean;
  inactiveToggles?: number;
  lastToggleAt?: Timestamp;
  lastActiveTimestamp?: Timestamp;
  lastInactiveTimestamp?: Timestamp;
  totalRides: number;
  currentRides: string[];
  assignedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Computed statistics for a DD
 */
export interface DDAssignmentStats {
  ddId: string;
  ddName: string;
  totalRides: number;
  currentRides: number;
  estimatedWaitMinutes: number;
  isActive: boolean;
}

