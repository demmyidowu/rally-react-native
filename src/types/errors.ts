/**
 * Custom Error Types for Rally App
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Authentication Errors
 */
export class AuthError extends AppError {
  static EMAIL_NOT_KSU = new AuthError(
    'Must use K-State email address (@ksu.edu)',
    'EMAIL_NOT_KSU'
  );

  static EMAIL_NOT_VERIFIED = new AuthError(
    'Please verify your K-State email before continuing',
    'EMAIL_NOT_VERIFIED'
  );

  static INVALID_PHONE_NUMBER = new AuthError(
    'Invalid phone number format. Must be 10 digits.',
    'INVALID_PHONE_NUMBER'
  );

  static USER_NOT_FOUND = new AuthError(
    'User account not found',
    'USER_NOT_FOUND'
  );

  static WRONG_PASSWORD = new AuthError(
    'Incorrect password',
    'WRONG_PASSWORD'
  );

  static EMAIL_ALREADY_IN_USE = new AuthError(
    'This email is already registered',
    'EMAIL_ALREADY_IN_USE'
  );

  static WEAK_PASSWORD = new AuthError(
    'Password must be at least 8 characters',
    'WEAK_PASSWORD'
  );

  static PASSWORD_TOO_SHORT = new AuthError(
    'Password must be at least 8 characters',
    'PASSWORD_TOO_SHORT'
  );

  static PASSWORD_NEEDS_UPPERCASE = new AuthError(
    'Password must contain at least one uppercase letter',
    'PASSWORD_NEEDS_UPPERCASE'
  );

  static PASSWORD_NEEDS_LOWERCASE = new AuthError(
    'Password must contain at least one lowercase letter',
    'PASSWORD_NEEDS_LOWERCASE'
  );

  static PASSWORD_NEEDS_NUMBER = new AuthError(
    'Password must contain at least one number',
    'PASSWORD_NEEDS_NUMBER'
  );

  static INVALID_EMAIL = new AuthError(
    'Invalid email format',
    'INVALID_EMAIL'
  );

  static TOO_MANY_REQUESTS = new AuthError(
    'Too many attempts. Please try again later.',
    'TOO_MANY_REQUESTS'
  );

  static NETWORK_ERROR = new AuthError(
    'Network error. Please check your connection.',
    'NETWORK_ERROR'
  );

  static NOT_AUTHENTICATED = new AuthError(
    'You must be signed in to perform this action',
    'NOT_AUTHENTICATED'
  );

  static UNKNOWN = (message: string) =>
    new AuthError(message || 'An unknown error occurred', 'UNKNOWN');

  /**
   * Convert Firebase Auth error to AppError
   */
  static fromFirebaseAuthError(error: any): AuthError {
    const code = error?.code || '';

    switch (code) {
      case 'auth/user-not-found':
        return AuthError.USER_NOT_FOUND;
      case 'auth/wrong-password':
        return AuthError.WRONG_PASSWORD;
      case 'auth/email-already-in-use':
        return AuthError.EMAIL_ALREADY_IN_USE;
      case 'auth/weak-password':
        return AuthError.WEAK_PASSWORD;
      case 'auth/invalid-email':
        return AuthError.INVALID_EMAIL;
      case 'auth/too-many-requests':
        return AuthError.TOO_MANY_REQUESTS;
      case 'auth/network-request-failed':
        return AuthError.NETWORK_ERROR;
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return new AuthError('Incorrect email or password.', 'INVALID_CREDENTIAL');
      case 'auth/user-disabled':
        return new AuthError('This account has been disabled. Please contact support.', 'USER_DISABLED');
      case 'auth/operation-not-allowed':
        return new AuthError('This sign-in method is not allowed. Please contact support.', 'OPERATION_NOT_ALLOWED');
      case 'auth/requires-recent-login':
        return new AuthError('Please sign out and sign back in to continue.', 'REQUIRES_RECENT_LOGIN');
      case 'auth/expired-action-code':
        return new AuthError('This link has expired. Please request a new one.', 'EXPIRED_ACTION_CODE');
      case 'auth/invalid-action-code':
        return new AuthError('This link is invalid or has already been used.', 'INVALID_ACTION_CODE');
      case 'auth/missing-email':
        return new AuthError('Please enter your email address.', 'MISSING_EMAIL');
      default:
        return AuthError.UNKNOWN('');
    }
  }
}

/**
 * Firestore Errors
 */
export class FirestoreError extends AppError {
  static PERMISSION_DENIED = new FirestoreError(
    'You do not have permission to perform this action',
    'PERMISSION_DENIED'
  );

  static NOT_FOUND = new FirestoreError(
    'Document not found',
    'NOT_FOUND'
  );

  static ALREADY_EXISTS = new FirestoreError(
    'Document already exists',
    'ALREADY_EXISTS'
  );

  static UNKNOWN = (message: string) =>
    new FirestoreError(message || 'An unknown error occurred', 'UNKNOWN');

  /**
   * Convert Firebase Firestore error to AppError
   */
  static fromFirebaseFirestoreError(error: any): FirestoreError {
    const code = error?.code || '';

    switch (code) {
      case 'permission-denied':
        return FirestoreError.PERMISSION_DENIED;
      case 'not-found':
        return FirestoreError.NOT_FOUND;
      case 'already-exists':
        return FirestoreError.ALREADY_EXISTS;
      default:
        return FirestoreError.UNKNOWN(error?.message);
    }
  }
}
