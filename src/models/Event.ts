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
  chapterId: string;

  /** Date and time of the event */
  date: Timestamp;

  /**
   * Array of chapter IDs allowed to request rides for this event
   * Use ["ALL"] for events open to all chapters (cross-chapter events)
   */
  allowedChapterIds: string[];

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
