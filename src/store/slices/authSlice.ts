/**
 * Auth Slice
 *
 * Manages authentication state with full integration to authService.
 * Handles user profile, authentication status, email verification, and loading states.
 *
 * Features:
 * - Sign up with KSU email verification
 * - Sign in with email/password
 * - Sign out
 * - Email verification checking
 * - User profile updates
 * - Typed selectors for easy state access
 */

import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../models/User';
import * as authService from '../../services/authService';
import type { SignUpData } from '../../services/authService';
import type { RootState } from '../store';

// State interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isEmailVerified: false,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Sign up with email and password
 * Enforces @ksu.edu email domain and sends verification email
 */
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (userData: SignUpData, { rejectWithValue }) => {
    try {
      const result = await authService.signUp(userData);
      return result.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign up failed');
    }
  }
);

/**
 * Sign in with email and password
 * Requires verified email to complete sign in
 */
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await authService.signIn(email, password);
      return result.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

/**
 * Sign out current user
 */
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await authService.signOut();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign out failed');
    }
  }
);

/**
 * Check if current user's email is verified
 * Reloads user from Firebase to get latest status
 */
export const checkEmailVerification = createAsyncThunk(
  'auth/checkEmailVerification',
  async (_, { rejectWithValue }) => {
    try {
      const isVerified = await authService.checkEmailVerification();
      return isVerified;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check email verification');
    }
  }
);

/**
 * Update user profile
 */
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (
    { userId, data }: { userId: string; data: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      await authService.updateUserProfile(userId, data);
      // Fetch updated user
      const user = await authService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

/**
 * Fetch current user profile
 */
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user profile');
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set user directly (used by auth state listener)
     */
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isEmailVerified = action.payload?.isEmailVerified ?? false;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // Sign up
    builder
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = false; // Not authenticated until email verified
        state.isEmailVerified = false;
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sign in
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.isEmailVerified;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Sign out
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Check email verification
    builder
      .addCase(checkEmailVerification.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkEmailVerification.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isEmailVerified = action.payload;
        if (state.user) {
          state.user.isEmailVerified = action.payload;
        }
        if (action.payload) {
          state.isAuthenticated = true;
        }
      })
      .addCase(checkEmailVerification.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch user profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.isEmailVerified = action.payload?.isEmailVerified ?? false;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// ============================================================================
// Actions
// ============================================================================

export const { setUser, clearError } = authSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

const selectAuthState = (state: RootState) => state.auth;

export const selectUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectIsLoading = createSelector(
  [selectAuthState],
  (auth) => auth.isLoading
);

export const selectError = createSelector(
  [selectAuthState],
  (auth) => auth.error
);

export const selectIsEmailVerified = createSelector(
  [selectAuthState],
  (auth) => auth.isEmailVerified
);

// ============================================================================
// Reducer Export
// ============================================================================

export default authSlice.reducer;
