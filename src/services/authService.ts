/**
 * Authentication Service
 *
 * Handles Firebase Authentication with K-State email verification.
 * Manages user sessions, email verification, and profile creation.
 *
 * CRITICAL SECURITY RULES:
 * - MUST enforce @ksu.edu email domain
 * - MUST send email verification after signup
 * - MUST validate phone number format (E.164: +1XXXXXXXXXX)
 * - Default role MUST be 'member' (only admins can promote)
 * - MUST check email verification before allowing full access
 *
 * Password Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User, UserRole, isEduEmail, formatPhoneNumber, isValidPhoneNumber } from '../models/User';
import { AuthError } from '../types/errors';

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Sign up data interface
 */
export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string; // Optional - push notifications replaced SMS
  chapterId?: string;
  classYear: number;
  adminCode?: string; // Optional admin code for chapter admin self-registration
}

/**
 * Authentication result
 */
export interface AuthResult {
  userId: string;
  user: User;
}

/**
 * Auth State enumeration
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
 * Sign up with email and password
 *
 * Creates a new Firebase Auth user and Firestore user document.
 * Automatically sends email verification.
 *
 * Steps:
 * 1. Validate KSU email (@ksu.edu)
 * 2. Validate password strength (8+ chars, uppercase, lowercase, number)
 * 3. Validate phone number format (E.164)
 * 4. Create Firebase Auth user
 * 5. Update display name
 * 6. Send email verification
 * 7. Create Firestore user document with server timestamps
 *
 * @param userData User registration data
 * @returns Auth result with user ID and user data
 * @throws AuthError if validation fails or Firebase operation fails
 *
 * CRITICAL: Enforces @ksu.edu email domain and strong password requirements
 */
export async function signUp(userData: SignUpData): Promise<AuthResult> {
  const { email, password, name, phoneNumber, chapterId, classYear } = userData;

  try {
    // Validate KSU email
    if (!isEduEmail(email)) {
      throw AuthError.EMAIL_NOT_KSU;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new AuthError(passwordValidation.errors[0], 'WEAK_PASSWORD');
    }

    // Validate and format phone number if provided
    let formattedPhone = '';
    if (phoneNumber && phoneNumber.trim()) {
      formattedPhone = formatPhoneNumber(phoneNumber);
      if (!isValidPhoneNumber(phoneNumber)) {
        throw AuthError.INVALID_PHONE_NUMBER;
      }
    }

    // Create Firebase Auth user
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email.toLowerCase(),
      password
    );

    // Update display name
    await updateProfile(userCredential.user, { displayName: name.trim() });

    // Send verification email
    await sendEmailVerification(userCredential.user);

    // Create Firestore user document with server timestamps
    const userDoc = {
      id: userCredential.user.uid,
      name: name.trim(),
      email: email.toLowerCase(),
      phoneNumber: formattedPhone,
      chapterId: chapterId || '',
      role: UserRole.MEMBER, // Default role
      classYear: classYear,
      isEmailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);

    // Fetch created user to get actual timestamps
    const createdUser = await loadUser(userCredential.user.uid);

    console.log('✅ User signed up successfully:', createdUser.email);

    return {
      userId: userCredential.user.uid,
      user: createdUser,
    };
  } catch (error: any) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Sign in with email and password
 *
 * Authenticates user and verifies email is verified.
 * Loads user profile from Firestore.
 *
 * Steps:
 * 1. Sign in with Firebase Auth
 * 2. Reload user to get latest email verification status
 * 3. Check email verification (must be verified)
 * 4. Load user data from Firestore
 * 5. Update verification status in Firestore if needed
 *
 * @param email User's email
 * @param password User's password
 * @returns Auth result with user ID and user data
 * @throws AuthError.EMAIL_NOT_VERIFIED if email not verified
 * @throws AuthError if credentials invalid
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
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

    return {
      userId: userCredential.user.uid,
      user,
    };
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
 * @param email User's email (must be @ksu.edu)
 * @throws AuthError.EMAIL_NOT_KSU if email is not @ksu.edu
 * @throws AuthError if send fails
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    // Validate KSU email
    if (!isEduEmail(email)) {
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
 * Confirm password reset with code from email
 *
 * @param code Reset code from email
 * @param newPassword New password
 * @throws AuthError if code invalid or password weak
 */
export async function confirmPasswordResetWithCode(code: string, newPassword: string): Promise<void> {
  try {
    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new AuthError(validation.errors[0], 'WEAK_PASSWORD');
    }

    await confirmPasswordReset(auth, code, newPassword);
    console.log('✅ Password reset successfully');
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

// MARK: - Password Validation

/**
 * Validate password strength
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @param password Password to validate
 * @returns Validation result with errors
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// MARK: - Validation Utilities

/**
 * Validate KSU email domain
 *
 * @param email Email to validate
 * @returns true if email ends with @ksu.edu (case insensitive)
 */
export function validateKSUEmail(email: string): boolean {
  return isEduEmail(email);
}

/**
 * Validate E.164 phone number format
 *
 * Expected format: +1XXXXXXXXXX (12 characters total)
 *
 * @param phoneNumber Phone number to validate
 * @returns true if valid E.164 format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  return isValidPhoneNumber(phoneNumber);
}

// MARK: - Session Management Utilities

/**
 * Get current Firebase Auth user
 *
 * @returns Firebase user or null
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Get current user ID
 *
 * @returns User ID or null
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

/**
 * Check if user is authenticated
 *
 * @returns true if user is signed in
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Check if current user's email is verified
 *
 * @returns true if email is verified
 */
export function isEmailVerified(): boolean {
  return auth.currentUser?.emailVerified ?? false;
}

/**
 * Reload current user to refresh verification status
 *
 * @throws AuthError if no user signed in
 */
export async function reloadUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw AuthError.USER_NOT_FOUND;
  }

  try {
    await user.reload();

    // Update Firestore if verification status changed
    if (user.emailVerified) {
      const userProfile = await loadUser(user.uid);
      if (!userProfile.isEmailVerified) {
        await updateDoc(doc(db, 'users', user.uid), {
          isEmailVerified: true,
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error: any) {
    throw AuthError.fromFirebaseAuthError(error);
  }
}

/**
 * Create user profile in Firestore
 *
 * Used internally or can be called if user document needs to be recreated.
 *
 * @param userId User ID from Firebase Auth
 * @param userData User data (excluding id, role, timestamps)
 * @throws AuthError if creation fails
 */
export async function createUserProfile(
  userId: string,
  userData: Omit<
    User,
    'id' | 'role' | 'isEmailVerified' | 'createdAt' | 'updatedAt' | 'fcmToken'
  >
): Promise<void> {
  try {
    const userDoc = {
      id: userId,
      ...userData,
      role: UserRole.MEMBER,
      isEmailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', userId), userDoc);
  } catch (error: any) {
    throw new AuthError('Failed to create user profile', 'CREATE_PROFILE_FAILED');
  }
}

/**
 * Update user profile in Firestore
 *
 * @param userId User ID
 * @param data Partial user data to update
 * @throws AuthError if update fails
 */
export async function updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw new AuthError('Failed to update user profile', 'UPDATE_PROFILE_FAILED');
  }
}

// MARK: - Private Helper Functions

/**
 * Load user from Firestore
 *
 * @param uid User ID
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
