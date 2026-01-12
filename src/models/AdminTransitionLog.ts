import { Timestamp } from 'firebase/firestore';

/**
 * Admin Transition Log model for tracking admin role transfers
 *
 * This model tracks all admin role transfers for audit trail purposes.
 * Each time admin role is transferred from one user to another,
 * a log entry is created with details about both users and who performed the action.
 *
 * Stored in Firestore collection: `adminTransitionLogs`
 *
 * @example
 * ```typescript
 * const log: AdminTransitionLog = {
 *   id: generateId(),
 *   chapterId: 'chapter123',
 *   fromUserId: 'user456',
 *   fromUserName: 'John Smith',
 *   toUserId: 'user789',
 *   toUserName: 'Jane Doe',
 *   performedBy: 'user456',
 *   timestamp: Timestamp.now()
 * };
 * ```
 */
export interface AdminTransitionLog {
  /** Unique identifier for the log entry */
  id: string;

  /** Chapter where the transition occurred */
  chapterId: string;

  /** User ID of the previous admin (who lost admin role) */
  fromUserId: string;

  /** Name of the previous admin (stored for historical reference) */
  fromUserName: string;

  /** User ID of the new admin (who gained admin role) */
  toUserId: string;

  /** Name of the new admin (stored for historical reference) */
  toUserName: string;

  /** User ID of who performed the action (typically same as fromUserId, but could be different if super admin) */
  performedBy: string;

  /** When the transition occurred */
  timestamp: Timestamp;
}
