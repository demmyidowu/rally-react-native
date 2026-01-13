/**
 * Firestore Service
 *
 * Core service layer for all Firestore CRUD operations in the Rally app.
 * Provides type-safe methods for interacting with users, rides, events, DD assignments, and chapters.
 *
 * Features:
 * - Full CRUD operations for all collections
 * - Real-time listeners with cleanup functions
 * - Type-safe query builders
 * - Comprehensive error handling
 * - GeoPoint and Timestamp conversions
 * - Optimized queries with proper indexes
 * - Batch operations with automatic chunking
 *
 * Based on Swift FirestoreService.swift with Firebase v11 modular SDK
 *
 * @module services/firestoreService
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
  DocumentData,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  Timestamp,
  GeoPoint,
  serverTimestamp,
  QueryConstraint,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  User,
  Chapter,
  Event,
  EventStatus,
  Ride,
  RideStatus,
  DDAssignment,
  AdminAlert,
  YearTransitionLog,
} from '../models';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for Firestore operations
 */
export class FirestoreServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FirestoreServiceError';
  }
}

export enum FirestoreErrorCode {
  DOCUMENT_NOT_FOUND = 'document-not-found',
  DECODING_FAILED = 'decoding-failed',
  ENCODING_FAILED = 'encoding-failed',
  NETWORK_ERROR = 'network-error',
  PERMISSION_DENIED = 'permission-denied',
  INVALID_DATA = 'invalid-data',
  BATCH_LIMIT_EXCEEDED = 'batch-limit-exceeded',
  TRANSACTION_FAILED = 'transaction-failed',
  UNKNOWN_ERROR = 'unknown-error',
}

// ============================================================================
// Query Filter Types
// ============================================================================

export interface QueryFilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id: string;
  data?: DocumentData;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Firestore errors to user-friendly error messages
 */
const mapFirestoreError = (error: any, context: string): FirestoreServiceError => {
  const errorCode = error?.code || 'unknown';

  switch (errorCode) {
    case 'not-found':
      return new FirestoreServiceError(
        'The requested document could not be found.',
        FirestoreErrorCode.DOCUMENT_NOT_FOUND,
        error
      );
    case 'permission-denied':
    case 'unauthenticated':
      return new FirestoreServiceError(
        "You don't have permission to perform this operation.",
        FirestoreErrorCode.PERMISSION_DENIED,
        error
      );
    case 'unavailable':
    case 'deadline-exceeded':
      return new FirestoreServiceError(
        `Network error: ${error.message}`,
        FirestoreErrorCode.NETWORK_ERROR,
        error
      );
    default:
      return new FirestoreServiceError(
        `An error occurred while ${context}: ${error.message}`,
        FirestoreErrorCode.UNKNOWN_ERROR,
        error
      );
  }
};

/**
 * Convert Firestore document to typed object with id
 */
const convertDocToModel = <T>(docSnap: any): T => {
  return { id: docSnap.id, ...docSnap.data() } as T;
};

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Create or update a document in Firestore
 *
 * @param collectionName - Firestore collection name
 * @param document - Document with id field
 * @param merge - Whether to merge with existing data
 */
export const saveDocument = async <T extends { id: string }>(
  collectionName: string,
  document: T,
  merge: boolean = false
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, document.id);
    await setDoc(docRef, document, { merge });
  } catch (error) {
    throw mapFirestoreError(error, `saving document to ${collectionName}`);
  }
};

/**
 * Fetch a single document by ID
 *
 * @param collectionName - Firestore collection name
 * @param documentId - Document ID
 * @returns Document data or null if not found
 */
export const fetchDocument = async <T>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return convertDocToModel<T>(docSnap);
  } catch (error) {
    throw mapFirestoreError(error, `fetching document from ${collectionName}`);
  }
};

/**
 * Delete a document by ID
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    throw mapFirestoreError(error, `deleting document from ${collectionName}`);
  }
};

/**
 * Query documents with filters and ordering
 */
export const queryDocuments = async <T>(
  collectionName: string,
  filters: QueryFilter[] = [],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  limitCount?: number
): Promise<T[]> => {
  try {
    const constraints: QueryConstraint[] = [];

    // Add filters
    filters.forEach((filter) => {
      constraints.push(where(filter.field, filter.operator, filter.value));
    });

    // Add ordering
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    // Add limit
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => convertDocToModel<T>(doc));
  } catch (error) {
    throw mapFirestoreError(error, `querying ${collectionName}`);
  }
};

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Execute multiple write operations in a batch (max 500 operations)
 */
export const executeBatch = async (operations: BatchOperation[]): Promise<void> => {
  if (operations.length > 500) {
    throw new FirestoreServiceError(
      'Batch operation exceeds 500 operation limit.',
      FirestoreErrorCode.BATCH_LIMIT_EXCEEDED
    );
  }

  try {
    const batch = writeBatch(db);

    for (const operation of operations) {
      const docRef = doc(db, operation.collection, operation.id);

      switch (operation.type) {
        case 'create':
        case 'update':
          if (!operation.data) {
            throw new Error('Data required for create/update operations');
          }
          batch.set(docRef, operation.data, { merge: operation.type === 'update' });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }

    await batch.commit();
  } catch (error) {
    throw mapFirestoreError(error, 'executing batch operations');
  }
};

/**
 * Execute large batch operations (automatically splits into chunks of 500)
 */
export const executeLargeBatch = async (operations: BatchOperation[]): Promise<void> => {
  const chunks: BatchOperation[][] = [];
  for (let i = 0; i < operations.length; i += 500) {
    chunks.push(operations.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    await executeBatch(chunk);
  }
};

// ============================================================================
// User Operations
// ============================================================================

/**
 * Create a new user in Firestore
 *
 * @param user - User object to create
 * @throws {FirestoreServiceError} If creation fails
 */
export const createUser = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'creating user');
  }
};

/**
 * Get a user by ID
 *
 * @param userId - User ID to fetch
 * @returns User object or null if not found
 */
export const getUser = async (userId: string): Promise<User | null> => {
  return await fetchDocument<User>('users', userId);
};

/**
 * Alias for legacy code compatibility
 */
export const fetchUser = getUser;

/**
 * Update a user
 *
 * @param userId - User ID to update
 * @param data - Partial user data to update
 */
export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating user');
  }
};

/**
 * Delete a user
 *
 * @param userId - User ID to delete
 */
export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDocument('users', userId);
};

/**
 * Update user's FCM token for push notifications
 *
 * @param userId - User ID
 * @param token - FCM token
 */
export const updateUserFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      fcmToken: token,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating FCM token');
  }
};

/**
 * Get all members of a chapter
 *
 * @param chapterId - Chapter ID
 * @returns Array of users ordered by name
 */
export const fetchMembers = async (chapterId: string): Promise<User[]> => {
  return await queryDocuments<User>(
    'users',
    [{ field: 'chapterId', operator: '==', value: chapterId }],
    'name',
    'asc'
  );
};

/**
 * Subscribe to user updates in real-time
 *
 * @param userId - User ID to listen to
 * @param callback - Function called when user data changes
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUser = (
  userId: string,
  callback: (user: User | null) => void
): Unsubscribe => {
  const userRef = doc(db, 'users', userId);

  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(convertDocToModel<User>(snapshot));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in user subscription:', error);
      callback(null);
    }
  );
};

/**
 * Alias for real-time listener
 */
export const observeUser = subscribeToUser;

// ============================================================================
// Chapter Operations
// ============================================================================

/**
 * Get a chapter by ID
 *
 * @param chapterId - Chapter ID to fetch
 * @returns Chapter object or null if not found
 */
export const getChapter = async (chapterId: string): Promise<Chapter | null> => {
  return await fetchDocument<Chapter>('chapters', chapterId);
};

/**
 * Alias for legacy code compatibility
 */
export const fetchChapter = getChapter;

/**
 * Get all chapters ordered by name
 */
export const fetchChapters = async (): Promise<Chapter[]> => {
  return await queryDocuments<Chapter>('chapters', [], 'name', 'asc');
};

/**
 * Create a new chapter
 */
export const createChapter = async (chapter: Chapter): Promise<void> => {
  try {
    const chapterRef = doc(db, 'chapters', chapter.id);
    await setDoc(chapterRef, {
      ...chapter,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'creating chapter');
  }
};

/**
 * Update a chapter
 *
 * @param chapterId - Chapter ID to update
 * @param data - Partial chapter data to update
 */
export const updateChapter = async (
  chapterId: string,
  data: Partial<Chapter>
): Promise<void> => {
  try {
    const docRef = doc(db, 'chapters', chapterId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating chapter');
  }
};

/**
 * Subscribe to a chapter in real-time
 */
export const subscribeToChapter = (
  chapterId: string,
  callback: (chapter: Chapter | null) => void
): Unsubscribe => {
  const chapterRef = doc(db, 'chapters', chapterId);

  return onSnapshot(
    chapterRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(convertDocToModel<Chapter>(snapshot));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in chapter subscription:', error);
      callback(null);
    }
  );
};

/**
 * Alias for real-time listener
 */
export const observeChapter = subscribeToChapter;

// ============================================================================
// Event Operations
// ============================================================================

/**
 * Create a new event
 *
 * @param event - Event object without ID
 * @returns The generated event ID
 */
export const createEvent = async (event: Omit<Event, 'id'>): Promise<string> => {
  try {
    const eventsRef = collection(db, 'events');
    const newEventRef = doc(eventsRef);

    await setDoc(newEventRef, {
      ...event,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newEventRef.id;
  } catch (error) {
    throw mapFirestoreError(error, 'creating event');
  }
};

/**
 * Get an event by ID
 *
 * @param eventId - Event ID to fetch
 * @returns Event object or null if not found
 */
export const getEvent = async (eventId: string): Promise<Event | null> => {
  return await fetchDocument<Event>('events', eventId);
};

/**
 * Alias for legacy code compatibility
 */
export const fetchEvent = getEvent;

/**
 * Update an event
 *
 * @param eventId - Event ID to update
 * @param data - Partial event data to update
 */
export const updateEvent = async (
  eventId: string,
  data: Partial<Event>
): Promise<void> => {
  try {
    const docRef = doc(db, 'events', eventId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating event');
  }
};

/**
 * Delete an event
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteDocument('events', eventId);
};

/**
 * Get the active event for a chapter
 *
 * Returns the most recent active event
 *
 * @param chapterId - Chapter ID
 * @returns Active event or null if none found
 */
export const getActiveEvent = async (chapterId: string): Promise<Event | null> => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('chapterId', '==', chapterId),
      where('status', '==', EventStatus.ACTIVE),
      orderBy('date', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return convertDocToModel<Event>(querySnapshot.docs[0]);
  } catch (error) {
    throw mapFirestoreError(error, 'getting active event');
  }
};

/**
 * Get active events for a chapter
 */
export const fetchEvents = async (chapterId: string): Promise<Event[]> => {
  return await queryDocuments<Event>(
    'events',
    [
      { field: 'chapterId', operator: '==', value: chapterId },
      { field: 'status', operator: '==', value: EventStatus.ACTIVE },
    ],
    'date',
    'desc'
  );
};

/**
 * Get all events for a chapter (active and inactive)
 *
 * @param chapterId - Chapter ID
 * @returns Array of all events ordered by date (newest first)
 */
export const getAllEvents = async (chapterId: string): Promise<Event[]> => {
  return await queryDocuments<Event>(
    'events',
    [{ field: 'chapterId', operator: '==', value: chapterId }],
    'date',
    'desc'
  );
};

/**
 * Alias for legacy code compatibility
 */
export const fetchAllEvents = getAllEvents;

/**
 * Subscribe to active event for a chapter in real-time
 *
 * @param chapterId - Chapter ID to listen to
 * @param callback - Function called when active event changes
 * @returns Unsubscribe function
 */
export const subscribeToActiveEvent = (
  chapterId: string,
  callback: (event: Event | null) => void
): Unsubscribe => {
  const eventsRef = collection(db, 'events');
  const q = query(
    eventsRef,
    where('chapterId', '==', chapterId),
    where('status', '==', EventStatus.ACTIVE),
    orderBy('date', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        callback(convertDocToModel<Event>(snapshot.docs[0]));
      }
    },
    (error) => {
      console.error('Error in active event subscription:', error);
      callback(null);
    }
  );
};

/**
 * Subscribe to active events for a chapter
 */
export const observeActiveEvents = (
  chapterId: string,
  callback: (events: Event[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'events'),
    where('chapterId', '==', chapterId),
    where('status', '==', EventStatus.ACTIVE),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events = snapshot.docs.map((doc) => convertDocToModel<Event>(doc));
      callback(events);
    },
    (error) => {
      console.error('Error in active events subscription:', error);
      callback([]);
    }
  );
};

// ============================================================================
// Ride Operations
// ============================================================================

/**
 * Create a new ride request
 *
 * @param ride - Ride object without ID (ID will be auto-generated)
 * @returns The generated ride ID
 */
export const createRide = async (ride: Omit<Ride, 'id'>): Promise<string> => {
  try {
    const ridesRef = collection(db, 'rides');
    const newRideRef = doc(ridesRef);

    await setDoc(newRideRef, {
      ...ride,
      requestedAt: serverTimestamp(),
    });

    return newRideRef.id;
  } catch (error) {
    throw mapFirestoreError(error, 'creating ride');
  }
};

/**
 * Get a ride by ID
 *
 * @param rideId - Ride ID to fetch
 * @returns Ride object or null if not found
 */
export const getRide = async (rideId: string): Promise<Ride | null> => {
  return await fetchDocument<Ride>('rides', rideId);
};

/**
 * Alias for legacy code compatibility
 */
export const fetchRide = getRide;

/**
 * Update a ride
 *
 * @param rideId - Ride ID to update
 * @param data - Partial ride data to update
 */
export const updateRide = async (rideId: string, data: Partial<Ride>): Promise<void> => {
  try {
    const docRef = doc(db, 'rides', rideId);
    await updateDoc(docRef, data);
  } catch (error) {
    throw mapFirestoreError(error, 'updating ride');
  }
};

/**
 * Get all rides with a specific status
 *
 * @param status - Ride status to filter by
 * @returns Array of rides
 */
export const getRidesByStatus = async (status: RideStatus): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [{ field: 'status', operator: '==', value: status }],
    'priority',
    'desc'
  );
};

/**
 * Get all active rides for a specific DD
 *
 * Active = queued, assigned, or enroute
 *
 * @param ddId - DD user ID
 * @returns Array of active rides
 */
export const getActiveRidesForDD = async (ddId: string, eventId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [
      { field: 'ddId', operator: '==', value: ddId },
      { field: 'eventId', operator: '==', value: eventId },
      {
        field: 'status',
        operator: 'in',
        value: [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE],
      },
    ],
    'requestedAt',
    'desc'
  );
};

/**
 * Alias for legacy code
 */
export const fetchDDRides = getActiveRidesForDD;

/**
 * Get all active rides for a specific rider
 *
 * @param riderId - Rider user ID
 * @returns Array of active rides
 */
export const getActiveRidesForRider = async (riderId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [
      { field: 'riderId', operator: '==', value: riderId },
      {
        field: 'status',
        operator: 'in',
        value: [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE],
      },
    ],
    'requestedAt',
    'desc'
  );
};

/**
 * Get ride history for a rider
 */
export const fetchRiderRides = async (riderId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [{ field: 'riderId', operator: '==', value: riderId }],
    'requestedAt',
    'desc',
    50
  );
};

/**
 * Get all active rides for an event
 *
 * Ordered by priority (highest first) for queue display
 *
 * @param eventId - Event ID
 * @returns Array of active rides
 */
export const getActiveRidesForEvent = async (eventId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [
      { field: 'eventId', operator: '==', value: eventId },
      {
        field: 'status',
        operator: 'in',
        value: [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE],
      },
    ],
    'priority',
    'desc'
  );
};

/**
 * Alias for legacy code
 */
export const fetchActiveRides = getActiveRidesForEvent;

/**
 * Subscribe to active rides for an event in real-time
 *
 * @param eventId - Event ID to listen to
 * @param callback - Function called when rides change
 * @returns Unsubscribe function
 */
export const subscribeToActiveRides = (
  eventId: string,
  callback: (rides: Ride[]) => void
): Unsubscribe => {
  const ridesRef = collection(db, 'rides');
  const q = query(
    ridesRef,
    where('eventId', '==', eventId),
    where('status', 'in', [
      RideStatus.QUEUED,
      RideStatus.ASSIGNED,
      RideStatus.ENROUTE,
    ]),
    orderBy('priority', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rides = snapshot.docs.map((doc) => convertDocToModel<Ride>(doc));
      callback(rides);
    },
    (error) => {
      console.error('Error in active rides subscription:', error);
      callback([]);
    }
  );
};

/**
 * Alias for real-time listener
 */
export const observeActiveRides = subscribeToActiveRides;

/**
 * Subscribe to a specific ride
 */
export const observeRide = (
  rideId: string,
  callback: (ride: Ride | null) => void
): Unsubscribe => {
  const docRef = doc(db, 'rides', rideId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(convertDocToModel<Ride>(snapshot));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in ride subscription:', error);
      callback(null);
    }
  );
};

// ============================================================================
// DD Assignment Operations (Subcollection: events/{eventId}/ddAssignments/{userId})
// ============================================================================

/**
 * Create a DD assignment for an event
 *
 * Stored as: events/{eventId}/ddAssignments/{userId}
 *
 * @param eventId - Event ID
 * @param assignment - DD assignment object without ID
 */
export const createDDAssignment = async (
  eventId: string,
  assignment: Omit<DDAssignment, 'id'>
): Promise<void> => {
  try {
    const assignmentRef = doc(
      db,
      'events',
      eventId,
      'ddAssignments',
      assignment.ddId
    );

    await setDoc(assignmentRef, {
      ...assignment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'creating DD assignment');
  }
};

/**
 * Get a DD assignment
 *
 * @param eventId - Event ID
 * @param userId - User ID
 * @returns DD assignment or null if not found
 */
export const getDDAssignment = async (
  eventId: string,
  userId: string
): Promise<DDAssignment | null> => {
  try {
    const assignmentRef = doc(db, 'events', eventId, 'ddAssignments', userId);
    const assignmentSnap = await getDoc(assignmentRef);

    if (!assignmentSnap.exists()) {
      return null;
    }

    return convertDocToModel<DDAssignment>(assignmentSnap);
  } catch (error) {
    throw mapFirestoreError(error, 'getting DD assignment');
  }
};

/**
 * Alias for legacy code
 */
export const fetchDDAssignment = getDDAssignment;

/**
 * Update a DD assignment
 *
 * @param eventId - Event ID
 * @param userId - User ID
 * @param data - Partial DD assignment data to update
 */
export const updateDDAssignment = async (
  eventId: string,
  userId: string,
  data: Partial<DDAssignment>
): Promise<void> => {
  try {
    const assignmentRef = doc(db, 'events', eventId, 'ddAssignments', userId);
    await updateDoc(assignmentRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating DD assignment');
  }
};

/**
 * Get all active DDs for an event
 *
 * Ordered by total rides completed (fewest first) for fair distribution
 *
 * @param eventId - Event ID
 * @returns Array of active DD assignments
 */
export const getActiveDDs = async (eventId: string): Promise<DDAssignment[]> => {
  try {
    const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
    const q = query(
      assignmentsRef,
      where('isActive', '==', true),
      orderBy('totalRidesCompleted', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => convertDocToModel<DDAssignment>(doc));
  } catch (error) {
    throw mapFirestoreError(error, 'getting active DDs');
  }
};

/**
 * Alias for legacy code
 */
export const fetchActiveDDAssignments = getActiveDDs;

/**
 * Get all DD assignments for an event (active and inactive)
 *
 * @param eventId - Event ID
 * @returns Array of all DD assignments
 */
export const getAllDDsForEvent = async (eventId: string): Promise<DDAssignment[]> => {
  try {
    const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
    const querySnapshot = await getDocs(assignmentsRef);

    return querySnapshot.docs.map((doc) => convertDocToModel<DDAssignment>(doc));
  } catch (error) {
    throw mapFirestoreError(error, 'getting all DD assignments for event');
  }
};

/**
 * Alias for legacy code
 */
export const fetchAllDDAssignments = getAllDDsForEvent;

/**
 * Toggle DD active status
 *
 * Updates isActive and increments inactiveToggles counter if going inactive
 *
 * @param eventId - Event ID
 * @param userId - User ID
 * @param isActive - New active status
 */
export const toggleDDActive = async (
  eventId: string,
  userId: string,
  isActive: boolean
): Promise<void> => {
  try {
    const assignmentRef = doc(db, 'events', eventId, 'ddAssignments', userId);
    const currentAssignment = await getDoc(assignmentRef);

    if (!currentAssignment.exists()) {
      throw new FirestoreServiceError(
        'DD assignment not found',
        FirestoreErrorCode.DOCUMENT_NOT_FOUND
      );
    }

    const updateData: any = {
      isActive,
      updatedAt: serverTimestamp(),
    };

    if (isActive) {
      updateData.lastActiveTimestamp = serverTimestamp();
    } else {
      updateData.lastInactiveTimestamp = serverTimestamp();
      // Increment inactive toggles counter
      updateData.inactiveToggles = increment(1);
    }

    await updateDoc(assignmentRef, updateData);
  } catch (error) {
    throw mapFirestoreError(error, 'toggling DD active status');
  }
};

/**
 * Subscribe to active DDs for an event in real-time
 *
 * @param eventId - Event ID to listen to
 * @param callback - Function called when active DDs change
 * @returns Unsubscribe function
 */
export const subscribeToActiveDDs = (
  eventId: string,
  callback: (dds: DDAssignment[]) => void
): Unsubscribe => {
  const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
  const q = query(
    assignmentsRef,
    where('isActive', '==', true),
    orderBy('totalRidesCompleted', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const dds = snapshot.docs.map((doc) => convertDocToModel<DDAssignment>(doc));
      callback(dds);
    },
    (error) => {
      console.error('Error in active DDs subscription:', error);
      callback([]);
    }
  );
};

/**
 * Alias for real-time listener
 */
export const observeActiveDDAssignments = subscribeToActiveDDs;

// ============================================================================
// Admin Alerts
// ============================================================================

/**
 * Get admin alerts for a chapter
 */
export const fetchAdminAlerts = async (
  chapterId: string,
  unreadOnly: boolean = false
): Promise<AdminAlert[]> => {
  const filters: QueryFilter[] = [{ field: 'chapterId', operator: '==', value: chapterId }];

  if (unreadOnly) {
    filters.push({ field: 'isRead', operator: '==', value: false });
  }

  return await queryDocuments<AdminAlert>('adminAlerts', filters, 'createdAt', 'desc');
};

/**
 * Create an admin alert
 */
export const createAdminAlert = async (alert: AdminAlert): Promise<void> => {
  await saveDocument('adminAlerts', alert);
};

/**
 * Mark an alert as read
 */
export const markAlertAsRead = async (alertId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'adminAlerts', alertId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    throw mapFirestoreError(error, 'marking alert as read');
  }
};

/**
 * Subscribe to unread admin alerts for a chapter
 */
export const observeAdminAlerts = (
  chapterId: string,
  callback: (alerts: AdminAlert[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'adminAlerts'),
    where('chapterId', '==', chapterId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts = snapshot.docs.map((doc) => convertDocToModel<AdminAlert>(doc));
      callback(alerts);
    },
    (error) => {
      console.error('Error in admin alerts subscription:', error);
      callback([]);
    }
  );
};

// ============================================================================
// Year Transition Logs
// ============================================================================

/**
 * Get year transition logs for a chapter
 */
export const fetchYearTransitionLogs = async (
  chapterId: string
): Promise<YearTransitionLog[]> => {
  return await queryDocuments<YearTransitionLog>(
    'yearTransitionLogs',
    [{ field: 'chapterId', operator: '==', value: chapterId }],
    'executionDate',
    'desc',
    50
  );
};

/**
 * Create a year transition log
 */
export const createYearTransitionLog = async (log: YearTransitionLog): Promise<void> => {
  await saveDocument('yearTransitionLogs', log);
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a GeoPoint from latitude and longitude
 *
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Firebase GeoPoint
 */
export function createGeoPoint(latitude: number, longitude: number): GeoPoint {
  return new GeoPoint(latitude, longitude);
}

/**
 * Create a Timestamp from a Date
 *
 * @param date - JavaScript Date object
 * @returns Firebase Timestamp
 */
export function createTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Convert Timestamp to Date
 *
 * @param timestamp - Firebase Timestamp
 * @returns JavaScript Date object
 */
export function timestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

/**
 * Get current server timestamp
 *
 * @returns Server timestamp FieldValue
 */
export function getServerTimestamp(): any {
  return serverTimestamp();
}
