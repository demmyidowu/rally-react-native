/**
 * Authentication Service Tests
 *
 * Tests for K-State email validation, sign up, sign in, and other auth operations
 */

import {
  signUp,
  signIn,
  sendPasswordReset,
  resendVerificationEmail,
} from '../authService';
import { AuthError } from '../../types/errors';
import { isKSUEmail } from '../../models/User';

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

describe('Sign Up Validation', () => {
  it('should reject non-KSU emails during sign up', async () => {
    await expect(
      signUp({
        email: 'student@gmail.com',
        password: 'Password123',
        name: 'John Doe',
        classYear: 4,
        chapterId: 'test-chapter',
      })
    ).rejects.toThrow(AuthError.EMAIL_NOT_KSU);
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
  const testUserData = {
    email: 'test@ksu.edu',
    password: 'TestPassword123',
    name: 'Test User',
    classYear: 4,
    chapterId: 'test-chapter',
  };

  beforeEach(async () => {
    // Clear Firebase emulator data
  });

  it('should sign up a new user', async () => {
    const result = await signUp(testUserData);

    expect(result.user.email).toBe(testUserData.email.toLowerCase());
    expect(result.user.name).toBe(testUserData.name);
    expect(result.user.role).toBe('member');
    expect(result.user.isEmailVerified).toBe(false);
  });

  it('should prevent sign in with unverified email', async () => {
    await signUp(testUserData);

    await expect(signIn(testUserData.email, testUserData.password)).rejects.toThrow(
      AuthError.EMAIL_NOT_VERIFIED
    );
  });

  it('should sign in after email verification', async () => {
    // This test requires manual email verification or Firebase Admin SDK
    // to manually verify the email
  });

  it('should send password reset email', async () => {
    await signUp(testUserData);

    await expect(sendPasswordReset(testUserData.email)).resolves.not.toThrow();
  });

  it('should resend verification email', async () => {
    await signUp(testUserData);
    // Sign in to get auth token (will fail but sets currentUser)

    await expect(resendVerificationEmail()).resolves.not.toThrow();
  });
});
