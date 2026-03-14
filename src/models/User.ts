/**
 * User role enumeration
 */
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * User model representing app users (admins and members)
 *
 * Stored in Firestore collection: `users`
 */
export interface User {
  /** Unique identifier for the user */
  id: string;

  /** Full name of the user */
  name: string;

  /** Email address - Must be .edu domain */
  email: string;

  /** Reference to the user's university */
  universityId?: string;

  /** Reference to the user's chapter */
  chapterId?: string;

  /** User's role in the system */
  role: UserRole;

  /**
   * Class year for priority calculation
   * 4 = senior, 3 = junior, 2 = sophomore, 1 = freshman
   */
  classYear: number;

  /** Whether the user's email has been verified */
  isEmailVerified: boolean;

  /** True if user used admin code during signup */
  selfRegisteredAdmin?: boolean;

  /** Firebase Cloud Messaging token for push notifications */
  fcmToken?: string;

  /** Whether push notifications are enabled for this user (default true) */
  notificationsEnabled?: boolean;

  /** Whether the user has completed the onboarding walkthrough */
  onboardingComplete?: boolean;

  // DD-specific fields
  /** Car color (required for DDs before going active) */
  carColor?: string;

  /** Car make e.g. "Volkswagen" (required for DDs before going active) */
  carMake?: string;

  /** Car model e.g. "Jetta" (required for DDs before going active) */
  carModel?: string;

  /** Whether the DD is currently active and accepting rides */
  isActive?: boolean;

  /** Total number of rides completed by this DD */
  totalRidesCompleted?: number;

  /**
   * Priority penalty applied to next ride request (negative value)
   * Applied when rider cancels a ride after DD has arrived
   * Cleared after being applied to one ride request
   */
  nextRidePenalty?: number;

  /** Timestamp when the user was created (ISO string) */
  createdAt: string;

  /** Timestamp when the user was last updated (ISO string) */
  updatedAt: string;
}

/**
 * Check if DD has complete car info required to go active
 */
export const hasCompleteCarInfo = (user: User): boolean => {
  return !!(user.carColor && user.carMake && user.carModel);
};

/**
 * Format car description for display
 * @returns e.g. "Blue Volkswagen Jetta"
 */
export const formatCarDescription = (user: User): string => {
  if (!hasCompleteCarInfo(user)) {
    return 'Unknown vehicle';
  }
  return `${user.carColor} ${user.carMake} ${user.carModel}`;
};

/**
 * Utility function to validate .edu email domain
 */
export const isEduEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('.edu');
};

/**
 * @deprecated Use isEduEmail instead
 */
export const isKSUEmail = isEduEmail;

/**
 * Get display name for user role
 */
export const getUserRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.MEMBER:
      return 'Member';
  }
};

