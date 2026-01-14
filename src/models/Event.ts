import { Timestamp } from 'firebase/firestore';

/**
 * Event status enumeration
 */
export enum EventStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Event model representing fraternity/sorority events
 *
 * Stored in Firestore collection: `events`
 */
export interface Event {
  /** Unique identifier for the event */
  id: string;

  /** Name of the event */
  name: string;

  /** Reference to the chapter hosting the event */
  chapterId?: string;

  /** Date and time of the event (legacy field) */
  date?: Timestamp;

  /** Start time of the event */
  startTime?: Timestamp;

  /** End time of the event */
  endTime?: Timestamp;

  /**
   * Array of chapter IDs allowed to request rides for this event
   * @deprecated Use allowedOrganizationIds instead
   */
  allowedChapterIds?: string[];

  /**
   * Array of organization/chapter IDs allowed to request rides
   * When empty and allowAll is false, only hosting chapter can request
   */
  allowedOrganizationIds?: string[];

  /**
   * If true, anyone can request a ride from this event
   * Overrides allowedOrganizationIds
   */
  allowAll?: boolean;

  /**
   * If true, users without a Greek organization can request rides
   * Only applies when allowAll is false
   */
  allowNonGreek?: boolean;

  /** Current status of the event */
  status: EventStatus;

  /** Physical location of the event */
  location?: string;

  /** Description of the event */
  description?: string;

  /** Timestamp when the event was created */
  createdAt: Timestamp;

  /** Timestamp when the event was last updated */
  updatedAt: Timestamp;

  /** ID of the user who created this event */
  createdBy: string;

  /** IDs of designated drivers assigned to this event */
  assignedDDs?: string[];
}

/**
 * Get display name for event status
 */
export const getEventStatusDisplayName = (status: EventStatus): string => {
  switch (status) {
    case EventStatus.SCHEDULED:
      return 'Scheduled';
    case EventStatus.ACTIVE:
      return 'Active';
    case EventStatus.COMPLETED:
      return 'Completed';
    case EventStatus.CANCELLED:
      return 'Cancelled';
  }
};

/**
 * Check if event is currently active
 */
export const isEventActive = (event: Event): boolean => {
  return event.status === EventStatus.ACTIVE;
};

/**
 * EventDocument represents the Firestore document structure
 * Made flexible to match eventsSlice usage
 */
export interface EventDocument {
  id?: string;
  name: string;
  chapterId?: string;
  description?: string;
  date?: Timestamp;
  allowedChapterIds?: string[];
  allowedOrganizationIds?: string[];
  allowAll?: boolean;
  allowNonGreek?: boolean;
  status: EventStatus;
  location?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  assignedDDs?: string[];
}

/**
 * CreateEventRequest for creating a new event
 */
export interface CreateEventRequest {
  name: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date;
  assignedDDs?: string[];
}
