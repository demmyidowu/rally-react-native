/**
 * Auth Slice
 *
 * Manages authentication state:
 * - User profile
 * - Authentication status
 * - Loading states
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserDocument } from '../../models/User';
import { auth, db } from '../../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

// State interface
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  emailVerificationSent: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  emailVerificationSent: false,
};

// Helper: Convert Firestore UserDocument to User
const convertUserDocToUser = (doc: UserDocument): User => ({
  ...doc,
  createdAt: doc.createdAt?.toDate?.() || new Date(),
  updatedAt: doc.updatedAt?.toDate?.() || new Date(),
});

// Async thunks

// Sign in with email/password
export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verify KSU email domain
      if (!email.endsWith('@ksu.edu')) {
        await signOut(auth);
        throw new Error('Only @ksu.edu email addresses are allowed');
      }

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email before signing in');
      }

      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      return convertUserDocToUser(userDoc.data() as UserDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Sign up with email/password
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (
    {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      classYear,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      classYear: number;
    },
    { rejectWithValue }
  ) => {
    try {
      // Verify KSU email domain
      if (!email.endsWith('@ksu.edu')) {
        throw new Error('Only @ksu.edu email addresses are allowed');
      }

      // Create Firebase auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Create user profile in Firestore
      const userDoc: UserDocument = {
        uid: userCredential.user.uid,
        email,
        firstName,
        lastName,
        phoneNumber,
        role: 'rider', // Default role
        classYear,
        isActive: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);

      // Sign out user until email is verified
      await signOut(auth);

      return {
        emailVerificationSent: true,
        message: 'Verification email sent. Please check your inbox.',
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user profile
export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (uid: string, { rejectWithValue }) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      return convertUserDocToUser(userDoc.data() as UserDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (
    { uid, updates }: { uid: string; updates: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(userRef);
      return convertUserDocToUser(updatedDoc.data() as UserDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Sign out
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await signOut(auth);
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set user (for Firebase auth state listener)
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Reset email verification flag
    resetEmailVerification: (state) => {
      state.emailVerificationSent = false;
    },
  },
  extraReducers: (builder) => {
    // Sign in
    builder
      .addCase(signIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Sign up
    builder
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.emailVerificationSent = false;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.loading = false;
        state.emailVerificationSent = true;
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.emailVerificationSent = false;
      });

    // Fetch user profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, clearError, resetEmailVerification } = authSlice.actions;
export default authSlice.reducer;
