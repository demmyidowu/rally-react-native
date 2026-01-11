/**
 * useAuth Hook
 *
 * Custom React hook for authentication state management
 * Provides easy access to current user and auth operations
 */

import { useState, useEffect } from 'react';
import { User } from '../models/User';
import {
  AuthState,
  onAuthStateChange,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  sendPasswordReset as authSendPasswordReset,
  checkEmailVerification as authCheckEmailVerification,
  resendVerificationEmail as authResendVerificationEmail,
  getCurrentUser,
} from '../services/authService';
import { AuthError } from '../types/errors';

interface UseAuthResult {
  // State
  user: User | null;
  authState: AuthState;
  loading: boolean;
  error: string | null;

  // Operations
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    phoneNumber: string,
    chapterId?: string,
    classYear?: number
  ) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>(AuthState.LOADING);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((state, userData) => {
      setAuthState(state);
      setUser(userData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load initial user
  useEffect(() => {
    loadInitialUser();
  }, []);

  const loadInitialUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    } catch (err) {
      console.error('Error loading initial user:', err);
      setLoading(false);
    }
  };

  // Sign in
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authSignIn(email, password);
      setUser(userData);
      setAuthState(AuthState.SIGNED_IN);
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError ? err.message : 'Sign in failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    name: string,
    phoneNumber: string,
    chapterId: string = '',
    classYear: number = 1
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authSignUp(email, password, name, phoneNumber, chapterId, classYear);
      setUser(userData);
      setAuthState(AuthState.EMAIL_NOT_VERIFIED);
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError ? err.message : 'Sign up failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await authSignOut();
      setUser(null);
      setAuthState(AuthState.SIGNED_OUT);
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError ? err.message : 'Sign out failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send password reset email
  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await authSendPasswordReset(email);
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError ? err.message : 'Password reset failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check email verification
  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      setError(null);
      const isVerified = await authCheckEmailVerification();
      if (isVerified) {
        setAuthState(AuthState.SIGNED_IN);
        // Reload user to get updated verification status
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
      return isVerified;
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError
          ? err.message
          : 'Failed to check email verification. Please try again.';
      setError(errorMessage);
      return false;
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (): Promise<void> => {
    try {
      setError(null);
      await authResendVerificationEmail();
    } catch (err: any) {
      const errorMessage =
        err instanceof AuthError
          ? err.message
          : 'Failed to resend verification email. Please try again.';
      setError(errorMessage);
      throw err;
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return {
    user,
    authState,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    checkEmailVerification,
    resendVerificationEmail,
    clearError,
  };
}
