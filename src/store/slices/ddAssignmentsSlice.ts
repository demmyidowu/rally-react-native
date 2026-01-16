/**
 * DD Assignments Slice
 *
 * Manages DD assignment state:
 * - DD assignments for active event
 * - Activity status (active/inactive)
 * - Ride counts and statistics
 * - Real-time updates from Firestore
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  DDAssignment,
  DDAssignmentDocument,
  DDAssignmentStats,
} from '../../models/DDAssignment';
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
  Timestamp,
  limit,
} from 'firebase/firestore';

// State interface
export interface DDAssignmentsState {
  assignments: DDAssignment[]; // All DD assignments for active event
  myAssignment: DDAssignment | null; // Current DD's assignment
  stats: DDAssignmentStats[]; // Computed stats for each DD
  loading: boolean;
  error: string | null;
}

const initialState: DDAssignmentsState = {
  assignments: [],
  myAssignment: null,
  stats: [],
  loading: false,
  error: null,
};

// Helper: Convert Firestore DDAssignmentDocument to DDAssignment
const convertAssignmentDocToAssignment = (
  id: string,
  doc: DDAssignmentDocument
): DDAssignment => ({
  ...doc,
  id,
  lastToggleAt: doc.lastToggleAt?.toDate?.(),
  lastActiveTimestamp: doc.lastActiveTimestamp?.toDate?.(),
  lastInactiveTimestamp: doc.lastInactiveTimestamp?.toDate?.(),
  assignedAt: doc.assignedAt?.toDate?.() || new Date(),
  createdAt: doc.createdAt?.toDate?.() || new Date(),
  updatedAt: doc.updatedAt?.toDate?.() || new Date(),
});

// Async thunks

// Fetch DD assignments for event
export const fetchDDAssignments = createAsyncThunk(
  'ddAssignments/fetchDDAssignments',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const q = query(collection(db, 'ddAssignments'), where('eventId', '==', eventId));

      const snapshot = await getDocs(q);
      const assignments: DDAssignment[] = snapshot.docs.map((doc) =>
        convertAssignmentDocToAssignment(doc.id, doc.data() as DDAssignmentDocument)
      );

      return assignments;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch my DD assignment
export const fetchMyDDAssignment = createAsyncThunk(
  'ddAssignments/fetchMyDDAssignment',
  async ({ eventId, ddId }: { eventId: string; ddId: string }, { rejectWithValue }) => {
    try {
      const q = query(
        collection(db, 'ddAssignments'),
        where('eventId', '==', eventId),
        where('ddId', '==', ddId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const assignmentDoc = snapshot.docs[0];
      return convertAssignmentDocToAssignment(
        assignmentDoc.id,
        assignmentDoc.data() as DDAssignmentDocument
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch DD's assignment for the currently active event (finds assignment regardless of which event)
export const fetchMyActiveEventAssignment = createAsyncThunk(
  'ddAssignments/fetchMyActiveEventAssignment',
  async ({ ddId, chapterId }: { ddId: string; chapterId?: string }, { rejectWithValue }) => {
    try {
      console.log('[DDAssignments] Fetching assignment for ddId:', ddId, 'chapterId:', chapterId);

      // First find the active event for this chapter
      let activeEventQuery;
      if (chapterId) {
        activeEventQuery = query(
          collection(db, 'events'),
          where('status', '==', 'active'),
          where('chapterId', '==', chapterId),
          limit(1)
        );
      } else {
        activeEventQuery = query(
          collection(db, 'events'),
          where('status', '==', 'active'),
          limit(1)
        );
      }

      const activeEventSnapshot = await getDocs(activeEventQuery);
      if (activeEventSnapshot.empty) {
        console.log('[DDAssignments] No active event found for chapterId:', chapterId);
        return { assignment: null, activeEvent: null };
      }

      const activeEventDoc = activeEventSnapshot.docs[0];
      const activeEventId = activeEventDoc.id;
      const activeEventData = activeEventDoc.data();
      console.log('[DDAssignments] Active event found:', {
        id: activeEventId,
        name: activeEventData.name,
        status: activeEventData.status,
        chapterId: activeEventData.chapterId,
        assignedDDs: activeEventData.assignedDDs,
      });

      // Now find the DD's assignment for this active event
      console.log('[DDAssignments] Querying ddAssignments with eventId:', activeEventId, 'ddId:', ddId);
      const assignmentQuery = query(
        collection(db, 'ddAssignments'),
        where('eventId', '==', activeEventId),
        where('ddId', '==', ddId)
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);
      if (assignmentSnapshot.empty) {
        console.log('[DDAssignments] No assignment found for ddId:', ddId, 'in eventId:', activeEventId);
        // Also log all assignments for this event to debug
        const allAssignmentsQuery = query(
          collection(db, 'ddAssignments'),
          where('eventId', '==', activeEventId)
        );
        const allAssignmentsSnapshot = await getDocs(allAssignmentsQuery);
        console.log('[DDAssignments] All assignments for this event:',
          allAssignmentsSnapshot.docs.map(d => ({ id: d.id, ddId: d.data().ddId, ddName: d.data().ddName }))
        );
        return { assignment: null, activeEvent: { id: activeEventId, name: activeEventDoc.data().name } };
      }

      const assignmentDoc = assignmentSnapshot.docs[0];
      console.log('[DDAssignments] Assignment found:', {
        id: assignmentDoc.id,
        ddId: assignmentDoc.data().ddId,
        ddName: assignmentDoc.data().ddName,
        isActive: assignmentDoc.data().isActive,
      });
      return {
        assignment: convertAssignmentDocToAssignment(
          assignmentDoc.id,
          assignmentDoc.data() as DDAssignmentDocument
        ),
        activeEvent: { id: activeEventId, name: activeEventDoc.data().name },
      };
    } catch (error: any) {
      console.error('[DDAssignments] Error in fetchMyActiveEventAssignment:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Create DD assignment
export const createDDAssignment = createAsyncThunk(
  'ddAssignments/createDDAssignment',
  async (
    {
      eventId,
      ddId,
      ddName,
      ddPhone,
    }: {
      eventId: string;
      ddId: string;
      ddName: string;
      ddPhone: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const assignmentData: Omit<DDAssignmentDocument, 'id'> = {
        eventId,
        ddId,
        ddName,
        ddPhone,
        isActive: true, // Start active
        totalRides: 0,
        currentRides: [],
        assignedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'ddAssignments'), assignmentData);
      const newAssignment = convertAssignmentDocToAssignment(docRef.id, {
        ...assignmentData,
        id: docRef.id,
      });
      return newAssignment;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Toggle DD active status
export const toggleDDActive = createAsyncThunk(
  'ddAssignments/toggleDDActive',
  async (
    {
      assignmentId,
      isActive,
      carDescription,
    }: {
      assignmentId: string;
      isActive: boolean;
      carDescription?: string; // Per-session car info (not persisted in user profile)
    },
    { rejectWithValue }
  ) => {
    try {
      console.log('[toggleDDActive] Starting toggle with:', { assignmentId, isActive, carDescription });
      const assignmentRef = doc(db, 'ddAssignments', assignmentId);
      const updateData: Record<string, any> = {
        isActive,
        lastToggleAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Include car description when going active
      if (isActive && carDescription) {
        updateData.carDescription = carDescription;
      }

      // Track inactive toggles for monitoring
      if (!isActive) {
        const currentDoc = await getDoc(assignmentRef);
        const currentToggles = currentDoc.data()?.inactiveToggles || 0;
        updateData.inactiveToggles = currentToggles + 1;
        updateData.lastInactiveTimestamp = Timestamp.now();
      } else {
        updateData.lastActiveTimestamp = Timestamp.now();
      }

      console.log('[toggleDDActive] Updating document with:', updateData);
      await updateDoc(assignmentRef, updateData);
      console.log('[toggleDDActive] Update successful');

      const updatedDoc = await getDoc(assignmentRef);
      const assignment = convertAssignmentDocToAssignment(
        assignmentId,
        updatedDoc.data() as DDAssignmentDocument
      );

      // Note: Auto-assignment when DD goes active is handled by Cloud Functions
      // when new rides are created, not here (to avoid circular dependencies)
      if (isActive) {
        console.log('[ToggleDDActive] DD went active for eventId:', assignment.eventId);
      }

      return assignment;
    } catch (error: any) {
      console.error('[toggleDDActive] Error:', error);
      console.error('[toggleDDActive] Error code:', error.code);
      console.error('[toggleDDActive] Error message:', error.message);
      return rejectWithValue(error.message || 'Failed to update status');
    }
  }
);

// Add ride to DD's current rides
export const addRideToDD = createAsyncThunk(
  'ddAssignments/addRideToDD',
  async ({ assignmentId, rideId }: { assignmentId: string; rideId: string }, { rejectWithValue }) => {
    try {
      const assignmentRef = doc(db, 'ddAssignments', assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);
      const currentRides = assignmentDoc.data()?.currentRides || [];

      await updateDoc(assignmentRef, {
        currentRides: [...currentRides, rideId],
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(assignmentRef);
      return convertAssignmentDocToAssignment(
        assignmentId,
        updatedDoc.data() as DDAssignmentDocument
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Remove ride from DD's current rides and increment total
export const completeRideForDD = createAsyncThunk(
  'ddAssignments/completeRideForDD',
  async ({ assignmentId, rideId }: { assignmentId: string; rideId: string }, { rejectWithValue }) => {
    try {
      const assignmentRef = doc(db, 'ddAssignments', assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);
      const currentRides = assignmentDoc.data()?.currentRides || [];
      const totalRides = assignmentDoc.data()?.totalRides || 0;

      await updateDoc(assignmentRef, {
        currentRides: currentRides.filter((id: string) => id !== rideId),
        totalRides: totalRides + 1,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(assignmentRef);
      return convertAssignmentDocToAssignment(
        assignmentId,
        updatedDoc.data() as DDAssignmentDocument
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Remove ride from DD's current rides (cancelled)
export const removeRideFromDD = createAsyncThunk(
  'ddAssignments/removeRideFromDD',
  async ({ assignmentId, rideId }: { assignmentId: string; rideId: string }, { rejectWithValue }) => {
    try {
      const assignmentRef = doc(db, 'ddAssignments', assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);
      const currentRides = assignmentDoc.data()?.currentRides || [];

      await updateDoc(assignmentRef, {
        currentRides: currentRides.filter((id: string) => id !== rideId),
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(assignmentRef);
      return convertAssignmentDocToAssignment(
        assignmentId,
        updatedDoc.data() as DDAssignmentDocument
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const ddAssignmentsSlice = createSlice({
  name: 'ddAssignments',
  initialState,
  reducers: {
    // Set assignments from real-time listener
    setAssignments: (state, action: PayloadAction<DDAssignment[]>) => {
      state.assignments = action.payload;
      // Compute stats
      state.stats = action.payload.map((assignment) => ({
        ddId: assignment.ddId,
        ddName: assignment.ddName,
        totalRides: assignment.totalRides,
        currentRides: assignment.currentRides.length,
        // Estimated wait time: 15 minutes per current ride
        estimatedWaitMinutes: assignment.currentRides.length * 15,
        isActive: assignment.isActive,
      }));
    },
    // Update single assignment (from real-time listener)
    updateAssignment: (state, action: PayloadAction<DDAssignment>) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assignments[index] = action.payload;
      } else {
        state.assignments.push(action.payload);
      }

      // Update my assignment if it matches
      if (state.myAssignment?.id === action.payload.id) {
        state.myAssignment = action.payload;
      }

      // Recompute stats
      state.stats = state.assignments.map((assignment) => ({
        ddId: assignment.ddId,
        ddName: assignment.ddName,
        totalRides: assignment.totalRides,
        currentRides: assignment.currentRides.length,
        estimatedWaitMinutes: assignment.currentRides.length * 15,
        isActive: assignment.isActive,
      }));
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch DD assignments
    builder
      .addCase(fetchDDAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDDAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload;
        // Compute stats
        state.stats = action.payload.map((assignment) => ({
          ddId: assignment.ddId,
          ddName: assignment.ddName,
          totalRides: assignment.totalRides,
          currentRides: assignment.currentRides.length,
          estimatedWaitMinutes: assignment.currentRides.length * 15,
          isActive: assignment.isActive,
        }));
        state.error = null;
      })
      .addCase(fetchDDAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch my DD assignment
    builder
      .addCase(fetchMyDDAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyDDAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.myAssignment = action.payload;
        state.error = null;
      })
      .addCase(fetchMyDDAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchMyActiveEventAssignment cases
      .addCase(fetchMyActiveEventAssignment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyActiveEventAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.myAssignment = action.payload.assignment;
        state.error = null;
      })
      .addCase(fetchMyActiveEventAssignment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create DD assignment
    builder.addCase(createDDAssignment.fulfilled, (state, action) => {
      state.assignments.push(action.payload);
      state.stats.push({
        ddId: action.payload.ddId,
        ddName: action.payload.ddName,
        totalRides: 0,
        currentRides: 0,
        estimatedWaitMinutes: 0,
        isActive: true,
      });
    });

    // Toggle DD active
    builder.addCase(toggleDDActive.fulfilled, (state, action) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assignments[index] = action.payload;
      }
      if (state.myAssignment?.id === action.payload.id) {
        state.myAssignment = action.payload;
      }
      // Update stats
      const statsIndex = state.stats.findIndex((s) => s.ddId === action.payload.ddId);
      if (statsIndex !== -1) {
        state.stats[statsIndex].isActive = action.payload.isActive;
      }
    });

    // Add ride to DD
    builder.addCase(addRideToDD.fulfilled, (state, action) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assignments[index] = action.payload;
      }
      if (state.myAssignment?.id === action.payload.id) {
        state.myAssignment = action.payload;
      }
      // Update stats
      const statsIndex = state.stats.findIndex((s) => s.ddId === action.payload.ddId);
      if (statsIndex !== -1) {
        state.stats[statsIndex].currentRides = action.payload.currentRides.length;
        state.stats[statsIndex].estimatedWaitMinutes = action.payload.currentRides.length * 15;
      }
    });

    // Complete ride for DD
    builder.addCase(completeRideForDD.fulfilled, (state, action) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assignments[index] = action.payload;
      }
      if (state.myAssignment?.id === action.payload.id) {
        state.myAssignment = action.payload;
      }
      // Update stats
      const statsIndex = state.stats.findIndex((s) => s.ddId === action.payload.ddId);
      if (statsIndex !== -1) {
        state.stats[statsIndex].totalRides = action.payload.totalRides;
        state.stats[statsIndex].currentRides = action.payload.currentRides.length;
        state.stats[statsIndex].estimatedWaitMinutes = action.payload.currentRides.length * 15;
      }
    });

    // Remove ride from DD
    builder.addCase(removeRideFromDD.fulfilled, (state, action) => {
      const index = state.assignments.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.assignments[index] = action.payload;
      }
      if (state.myAssignment?.id === action.payload.id) {
        state.myAssignment = action.payload;
      }
      // Update stats
      const statsIndex = state.stats.findIndex((s) => s.ddId === action.payload.ddId);
      if (statsIndex !== -1) {
        state.stats[statsIndex].currentRides = action.payload.currentRides.length;
        state.stats[statsIndex].estimatedWaitMinutes = action.payload.currentRides.length * 15;
      }
    });
  },
});

export const { setAssignments, updateAssignment, clearError } = ddAssignmentsSlice.actions;

// Selectors
import type { RootState } from '../store';

export const selectAssignments = (state: RootState) => state.ddAssignments.assignments;
export const selectMyAssignment = (state: RootState) => state.ddAssignments.myAssignment;
export const selectStats = (state: RootState) => state.ddAssignments.stats;
export const selectLoading = (state: RootState) => state.ddAssignments.loading;
export const selectError = (state: RootState) => state.ddAssignments.error;

// Selector to get current DD's assigned rides (ride IDs from myAssignment)
export const selectAssignedRideIds = (state: RootState) =>
  state.ddAssignments.myAssignment?.currentRides ?? [];

export default ddAssignmentsSlice.reducer;
