/**
 * Events Slice
 *
 * Manages event state:
 * - Active event
 * - All events (scheduled, active, completed)
 * - Real-time updates from Firestore
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Event, EventDocument, CreateEventRequest, EventStatus } from '../../models/Event';
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
  limit,
  Timestamp,
} from 'firebase/firestore';

// State interface
export interface EventsState {
  activeEvent: Event | null; // Currently active event
  events: Event[]; // All events
  loading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  activeEvent: null,
  events: [],
  loading: false,
  error: null,
};

// Helper: Convert Firestore EventDocument to Event
// Intentionally converts Timestamps to Dates for app use
const convertEventDocToEvent = (id: string, doc: EventDocument): Event => ({
  ...doc,
  id,
  date: (doc.date?.toDate?.() || doc.startTime?.toDate?.() || new Date()) as unknown as Timestamp,
  startTime: (doc.startTime?.toDate?.() || new Date()) as unknown as Timestamp,
  endTime: (doc.endTime?.toDate?.() || new Date()) as unknown as Timestamp,
  createdAt: (doc.createdAt?.toDate?.() || new Date()) as unknown as Timestamp,
  updatedAt: (doc.updatedAt?.toDate?.() || new Date()) as unknown as Timestamp,
});

// Async thunks

// Create event
export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (
    {
      name,
      description,
      location,
      startTime,
      endTime,
      assignedDDs,
      createdBy,
      allowAll,
      allowNonGreek,
      allowedOrganizationIds,
    }: CreateEventRequest & {
      createdBy: string;
      location?: string;
      allowAll?: boolean;
      allowNonGreek?: boolean;
      allowedOrganizationIds?: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const eventData: Omit<EventDocument, 'id'> = {
        name,
        description,
        location,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime || new Date()),
        status: EventStatus.SCHEDULED,
        assignedDDs,
        createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // Access controls
        allowAll: allowAll || false,
        allowNonGreek: allowNonGreek || false,
        allowedOrganizationIds: allowedOrganizationIds || [],
      };

      const docRef = await addDoc(collection(db, 'events'), eventData);
      const newEvent = convertEventDocToEvent(docRef.id, { ...eventData, id: docRef.id });
      return newEvent;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch active event
export const fetchActiveEvent = createAsyncThunk(
  'events/fetchActiveEvent',
  async (chapterId: string | undefined, { rejectWithValue }) => {
    try {
      let q;
      if (chapterId) {
        q = query(
          collection(db, 'events'),
          where('status', '==', EventStatus.ACTIVE),
          where('chapterId', '==', chapterId),
          orderBy('startTime', 'desc'),
          limit(1)
        );
      } else {
        q = query(
          collection(db, 'events'),
          where('status', '==', EventStatus.ACTIVE),
          orderBy('startTime', 'desc'),
          limit(1)
        );
      }

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const eventDoc = snapshot.docs[0];
      return convertEventDocToEvent(eventDoc.id, eventDoc.data() as EventDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch all events
export const fetchAllEvents = createAsyncThunk(
  'events/fetchAllEvents',
  async (_, { rejectWithValue }) => {
    try {
      const q = query(collection(db, 'events'), orderBy('startTime', 'desc'));

      const snapshot = await getDocs(q);
      const events: Event[] = snapshot.docs.map((doc) =>
        convertEventDocToEvent(doc.id, doc.data() as EventDocument)
      );

      return events;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Start event (set status to active)
export const startEvent = createAsyncThunk(
  'events/startEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        status: EventStatus.ACTIVE,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(eventRef);
      return convertEventDocToEvent(eventId, updatedDoc.data() as EventDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// End event (set status to completed)
export const endEvent = createAsyncThunk(
  'events/endEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        status: EventStatus.COMPLETED,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(eventRef);
      return convertEventDocToEvent(eventId, updatedDoc.data() as EventDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Cancel event
export const cancelEvent = createAsyncThunk(
  'events/cancelEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        status: EventStatus.CANCELLED,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(eventRef);
      return convertEventDocToEvent(eventId, updatedDoc.data() as EventDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update event
export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async (
    { eventId, updates }: { eventId: string; updates: Partial<Event> },
    { rejectWithValue }
  ) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      const updatedDoc = await getDoc(eventRef);
      return convertEventDocToEvent(eventId, updatedDoc.data() as EventDocument);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    // Set active event from real-time listener
    setActiveEvent: (state, action: PayloadAction<Event | null>) => {
      state.activeEvent = action.payload;
    },
    // Set all events from real-time listener
    setEvents: (state, action: PayloadAction<Event[]>) => {
      state.events = action.payload;
    },
    // Update single event (from real-time listener)
    updateEventInState: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      } else {
        state.events.push(action.payload);
      }

      // Update active event if it matches
      if (action.payload.status === EventStatus.ACTIVE) {
        state.activeEvent = action.payload;
      } else if (state.activeEvent?.id === action.payload.id) {
        state.activeEvent = null;
      }
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create event
    builder
      .addCase(createEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.events.push(action.payload);
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch active event
    builder
      .addCase(fetchActiveEvent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.activeEvent = action.payload;
        state.error = null;
      })
      .addCase(fetchActiveEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch all events
    builder
      .addCase(fetchAllEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
        // Set active event from fetched events
        const activeEvent = action.payload.find((e) => e.status === EventStatus.ACTIVE);
        state.activeEvent = activeEvent || null;
        state.error = null;
      })
      .addCase(fetchAllEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Start event
    builder.addCase(startEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      state.activeEvent = action.payload;
    });

    // End event
    builder.addCase(endEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      if (state.activeEvent?.id === action.payload.id) {
        state.activeEvent = null;
      }
    });

    // Cancel event
    builder.addCase(cancelEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      if (state.activeEvent?.id === action.payload.id) {
        state.activeEvent = null;
      }
    });

    // Update event
    builder.addCase(updateEvent.fulfilled, (state, action) => {
      const index = state.events.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      if (state.activeEvent?.id === action.payload.id) {
        state.activeEvent = action.payload;
      }
    });
  },
});

export const { setActiveEvent, setEvents, updateEventInState, clearError } = eventsSlice.actions;

// Selectors
import type { RootState } from '../store';

export const selectActiveEvent = (state: RootState) => state.events.activeEvent;
export const selectEvents = (state: RootState) => state.events.events;
export const selectLoading = (state: RootState) => state.events.loading;
export const selectError = (state: RootState) => state.events.error;

export default eventsSlice.reducer;
