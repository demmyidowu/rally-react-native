/**
 * Chapter model representing fraternity/sorority chapters
 *
 * Stored in Firestore collection: `chapters`
 * All timestamps are ISO strings for Redux serialization
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
   * Date when annual year transition occurs - ISO string
   * Default: August 1st - triggers senior removal and class year advancement
   */
  yearTransitionDate: string;

  /** Timestamp when the chapter was created - ISO string */
  createdAt: string;

  /** Timestamp when the chapter was last updated - ISO string */
  updatedAt: string;
}
