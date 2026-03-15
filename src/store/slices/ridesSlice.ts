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
  arrayRemove,
} from 'firebase/firestore';

// State interface
export interface RidesState {
  rides: Ride[]; // All rides
  activeRides: Ride[]; // Rides with status: assigned, en_route
  queue: Ride[]; // Rides with status: requested (sorted by priority)
  myRide: Ride | null; // Current user's active ride
  myRides: Ride[]; // User's ride history
  ddCurrentRide: Ride | null; // DD's currently assigned ride
  loading: boolean;
  error: string | null;
}

const initialState: RidesState = {
  rides: [],
  activeRides: [],
  queue: [],
  myRide: null,
  myRides: [],
  ddCurrentRide: null,
  loading: false,
  error: null,
};

// Helper: Convert Firestore document to Ride
// Converts Timestamps to ISO strings for Redux serialization
// Destructure out all Timestamp fields to prevent non-serializable values in Redux
const convertRideDocToRide = (id: string, doc: any): Ride => {
  // Extract timestamp and GeoPoint fields to prevent non-serializable values in Redux
  const {
    requestedAt,
    assignedAt,
    enRouteAt,
    arrivedAt,
    completedAt,
    cancelledAt,
    pickupLocation,
    dropoffLocation,
    ...rest
  } = doc;

  return {
    ...rest,
    id,
    requestedAt: requestedAt?.toDate?.().toISOString() || new Date().toISOString(),
    assignedAt: assignedAt?.toDate?.().toISOString(),
    enrouteAt: enRouteAt?.toDate?.().toISOString(),
    arrivedAt: arrivedAt?.toDate?.().toISOString(),
    completedAt: completedAt?.toDate?.().toISOString(),
    cancelledAt: cancelledAt?.toDate?.().toISOString(),
    pickupLocation: pickupLocation
      ? { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude }
      : pickupLocation,
    ...(dropoffLocation !== undefined && {
      dropoffLocation: { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
    }),
  };
};

// Helper: Calculate priority
// Same chapter: (classYear × 10) + (waitMinutes × 0.5) + penalty
// Different chapter: (waitMinutes × 0.5) + penalty
// Emergency = 9999
const calculatePriority = (
  classYear: number,
  requestedAt: Date,
  isEmergency: boolean,
  isInHostChapter: boolean = true,
  penalty: number = 0
): number => {
  if (isEmergency) return 9999;

  const waitMinutes = Math.floor((Date.now() - requestedAt.getTime()) / 60000);

  // Only add class year bonus if rider is in the same chapter as the event host
  // Apply penalty (negative value reduces priority)
  if (isInHostChapter) {
    return classYear * 10 + waitMinutes * 0.5 + penalty;
  } else {
    return waitMinutes * 0.5 + penalty;
  }
};

// Async thunks

// Request a ride
export const requestRide = createAsyncThunk(
  'rides/requestRide',
  async (
    {
      riderId,
      riderName,
      classYear,
      riderChapterId,
      eventId,
      eventChapterId,
      pickupLocation,
      pickupAddress,
      dropoffLocation,
      dropoffAddress,
      isEmergency,
      notes,
    }: RideRequest & {
      riderName: string;
      classYear: number;
      riderChapterId?: string;
      eventId?: string;
      eventChapterId?: string;
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const requestedAt = new Date();

      // Fetch user's penalty from previous late cancellation
      let penalty = 0;
      const userRef = doc(db, 'users', riderId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        penalty = userDoc.data().nextRidePenalty || 0;
      }

      // Check if rider is in same chapter as event host
      const isInHostChapter = !!(riderChapterId && eventChapterId && riderChapterId === eventChapterId);
      let priority = calculatePriority(classYear, requestedAt, isEmergency, isInHostChapter, penalty);

      // Log penalty application
      if (penalty !== 0) {
        console.log('[RequestRide] Applied penalty to priority:', penalty, 'Final priority:', priority);
      }

      // Apply emergency abuse priority cap for non-emergency rides
      if (!isEmergency && userDoc.exists()) {
        const abusePenaltyUntil = userDoc.data()?.emergencyAbusePenaltyUntil;
        const isAbusePenaltyActive =
          abusePenaltyUntil && new Date(abusePenaltyUntil).getTime() > Date.now();
        if (isAbusePenaltyActive) {
          const { EMERGENCY_ABUSE_MAX_PRIORITY } = await import('../../constants/penalties');
          priority = Math.min(priority, EMERGENCY_ABUSE_MAX_PRIORITY);
          console.log('[RequestRide] Abuse penalty active, capped priority to:', priority);
        }
      }

      // Build ride data, excluding undefined fields (Firestore doesn't accept undefined)
      const rideData: Record<string, any> = {
        riderId,
        riderName,
        status: RideStatus.QUEUED,
        pickupLocation,
        isEmergency,
        priority,
        requestedAt: Timestamp.fromDate(requestedAt),
      };

      // Add chapter and event info if available
      if (riderChapterId) rideData.chapterId = riderChapterId;
      if (eventId) rideData.eventId = eventId;

      // Only add optional fields if they have values
      if (pickupAddress) rideData.pickupAddress = pickupAddress;
      if (dropoffLocation) rideData.dropoffLocation = dropoffLocation;
      if (dropoffAddress) rideData.dropoffAddress = dropoffAddress;
      if (notes) rideData.notes = notes;

      const docRef = await addDoc(collection(db, 'rides'), rideData);
      console.log('[RequestRide] Created ride with id:', docRef.id, 'eventId:', eventId);
      const newRide = convertRideDocToRide(docRef.id, { ...rideData, id: docRef.id } as RideDocument);

      // Clear penalty after applying it to this ride
      if (penalty !== 0) {
        await updateDoc(userRef, {
          nextRidePenalty: 0,
          updatedAt: Timestamp.now(),
        });
        console.log('[RequestRide] Cleared penalty for user:', riderId);
      }

      // Trigger auto-assignment if there's an active event
      if (eventId) {
        console.log('[RequestRide] Triggering auto-assignment for eventId:', eventId);
        dispatch(autoAssignNextRide({ eventId }));
      } else {
        console.log('[RequestRide] No eventId, skipping auto-assignment');
      }

      return newRide;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to request ride');
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
        where('status', 'in', [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED]),
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
        where('status', 'in', [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED]),
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

// Fetch DD's currently assigned ride (direct query, no cross-join dependency)
export const fetchDDCurrentRide = createAsyncThunk(
  'rides/fetchDDCurrentRide',
  async (ddId: string, { rejectWithValue }) => {
    try {
      const q = query(
        collection(db, 'rides'),
        where('ddId', '==', ddId),
        where('status', 'in', [RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED])
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
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

// Mark ride as en route (DD is on the way)
export const markEnRoute = createAsyncThunk(
  'rides/markEnRoute',
  async (rideId: string, { rejectWithValue }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: RideStatus.ENROUTE,
        enRouteAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Mark ride as arrived (DD arrived at pickup)
export const markArrived = createAsyncThunk(
  'rides/markArrived',
  async (rideId: string, { rejectWithValue }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: RideStatus.ARRIVED,
        arrivedAt: Timestamp.now(),
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

      // Get the ride to find the ddId and eventId for cleanup
      const rideDoc = await getDoc(rideRef);
      const rideData = rideDoc.data();

      await updateDoc(rideRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
      });

      // Clean up DD's currentRides array (for data hygiene)
      if (rideData?.ddId && rideData?.eventId) {
        const ddAssignmentQuery = query(
          collection(db, 'ddAssignments'),
          where('eventId', '==', rideData.eventId),
          where('ddId', '==', rideData.ddId)
        );
        const ddAssignmentSnap = await getDocs(ddAssignmentQuery);
        if (!ddAssignmentSnap.empty) {
          const ddAssignmentRef = ddAssignmentSnap.docs[0].ref;
          await updateDoc(ddAssignmentRef, {
            currentRides: arrayRemove(rideId),
            updatedAt: Timestamp.now(),
          });
          console.log('[CompleteRide] Removed ride from DD currentRides array');
        }
      }

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
  async (
    { rideId, applyPenalty = false }: { rideId: string; applyPenalty?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const rideRef = doc(db, 'rides', rideId);

      // Get the ride to find the riderId, ddId and eventId for cleanup
      const rideDoc = await getDoc(rideRef);
      const rideData = rideDoc.data();

      // Build cancellation data
      const cancellationData: Record<string, any> = {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
      };

      // Set cancellation reason based on penalty
      if (applyPenalty) {
        cancellationData.cancellationReason = 'Late cancellation after DD arrived';
      } else {
        cancellationData.cancellationReason = 'Cancelled by rider';
      }

      await updateDoc(rideRef, cancellationData);

      // Apply penalty to user's next ride if required
      if (applyPenalty && rideData?.riderId) {
        const { LATE_CANCEL_PENALTY } = await import('../../constants/penalties');
        const userRef = doc(db, 'users', rideData.riderId);
        await updateDoc(userRef, {
          nextRidePenalty: LATE_CANCEL_PENALTY,
          updatedAt: Timestamp.now(),
        });
        console.log('[CancelRide] Applied penalty to user:', rideData.riderId);
      }

      // Clean up DD's currentRides array if ride was assigned (for data hygiene)
      if (rideData?.ddId && rideData?.eventId) {
        const ddAssignmentQuery = query(
          collection(db, 'ddAssignments'),
          where('eventId', '==', rideData.eventId),
          where('ddId', '==', rideData.ddId)
        );
        const ddAssignmentSnap = await getDocs(ddAssignmentQuery);
        if (!ddAssignmentSnap.empty) {
          const ddAssignmentRef = ddAssignmentSnap.docs[0].ref;
          await updateDoc(ddAssignmentRef, {
            currentRides: arrayRemove(rideId),
            updatedAt: Timestamp.now(),
          });
          console.log('[CancelRide] Removed ride from DD currentRides array');
        }
      }

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Auto-assign next ride to best available DD
// Rules:
// - DD can only have 1 assigned ride at a time
// - Priority swap logic:
//   - ASSIGNED (not on the way yet): swap for ANY higher priority ride
//   - ENROUTE (on the way): only swap for EMERGENCY rides
//   - ARRIVED (at pickup): NO swap allowed
export const autoAssignNextRide = createAsyncThunk(
  'rides/autoAssignNextRide',
  async ({ eventId }: { eventId: string }, { rejectWithValue }) => {
    try {
      console.log('[AutoAssign] Starting auto-assignment for eventId:', eventId);

      // 1. Find all queued rides for this event, sorted by priority (highest first)
      const ridesQuery = query(
        collection(db, 'rides'),
        where('eventId', '==', eventId),
        where('status', '==', RideStatus.QUEUED),
        orderBy('priority', 'desc')
      );
      const ridesSnapshot = await getDocs(ridesQuery);

      if (ridesSnapshot.empty) {
        console.log('[AutoAssign] No queued rides found');
        return null;
      }

      const queuedRides = ridesSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];
      console.log('[AutoAssign] Found', queuedRides.length, 'queued rides');

      // 2. Find all active DDs for this event
      const ddsQuery = query(
        collection(db, 'ddAssignments'),
        where('eventId', '==', eventId),
        where('isActive', '==', true)
      );
      const ddsSnapshot = await getDocs(ddsQuery);

      if (ddsSnapshot.empty) {
        console.log('[AutoAssign] No active DDs found');
        return null;
      }

      const activeDDs = ddsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];
      console.log('[AutoAssign] Found', activeDDs.length, 'active DDs');

      const rideToAssign = queuedRides[0];

      // 3. Find truly available DD by checking actual ride statuses (not stale currentRides array)
      // This approach queries Firestore for actual active rides, same as Cloud Function
      let availableDD = null;
      for (const dd of activeDDs) {
        const activeRidesQuery = query(
          collection(db, 'rides'),
          where('eventId', '==', eventId),
          where('ddId', '==', dd.ddId),
          where('status', 'in', [RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED])
        );
        const activeRidesSnap = await getDocs(activeRidesQuery);

        if (activeRidesSnap.empty) {
          availableDD = dd;
          console.log('[AutoAssign] Found available DD (no active rides):', dd.ddName);
          break;
        } else {
          console.log('[AutoAssign] DD', dd.ddName, 'has', activeRidesSnap.size, 'active ride(s)');
        }
      }

      if (availableDD) {
        // Simple case: DD is free, assign the ride
        console.log('[AutoAssign] Assigning to available DD:', availableDD.ddName);

        const rideRef = doc(db, 'rides', rideToAssign.id);
        await updateDoc(rideRef, {
          status: RideStatus.ASSIGNED,
          ddId: availableDD.ddId,
          ddName: availableDD.ddName,
          assignedAt: Timestamp.now(),
        });

        const ddRef = doc(db, 'ddAssignments', availableDD.id);
        await updateDoc(ddRef, {
          currentRides: [rideToAssign.id],
          updatedAt: Timestamp.now(),
        });

        console.log('[AutoAssign] Assigned ride', rideToAssign.id, 'to available DD', availableDD.ddName);

        const updatedRideDoc = await getDoc(rideRef);
        return convertRideDocToRide(rideToAssign.id, updatedRideDoc.data() as RideDocument);
      }

      // 4. No available DD - check if we can swap based on priority
      console.log('[AutoAssign] No available DD, checking for priority swap...');

      // Get actual active rides for all busy DDs (query Firestore, don't trust currentRides array)
      for (const dd of activeDDs) {
        // Query for DD's active rides
        const ddActiveRidesQuery = query(
          collection(db, 'rides'),
          where('eventId', '==', eventId),
          where('ddId', '==', dd.ddId),
          where('status', 'in', [RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED])
        );
        const ddActiveRides = await getDocs(ddActiveRidesQuery);

        // If DD has no active rides, they should have been caught above - skip
        if (ddActiveRides.empty) continue;

        const currentRideDoc = ddActiveRides.docs[0];
        const currentRideId = currentRideDoc.id;
        const currentRideRef = doc(db, 'rides', currentRideId);
        const currentRideData = currentRideDoc.data();
        const currentRideStatus = currentRideData.status;
        const currentRidePriority = currentRideData.priority || 0;
        const newRidePriority = rideToAssign.priority || 0;
        const isNewRideEmergency = rideToAssign.isEmergency === true;

        console.log('[AutoAssign] DD', dd.ddName, 'current ride status:', currentRideStatus,
          'priority:', currentRidePriority, 'new ride priority:', newRidePriority);

        // Check swap conditions based on current ride status
        let canSwap = false;

        if (currentRideStatus === RideStatus.ASSIGNED) {
          // DD hasn't started yet - swap for ANY higher priority
          canSwap = newRidePriority > currentRidePriority;
          console.log('[AutoAssign] Status ASSIGNED, canSwap:', canSwap);
        } else if (currentRideStatus === RideStatus.ENROUTE) {
          // DD is on the way - only swap for EMERGENCY
          canSwap = isNewRideEmergency;
          console.log('[AutoAssign] Status ENROUTE, isEmergency:', isNewRideEmergency, 'canSwap:', canSwap);
        } else if (currentRideStatus === RideStatus.ARRIVED) {
          // DD is at pickup - NO swap allowed
          canSwap = false;
          console.log('[AutoAssign] Status ARRIVED, canSwap: false');
        }

        if (canSwap) {
          console.log('[AutoAssign] Performing swap for DD:', dd.ddName);

          // Put current ride back in queue
          await updateDoc(currentRideRef, {
            status: RideStatus.QUEUED,
            ddId: null,
            ddName: null,
            assignedAt: null,
          });

          // Assign new ride to DD
          const newRideRef = doc(db, 'rides', rideToAssign.id);
          await updateDoc(newRideRef, {
            status: RideStatus.ASSIGNED,
            ddId: dd.ddId,
            ddName: dd.ddName,
            assignedAt: Timestamp.now(),
          });

          // Update DD's currentRides
          const ddRef = doc(db, 'ddAssignments', dd.id);
          await updateDoc(ddRef, {
            currentRides: [rideToAssign.id],
            updatedAt: Timestamp.now(),
          });

          console.log('[AutoAssign] Swapped! Old ride', currentRideId, 'back to queue, new ride', rideToAssign.id, 'assigned to', dd.ddName);

          // TODO: Send notifications to DD and displaced rider

          const updatedRideDoc = await getDoc(newRideRef);
          return convertRideDocToRide(rideToAssign.id, updatedRideDoc.data() as RideDocument);
        }
      }

      // No swap possible, ride stays in queue
      console.log('[AutoAssign] No swap possible, ride stays in queue');
      return null;
    } catch (error: any) {
      console.error('[AutoAssign] Error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Upgrade existing ride to emergency priority
export const upgradeRideToEmergency = createAsyncThunk(
  'rides/upgradeRideToEmergency',
  async ({ rideId }: { rideId: string }, { rejectWithValue, dispatch }) => {
    try {
      const rideRef = doc(db, 'rides', rideId);
      const rideDoc = await getDoc(rideRef);

      if (!rideDoc.exists()) {
        return rejectWithValue('Ride not found');
      }

      const rideData = rideDoc.data();

      // Update ride to emergency status
      await updateDoc(rideRef, {
        isEmergency: true,
        priority: 9999,
      });

      console.log('[UpgradeToEmergency] Upgraded ride', rideId, 'to emergency priority');

      // Trigger swap logic if ride is still queued
      if (rideData?.eventId && rideData?.status === RideStatus.QUEUED) {
        console.log('[UpgradeToEmergency] Triggering auto-assignment for eventId:', rideData.eventId);
        dispatch(autoAssignNextRide({ eventId: rideData.eventId }));
      }

      const updatedDoc = await getDoc(rideRef);
      return convertRideDocToRide(rideId, updatedDoc.data() as RideDocument);
    } catch (error: any) {
      console.error('[UpgradeToEmergency] Error:', error);
      return rejectWithValue(error.message || 'Failed to upgrade ride to emergency');
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
          [RideStatus.ASSIGNED, RideStatus.ENROUTE, RideStatus.ARRIVED].includes(r.status)
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

    // Fetch DD's current ride
    builder
      .addCase(fetchDDCurrentRide.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDDCurrentRide.fulfilled, (state, action) => {
        state.loading = false;
        state.ddCurrentRide = action.payload;
        state.error = null;
      })
      .addCase(fetchDDCurrentRide.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('[fetchDDCurrentRide] Query failed:', action.payload);
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
      if (state.ddCurrentRide?.id === action.payload.id) {
        state.ddCurrentRide = action.payload;
      }
    });

    // Mark arrived
    builder.addCase(markArrived.fulfilled, (state, action) => {
      const index = state.rides.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rides[index] = action.payload;
      }
      const activeIndex = state.activeRides.findIndex((r) => r.id === action.payload.id);
      if (activeIndex !== -1) {
        state.activeRides[activeIndex] = action.payload;
      }
      if (state.ddCurrentRide?.id === action.payload.id) {
        state.ddCurrentRide = action.payload;
      }
    });

    // Complete ride
    builder.addCase(completeRide.fulfilled, (state, action) => {
      state.rides = state.rides.filter((r) => r.id !== action.payload.id);
      state.activeRides = state.activeRides.filter((r) => r.id !== action.payload.id);
      if (state.myRide?.id === action.payload.id) {
        state.myRide = null;
      }
      if (state.ddCurrentRide?.id === action.payload.id) {
        state.ddCurrentRide = null;
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

    // Auto-assign ride - update local state after Firestore is updated
    builder.addCase(autoAssignNextRide.fulfilled, (state, action) => {
      if (!action.payload) return; // No ride assigned

      const assignedRide = action.payload;

      // Update ride in rides array
      const index = state.rides.findIndex((r) => r.id === assignedRide.id);
      if (index !== -1) {
        state.rides[index] = assignedRide;
      }

      // Move from queue to activeRides
      state.queue = state.queue.filter((r) => r.id !== assignedRide.id);

      // Add to activeRides if not already there
      if (!state.activeRides.find(r => r.id === assignedRide.id)) {
        state.activeRides.push(assignedRide);
      }
    });

    // Upgrade ride to emergency
    builder.addCase(upgradeRideToEmergency.fulfilled, (state, action) => {
      const updatedRide = action.payload;

      // Update in all arrays
      const rideIndex = state.rides.findIndex((r) => r.id === updatedRide.id);
      if (rideIndex !== -1) {
        state.rides[rideIndex] = updatedRide;
      }

      const queueIndex = state.queue.findIndex((r) => r.id === updatedRide.id);
      if (queueIndex !== -1) {
        state.queue[queueIndex] = updatedRide;
        // Re-sort queue by priority
        state.queue.sort((a, b) => b.priority - a.priority);
      }

      const activeIndex = state.activeRides.findIndex((r) => r.id === updatedRide.id);
      if (activeIndex !== -1) {
        state.activeRides[activeIndex] = updatedRide;
      }

      // Update myRide if it's the upgraded ride
      if (state.myRide?.id === updatedRide.id) {
        state.myRide = updatedRide;
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
export const selectDDCurrentRide = (state: RootState) => state.rides.ddCurrentRide;
export const selectLoading = (state: RootState) => state.rides.loading;
export const selectError = (state: RootState) => state.rides.error;
export const selectQueuePosition = (state: RootState) => {
  const myRide = state.rides.myRide;
  if (!myRide || myRide.status !== RideStatus.QUEUED) return null;
  const position = state.rides.queue.findIndex(r => r.id === myRide.id);
  return position >= 0 ? position + 1 : null;
};

export default ridesSlice.reducer;
