import { Timestamp } from 'firebase/firestore';

/**
 * Chapter model representing fraternity/sorority chapters
 *
 * Stored in Firestore collection: `chapters`
 */
export interface Chapter {
  /** Unique identifier for the chapter */
  id: string;

  /** Name of the chapter (e.g., "Sigma Chi") */
  name: string;

  /** University identifier (e.g., "ksu" for Kansas State University) */
  universityId: string;

  /** Unique invite code for members to join the chapter */
  inviteCode: string;

  /**
   * Date when annual year transition occurs
   * Default: August 1st - triggers senior removal and class year advancement
   */
  yearTransitionDate: Timestamp;

  /** Timestamp when the chapter was created */
  createdAt: Timestamp;

  /** Timestamp when the chapter was last updated */
  updatedAt: Timestamp;
}
