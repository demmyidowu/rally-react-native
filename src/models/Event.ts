import { EARLY_ACCESS_MS } from '../constants/events';

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

  /** Date and time of the event (legacy field) - ISO string */
  date?: string;

  /** Start time of the event - ISO string */
  startTime?: string;

  /** End time of the event - ISO string */
  endTime?: string;

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

  /** Timestamp when the event was created - ISO string */
  createdAt: string;

  /** Timestamp when the event was last updated - ISO string */
  updatedAt: string;

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
 * Check if event is in the early access period
 *
 * Early access is 2.5 hours before the event starts.
 * During this time, only the hosting chapter can request rides.
 */
export const isEventInEarlyAccess = (event: Event): boolean => {
  if (!event.startTime || event.status !== EventStatus.SCHEDULED) return false;
  const now = new Date();
  const startTime = new Date(event.startTime);
  const earlyAccessStart = new Date(startTime.getTime() - EARLY_ACCESS_MS);
  return now >= earlyAccessStart && now < startTime;
};

/**
 * Check if user has access to an event
 *
 * For ACTIVE events: Uses normal access rules (allowAll, allowedOrganizationIds, etc.)
 * For SCHEDULED events in early access: Only hosting chapter has access
 */
export const canUserAccessEvent = (
  event: Event,
  userChapterId?: string
): boolean => {
  // During early access, only hosting chapter can access
  if (isEventInEarlyAccess(event)) {
    return userChapterId !== undefined && event.chapterId === userChapterId;
  }

  // For active events, use normal access rules
  if (event.status !== EventStatus.ACTIVE) return false;

  // If allowAll is true, everyone can access
  if (event.allowAll) return true;

  // If user has no chapter and allowNonGreek is true
  if (!userChapterId && event.allowNonGreek) return true;

  // If user's chapter is the hosting chapter
  if (userChapterId && event.chapterId === userChapterId) return true;

  // If user's chapter is in allowedOrganizationIds
  if (userChapterId && event.allowedOrganizationIds?.includes(userChapterId)) return true;

  return false;
};

/**
 * EventDocument represents the Firestore document structure
 * Made flexible to match eventsSlice usage
 * All timestamps are ISO strings after conversion
 */
export interface EventDocument {
  id?: string;
  name: string;
  chapterId?: string;
  description?: string;
  date?: string;
  allowedChapterIds?: string[];
  allowedOrganizationIds?: string[];
  allowAll?: boolean;
  allowNonGreek?: boolean;
  status: EventStatus;
  location?: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
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
