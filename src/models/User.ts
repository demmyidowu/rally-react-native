import { Timestamp } from 'firebase/firestore';

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

  /** Phone number in E.164 format: +15551234567 */
  phoneNumber: string;

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

  /** Timestamp when the user was created */
  createdAt: Timestamp;

  /** Timestamp when the user was last updated */
  updatedAt: Timestamp;
}

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

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 1, it's already formatted
  if (digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Add US country code
  return `+1${digits}`;
};

/**
 * Validate phone number format (E.164)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone);
  return formatted.startsWith('+1') && formatted.length === 12;
};
