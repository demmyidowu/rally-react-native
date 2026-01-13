/**
 * Rides Slice
 *
 * Manages ride state:
 * - Active rides (assigned, en_route)
 * - Ride queue (requested)
 * - Real-time updates from Firestore
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Ride, RideDocument, RideRequest, RideStatus } from '../../models/Ride';
import { db } from '../../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// State interface
export interface RidesState {
  rides: Ride[]; // All rides
  activeRides: Ride[]; // Rides with status: assigned, en_route
  queue: Ride[]; // Rides with status: requested (sorted by priority)
  myRide: Ride | null; // Current user's active ride
  myRides: Ride[]; // User's ride history
  loading: boolean;
  error: string | null;
}

const initialState: RidesState = {
  rides: [],
  activeRides: [],
  queue: [],
  myRide: null,
  myRides: [],
  loading: false,
  error: null,
};

// Helper: Convert Firestore RideDocument to Ride
// Intentionally converts Timestamps to Dates for app use
const convertRideDocToRide = (id: string, doc: RideDocument): Ride => ({
  ...doc,
  id,
  requestedAt: (doc.requestedAt?.toDate?.() || new Date()) as unknown as Timestamp,
  assignedAt: doc.assignedAt?.toDate?.() as unknown as Timestamp | undefined,
  enrouteAt: doc.enRouteAt?.toDate?.() as unknown as Timestamp | undefined,
  completedAt: doc.completedAt?.toDate?.() as unknown as Timestamp | undefined,
  cancelledAt: doc.cancelledAt?.toDate?.() as unknown as Timestamp | undefined,
});

// Helper: Calculate priority
// Priority = (classYear × 10) + (waitMinutes × 0.5)
// Emergency = 9999
const calculatePriority = (classYear: number, requestedAt: Date, isEmergency: boolean): number => {
  if (isEmergency) return 9999;

  const waitMinutes = Math.floor((Date.now() - requestedAt.getTime()) / 60000);
  return classYear * 10 + waitMinutes * 0.5;
};

// Async thunks

// Request a ride
export const requestRide = createAsyncThunk(
  'rides/requestRide',
  async (
    {
      riderId,
      riderName,
      riderPhone,
      classYear,
      pickupLocation,
      dropoffLocation,
      isEmergency,
      notes,
    }: RideRequest & {
      riderName: string;
      riderPhone: string;
      classYear: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const requestedAt = new Date();
      const priority = calculatePriority(classYear, requestedAt, isEmergency);

      const rideData: Omit<RideDocument, 'id'> = {
        riderId,
        riderName,
        riderPhone,
        status: RideStatus.QUEUED,
        pickupLocation,
        dropoffLocation,
        isEmergency,
        priority,
        requestedAt: Timestamp.fromDate(requestedAt),
        notes,
      };

      const docRef = await addDoc(collection(db, 'rides'), rideData);
      const newRide = convertRideDocToRide(docRef.id, { ...rideData, id: docRef.id });
      return newRide;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch all active rides (for admin/DD)
export const fetchActiveRides = createAsyncThunk(
  'rides/fetchActiveRides',
  async (_, { rejectWithValue }) => {
    try {
      const q = query(
        collection(db, 'rides'),
        where('status', 'in', [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE]),
        orderBy('priority', 'desc')
      );

      const snapshot = await getDocs(q);
      const rides: Ride[] = snapshot.docs.map((doc) =>
        convertRideDocToRide(doc.id, doc.data() as RideDocument)
      );

      return rides;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's active ride
export const fetchMyRide = createAsyncThunk(
  'rides/fetchMyRide',
  async (userId: string, { rejectWithValue }) => {
    try {
      const q = query(
        collection(db, 'rides'),
        where('riderId', '==', userId),
        where('status', 'in', [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE]),
        orderBy('requestedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const rideDoc = snapshot.docs[0];
      return convertRideDocToRide(rideDoc.id, rideDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's ride history (all rides)
export const fetchMyRides = createAsyncThunk(
  'rides/fetchMyRides',
  async (userId: string, { rejectWithValue }) => {
    try {
      const q = query(
        collection(db, 'rides'),
        where('riderId', '==', userId),
        orderBy('requestedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        convertRideDocToRide(doc.id, doc.data() as RideDocument)
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Assign ride to DD
export const assignRide = createAsyncThunk(
  'rides/assignRide',
  async (
    {
      rideId,
      ddId,
      ddName,
      ddPhone,
    }: {
      rideId: string;
      ddId: string;
      ddName: string;
      ddPhone: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        ddId,
        ddName,
        ddPhone,
        status: 'assigned',
        assignedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Mark ride as en route
export const markEnRoute = createAsyncThunk(
  'rides/markEnRoute',
  async (rideId: string, { rejectWithValue }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'en_route',
        enRouteAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Complete ride
export const completeRide = createAsyncThunk(
  'rides/completeRide',
  async (rideId: string, { rejectWithValue }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Cancel ride
export const cancelRide = createAsyncThunk(
  'rides/cancelRide',
  async (rideId: string, { rejectWithValue }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const ridesSlice = createSlice({
  name: 'rides',
  initialState,
  reducers: {
    // Set rides from real-time listener
    setRides: (state, action: PayloadAction<Ride[]>) => {
      state.rides = action.payload;
      state.activeRides = action.payload.filter((r) =>
        [RideStatus.ASSIGNED, RideStatus.ENROUTE].includes(r.status as RideStatus)
      );
      state.queue = action.payload
        .filter((r) => r.status === RideStatus.QUEUED)
        .sort((a, b) => b.priority - a.priority);
    },
    // Update single ride (from real-time listener)
    updateRide: (state, action: PayloadAction<Ride>) => {
      const index = state.rides.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rides[index] = action.payload;
      } else {
        state.rides.push(action.payload);
      }

      // Update derived state
      state.activeRides = state.rides.filter((r) =>
        [RideStatus.ASSIGNED, RideStatus.ENROUTE].includes(r.status as RideStatus)
      );
      state.queue = state.rides
        .filter((r) => r.status === RideStatus.QUEUED)
        .sort((a, b) => b.priority - a.priority);
    },
    // Remove ride (from real-time listener)
    removeRide: (state, action: PayloadAction<string>) => {
      state.rides = state.rides.filter((r) => r.id !== action.payload);
      state.activeRides = state.activeRides.filter((r) => r.id !== action.payload);
      state.queue = state.queue.filter((r) => r.id !== action.payload);
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Request ride
    builder
      .addCase(requestRide.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestRide.fulfilled, (state, action) => {
        state.loading = false;
        state.myRide = action.payload;
        state.queue.push(action.payload);
        state.queue.sort((a, b) => b.priority - a.priority);
        state.error = null;
      })
      .addCase(requestRide.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch active rides
    builder
      .addCase(fetchActiveRides.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveRides.fulfilled, (state, action) => {
        state.loading = false;
        state.rides = action.payload;
        state.activeRides = action.payload.filter((r) =>
          ['assigned', 'en_route'].includes(r.status)
        );
        state.queue = action.payload
          .filter((r) => r.status === RideStatus.QUEUED)
          .sort((a, b) => b.priority - a.priority);
        state.error = null;
      })
      .addCase(fetchActiveRides.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch my ride
    builder
      .addCase(fetchMyRide.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRide.fulfilled, (state, action) => {
        state.loading = false;
        state.myRide = action.payload;
        state.error = null;
      })
      .addCase(fetchMyRide.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch my rides (history)
    builder
      .addCase(fetchMyRides.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRides.fulfilled, (state, action) => {
        state.loading = false;
        state.myRides = action.payload;
        state.error = null;
      })
      .addCase(fetchMyRides.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Assign ride
    builder.addCase(assignRide.fulfilled, (state, action) => {
      const index = state.rides.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rides[index] = action.payload;
      }
      state.activeRides.push(action.payload);
      state.queue = state.queue.filter((r) => r.id !== action.payload.id);
    });

    // Mark en route
    builder.addCase(markEnRoute.fulfilled, (state, action) => {
      const index = state.rides.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rides[index] = action.payload;
      }
      const activeIndex = state.activeRides.findIndex((r) => r.id === action.payload.id);
      if (activeIndex !== -1) {
        state.activeRides[activeIndex] = action.payload;
      }
    });

    // Complete ride
    builder.addCase(completeRide.fulfilled, (state, action) => {
      state.rides = state.rides.filter((r) => r.id !== action.payload.id);
      state.activeRides = state.activeRides.filter((r) => r.id !== action.payload.id);
      if (state.myRide?.id === action.payload.id) {
        state.myRide = null;
      }
    });

    // Cancel ride
    builder.addCase(cancelRide.fulfilled, (state, action) => {
      state.rides = state.rides.filter((r) => r.id !== action.payload.id);
      state.queue = state.queue.filter((r) => r.id !== action.payload.id);
      state.activeRides = state.activeRides.filter((r) => r.id !== action.payload.id);
      if (state.myRide?.id === action.payload.id) {
        state.myRide = null;
      }
    });
  },
});

export const { setRides, updateRide, removeRide, clearError } = ridesSlice.actions;

// Selectors
import type { RootState } from '../store';

export const selectRides = (state: RootState) => state.rides.rides;
export const selectActiveRides = (state: RootState) => state.rides.activeRides;
export const selectQueue = (state: RootState) => state.rides.queue;
export const selectMyRide = (state: RootState) => state.rides.myRide;
export const selectMyRides = (state: RootState) => state.rides.myRides;
export const selectLoading = (state: RootState) => state.rides.loading;
export const selectError = (state: RootState) => state.rides.error;
export const selectQueuePosition = (state: RootState) => {
  const myRide = state.rides.myRide;
  if (!myRide || myRide.status !== RideStatus.QUEUED) return null;
  const position = state.rides.queue.findIndex(r => r.id === myRide.id);
  return position >= 0 ? position + 1 : null;
};

export default ridesSlice.reducer;
