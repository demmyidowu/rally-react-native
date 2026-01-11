/**
 * Authentication Service
 *
 * Handles all authentication operations for Rally app:
 * - Sign up with K-State email verification
 * - Sign in
 * - Sign out
 * - Password reset
 * - Email verification
 * - Session management
 *
 * CRITICAL: Enforces @ksu.edu email domain for all users
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole, isKSUEmail, formatPhoneNumber, isValidPhoneNumber } from '../models/User';
import { AuthError } from '../types/errors';

/**
 * Auth State
 */
export enum AuthState {
  SIGNED_OUT = 'SIGNED_OUT',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  SIGNED_IN = 'SIGNED_IN',
  LOADING = 'LOADING',
}

/**
 * Auth state listener callback
 */
export type AuthStateCallback = (state: AuthState, user: User | null) => void;

/**
 * Sign up new user with K-State email
 *
 * Steps:
 * 1. Validate KSU email (@ksu.edu)
 * 2. Validate password strength
 * 3. Validate phone number format (E.164)
 * 4. Create Firebase Auth user
 * 5. Send email verification
 * 6. Create Firestore user document
 *
 * @param email - Must be @ksu.edu email
 * @param password - Minimum 6 characters (Firebase default)
 * @param name - User's full name
 * @param phoneNumber - 10-digit phone number
 * @param chapterId - Chapter ID (set by admin later if empty)
 * @param classYear - 1-4 (freshman to senior)
 * @returns User object
 * @throws AuthError if validation fails
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  phoneNumber: string,
  chapterId: string = '',
  classYear: number = 1
): Promise<User> {
  try {
    // Validate KSU email
    if (!isKSUEmail(email)) {
      throw AuthError.EMAIL_NOT_KSU;
    }

    // Validate phone number format
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!isValidPhoneNumber(phoneNumber)) {
      throw AuthError.INVALID_PHONE_NUMBER;
    }

    // Create Firebase Auth user
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email.toLowerCase(),
      password
    );

    // Send verification email
    await sendEmailVerification(userCredential.user);

    // Create Firestore user document
    const user: User = {
      id: userCredential.user.uid,
      name: name.trim(),
      email: email.toLowerCase(),
      phoneNumber: formattedPhone,
      chapterId: chapterId,
      role: UserRole.MEMBER, // Default role
      classYear: classYear,
      isEmailVerified: false,
      fcmToken: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await saveUser(user);

    console.log('✅ User signed up successfully:', user.email);
    return user;
  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Sign in existing user
 *
 * Steps:
 * 1. Sign in with Firebase Auth
 * 2. Check email verification
 * 3. Reload user to get latest verification status
 * 4. Load user data from Firestore
 *
 * @param email - User's email
 * @param password - User's password
 * @returns User object if email is verified
 * @throws AuthError.EMAIL_NOT_VERIFIED if email not verified
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    // Sign in with Firebase Auth
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email.toLowerCase(),
      password
    );

    // Reload to get latest email verification status
    await userCredential.user.reload();

    // Check email verification
    if (!userCredential.user.emailVerified) {
      await firebaseSignOut(auth);
      throw AuthError.EMAIL_NOT_VERIFIED;
    }

    // Load user data from Firestore
    const user = await loadUser(userCredential.user.uid);

    // Update email verification status if needed
    if (!user.isEmailVerified) {
      await updateDoc(doc(db, 'users', user.id), {
        isEmailVerified: true,
        updatedAt: Timestamp.now(),
      });
      user.isEmailVerified = true;
    }

    console.log('✅ User signed in successfully:', user.email);
    return user;
  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out');
  } catch (error: any) {
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Send password reset email
 *
 * @param email - User's email (must be @ksu.edu)
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    // Validate KSU email
    if (!isKSUEmail(email)) {
      throw AuthError.EMAIL_NOT_KSU;
    }

    await sendPasswordResetEmail(auth, email.toLowerCase());
    console.log('✅ Password reset email sent to:', email);
  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Check if current user's email is verified
 * Reloads user to get latest status from Firebase
 *
 * @returns true if email is verified, false otherwise
 */
export async function checkEmailVerification(): Promise<boolean> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw AuthError.USER_NOT_FOUND;
  }

  try {
    // Reload to get latest verification status
    await firebaseUser.reload();

    if (firebaseUser.emailVerified) {
      // Update Firestore
      const user = await loadUser(firebaseUser.uid);
      if (!user.isEmailVerified) {
        await updateDoc(doc(db, 'users', user.id), {
          isEmailVerified: true,
          updatedAt: Timestamp.now(),
        });
      }
      return true;
    }

    return false;
  } catch (error: any) {
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw AuthError.USER_NOT_FOUND;
  }

  try {
    await sendEmailVerification(firebaseUser);
    console.log('✅ Verification email resent');
  } catch (error: any) {
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Get current authenticated user
 *
 * @returns User object or null if not signed in
 */
export async function getCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return null;
  }

  try {
    return await loadUser(firebaseUser.uid);
  } catch (error) {
    console.error('Error loading current user:', error);
    return null;
  }
}

/**
 * Listen to auth state changes
 *
 * @param callback - Called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: AuthStateCallback): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(AuthState.SIGNED_OUT, null);
      return;
    }

    try {
      // Reload to get latest verification status
      await firebaseUser.reload();

      // Load user data
      const user = await loadUser(firebaseUser.uid);

      if (!firebaseUser.emailVerified) {
        callback(AuthState.EMAIL_NOT_VERIFIED, user);
      } else {
        callback(AuthState.SIGNED_IN, user);
      }
    } catch (error) {
      console.error('Error in auth state listener:', error);
      callback(AuthState.SIGNED_OUT, null);
    }
  });
}

/**
 * Update user's FCM token for push notifications
 *
 * @param userId - User ID
 * @param fcmToken - Firebase Cloud Messaging token
 */
export async function updateFCMToken(userId: string, fcmToken: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: fcmToken,
      updatedAt: Timestamp.now(),
    });
    console.log('✅ FCM token updated');
  } catch (error: any) {
    console.error('Error updating FCM token:', error);
  }
}

// MARK: - Private Helper Functions

/**
 * Load user from Firestore
 *
 * @param uid - User ID
 * @returns User object
 * @throws AuthError.USER_NOT_FOUND if user doesn't exist
 */
async function loadUser(uid: string): Promise<User> {
  const userDoc = await getDoc(doc(db, 'users', uid));

  if (!userDoc.exists()) {
    throw AuthError.USER_NOT_FOUND;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber,
    chapterId: data.chapterId,
    role: data.role as UserRole,
    classYear: data.classYear,
    isEmailVerified: data.isEmailVerified,
    fcmToken: data.fcmToken,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Save user to Firestore
 *
 * @param user - User object
 */
async function saveUser(user: User): Promise<void> {
  await setDoc(doc(db, 'users', user.id), {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    chapterId: user.chapterId,
    role: user.role,
    classYear: user.classYear,
    isEmailVerified: user.isEmailVerified,
    fcmToken: user.fcmToken,
    createdAt: Timestamp.fromDate(user.createdAt),
    updatedAt: Timestamp.fromDate(user.updatedAt),
  });
}
