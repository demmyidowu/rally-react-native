/**
 * Designated Driver Assignment model
 *
 * Tracks DD assignments for specific events and their activity status.
 * Stored in collection: ddAssignments
 * All timestamps are ISO strings for Redux serialization
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

  /** URL to DD's photo for rider identification */
  photoURL?: string;

  /** Description of DD's car (e.g., "Blue Toyota Camry") */
  carDescription?: string;

  /** Whether the DD is currently active and accepting rides */
  isActive: boolean;

  /** Track how many times DD toggled inactive (for monitoring excessive toggling) */
  inactiveToggles?: number;

  /** Timestamp of last time DD toggled active status - ISO string */
  lastToggleAt?: string;

  /** Timestamp of last time DD became active - ISO string */
  lastActiveTimestamp?: string;

  /** Timestamp of last time DD became inactive - ISO string */
  lastInactiveTimestamp?: string;

  /** Total number of rides completed by this DD this event */
  totalRides: number;

  /** Current ride IDs assigned to this DD */
  currentRides: string[];

  /** Timestamp when the DD was assigned to the event - ISO string */
  assignedAt: string;

  /** Timestamp when the DD assignment was created - ISO string */
  createdAt: string;

  /** Timestamp when the DD assignment was last updated - ISO string */
  updatedAt: string;
}

/**
 * DDAssignment as stored in Firestore (after conversion, all timestamps are ISO strings)
 */
export interface DDAssignmentDocument {
  id?: string;
  eventId: string;
  ddId: string;
  ddName: string;
  photoURL?: string;
  carDescription?: string;
  isActive: boolean;
  inactiveToggles?: number;
  lastToggleAt?: string;
  lastActiveTimestamp?: string;
  lastInactiveTimestamp?: string;
  totalRides: number;
  currentRides: string[];
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
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
