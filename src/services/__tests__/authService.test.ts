/**
 * Authentication Service Tests
 *
 * Tests for K-State email validation, sign up, sign in, and other auth operations
 */

import {
  signUp,
  signIn,
  signOut,
  sendPasswordReset,
  checkEmailVerification,
  resendVerificationEmail,
} from '../authService';
import { AuthError } from '../../types/errors';
import { isKSUEmail, formatPhoneNumber, isValidPhoneNumber } from '../../models/User';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
  functions: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}));

describe('Email Validation', () => {
  describe('isKSUEmail', () => {
    it('should accept valid KSU emails', () => {
      expect(isKSUEmail('student@ksu.edu')).toBe(true);
      expect(isKSUEmail('john.doe@ksu.edu')).toBe(true);
      expect(isKSUEmail('test123@ksu.edu')).toBe(true);
    });

    it('should accept KSU emails with mixed case', () => {
      expect(isKSUEmail('STUDENT@KSU.EDU')).toBe(true);
      expect(isKSUEmail('Student@KSU.edu')).toBe(true);
      expect(isKSUEmail('student@KSU.EDU')).toBe(true);
    });

    it('should reject non-KSU emails', () => {
      expect(isKSUEmail('student@gmail.com')).toBe(false);
      expect(isKSUEmail('student@k-state.edu')).toBe(false);
      expect(isKSUEmail('student@kstate.edu')).toBe(false);
      expect(isKSUEmail('student@ksu.org')).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(isKSUEmail('not-an-email')).toBe(false);
      expect(isKSUEmail('')).toBe(false);
      expect(isKSUEmail('@ksu.edu')).toBe(false);
    });
  });
});

describe('Phone Number Validation', () => {
  describe('formatPhoneNumber', () => {
    it('should format 10-digit phone numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('+15551234567');
      expect(formatPhoneNumber('1234567890')).toBe('+11234567890');
    });

    it('should handle phone numbers with country code', () => {
      expect(formatPhoneNumber('15551234567')).toBe('+15551234567');
      expect(formatPhoneNumber('+15551234567')).toBe('+15551234567');
    });

    it('should handle formatted phone numbers', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('+15551234567');
      expect(formatPhoneNumber('555-123-4567')).toBe('+15551234567');
      expect(formatPhoneNumber('555.123.4567')).toBe('+15551234567');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should accept valid 10-digit phone numbers', () => {
      expect(isValidPhoneNumber('5551234567')).toBe(true);
      expect(isValidPhoneNumber('1234567890')).toBe(true);
    });

    it('should accept formatted phone numbers', () => {
      expect(isValidPhoneNumber('(555) 123-4567')).toBe(true);
      expect(isValidPhoneNumber('555-123-4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('555123')).toBe(false); // Too short
      expect(isValidPhoneNumber('555123456789')).toBe(false); // Too long
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });
});

describe('Sign Up Validation', () => {
  it('should reject non-KSU emails during sign up', async () => {
    await expect(
      signUp('student@gmail.com', 'password123', 'John Doe', '5551234567')
    ).rejects.toThrow(AuthError.EMAIL_NOT_KSU);
  });

  it('should reject invalid phone numbers during sign up', async () => {
    await expect(
      signUp('student@ksu.edu', 'password123', 'John Doe', '555123')
    ).rejects.toThrow(AuthError.INVALID_PHONE_NUMBER);
  });
});

describe('Error Messages', () => {
  it('should have user-friendly error messages', () => {
    expect(AuthError.EMAIL_NOT_KSU.message).toBe('Must use K-State email address (@ksu.edu)');
    expect(AuthError.EMAIL_NOT_VERIFIED.message).toBe(
      'Please verify your K-State email before continuing'
    );
    expect(AuthError.INVALID_PHONE_NUMBER.message).toBe(
      'Invalid phone number format. Must be 10 digits.'
    );
    expect(AuthError.USER_NOT_FOUND.message).toBe('User account not found');
    expect(AuthError.WRONG_PASSWORD.message).toBe('Incorrect password');
  });

  it('should have correct error codes', () => {
    expect(AuthError.EMAIL_NOT_KSU.code).toBe('EMAIL_NOT_KSU');
    expect(AuthError.EMAIL_NOT_VERIFIED.code).toBe('EMAIL_NOT_VERIFIED');
    expect(AuthError.INVALID_PHONE_NUMBER.code).toBe('INVALID_PHONE_NUMBER');
  });
});

describe('Firebase Auth Error Conversion', () => {
  it('should convert Firebase auth errors to AuthError', () => {
    const firebaseErrors = [
      { code: 'auth/user-not-found', expected: AuthError.USER_NOT_FOUND },
      { code: 'auth/wrong-password', expected: AuthError.WRONG_PASSWORD },
      { code: 'auth/email-already-in-use', expected: AuthError.EMAIL_ALREADY_IN_USE },
      { code: 'auth/weak-password', expected: AuthError.WEAK_PASSWORD },
      { code: 'auth/invalid-email', expected: AuthError.INVALID_EMAIL },
      { code: 'auth/too-many-requests', expected: AuthError.TOO_MANY_REQUESTS },
      { code: 'auth/network-request-failed', expected: AuthError.NETWORK_ERROR },
    ];

    firebaseErrors.forEach(({ code, expected }) => {
      const error = AuthError.fromFirebaseAuthError({ code });
      expect(error.code).toBe(expected.code);
      expect(error.message).toBe(expected.message);
    });
  });

  it('should handle unknown Firebase errors', () => {
    const error = AuthError.fromFirebaseAuthError({
      code: 'auth/unknown-error',
      message: 'Something went wrong',
    });
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).toBe('Something went wrong');
  });
});

// Integration tests (require Firebase emulator)
describe.skip('Integration Tests (requires Firebase emulator)', () => {
  const testUser = {
    email: 'test@ksu.edu',
    password: 'testpassword123',
    name: 'Test User',
    phoneNumber: '5551234567',
  };

  beforeEach(async () => {
    // Clear Firebase emulator data
  });

  it('should sign up a new user', async () => {
    const user = await signUp(
      testUser.email,
      testUser.password,
      testUser.name,
      testUser.phoneNumber
    );

    expect(user.email).toBe(testUser.email.toLowerCase());
    expect(user.name).toBe(testUser.name);
    expect(user.phoneNumber).toBe('+15551234567');
    expect(user.role).toBe('member');
    expect(user.isEmailVerified).toBe(false);
  });

  it('should prevent sign in with unverified email', async () => {
    await signUp(testUser.email, testUser.password, testUser.name, testUser.phoneNumber);

    await expect(signIn(testUser.email, testUser.password)).rejects.toThrow(
      AuthError.EMAIL_NOT_VERIFIED
    );
  });

  it('should sign in after email verification', async () => {
    // This test requires manual email verification or Firebase Admin SDK
    // to manually verify the email
  });

  it('should send password reset email', async () => {
    await signUp(testUser.email, testUser.password, testUser.name, testUser.phoneNumber);

    await expect(sendPasswordReset(testUser.email)).resolves.not.toThrow();
  });

  it('should resend verification email', async () => {
    await signUp(testUser.email, testUser.password, testUser.name, testUser.phoneNumber);
    // Sign in to get auth token (will fail but sets currentUser)

    await expect(resendVerificationEmail()).resolves.not.toThrow();
  });
});
