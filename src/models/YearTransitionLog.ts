import { Timestamp } from 'firebase/firestore';

/**
 * Transition status enumeration
 */
export enum TransitionStatus {
  /** Year transition completed successfully */
  SUCCESS = 'success',

  /** Year transition failed completely */
  FAILED = 'failed',

  /** Year transition partially completed (some users transitioned, but errors occurred) */
  PARTIAL = 'partial',
}

/**
 * Year Transition Log model for tracking annual class year transitions
 *
 * Tracks the automatic year transition process that occurs on August 1st,
 * where seniors (classYear === 4) are removed and remaining members
 * have their class year incremented.
 *
 * Stored in Firestore collection: `yearTransitionLogs`
 */
export interface YearTransitionLog {
  /** Unique identifier for the log entry */
  id: string;

  /** Reference to the chapter where the transition occurred */
  chapterId: string;

  /** Date when the transition was executed */
  executionDate: Timestamp;

  /** Number of seniors (classYear === 4) removed during transition */
  seniorsRemoved: number;

  /** Number of users whose classYear was incremented */
  usersAdvanced: number;

  /** Status of the transition execution */
  status: TransitionStatus;

  /** Error message if the transition failed or partially succeeded */
  errorMessage?: string;

  /** Timestamp when this log entry was created */
  createdAt: Timestamp;
}

/**
 * Get display name for transition status
 */
export const getTransitionStatusDisplayName = (status: TransitionStatus): string => {
  switch (status) {
    case TransitionStatus.SUCCESS:
      return 'Success';
    case TransitionStatus.FAILED:
      return 'Failed';
    case TransitionStatus.PARTIAL:
      return 'Partial';
  }
};
