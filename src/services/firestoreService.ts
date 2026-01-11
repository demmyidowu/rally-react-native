/**
 * Firestore Service
 *
 * Core Firebase Firestore service for Rally app
 * Provides CRUD operations, queries, batch operations, and real-time listeners
 *
 * Based on Swift FirestoreService.swift with Firebase v11 modular SDK
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
  Query,
  DocumentData,
  onSnapshot,
  Unsubscribe,
  writeBatch,
  Timestamp,
  serverTimestamp,
  QueryConstraint,
  FirestoreError,
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
// Custom Error Types
// ============================================================================

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
  const firestoreError = error as FirestoreError;

  switch (firestoreError?.code) {
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
 * Apply filters to a Firestore query
 */
const applyFilters = (baseQuery: Query, filters: QueryFilter[]): Query => {
  let q = baseQuery;
  for (const filter of filters) {
    q = query(q, where(filter.field, filter.operator, filter.value));
  }
  return q;
};

// ============================================================================
// Generic CRUD Operations
// ============================================================================

/**
 * Create or update a document in Firestore
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
 */
export const fetchDocument = async <T>(
  collectionName: string,
  documentId: string
): Promise<T> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new FirestoreServiceError(
        'Document not found',
        FirestoreErrorCode.DOCUMENT_NOT_FOUND
      );
    }

    return { id: docSnap.id, ...docSnap.data() } as T;
  } catch (error) {
    if (error instanceof FirestoreServiceError) {
      throw error;
    }
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

    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T)
    );
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
// Users
// ============================================================================

export const createUser = async (user: User): Promise<void> => {
  await saveDocument('users', user);
};

export const fetchUser = async (userId: string): Promise<User> => {
  return await fetchDocument<User>('users', userId);
};

export const fetchMembers = async (chapterId: string): Promise<User[]> => {
  return await queryDocuments<User>(
    'users',
    [{ field: 'chapterId', operator: '==', value: chapterId }],
    'name'
  );
};

export const updateUser = async (user: Partial<User> & { id: string }): Promise<void> => {
  try {
    const docRef = doc(db, 'users', user.id);
    await updateDoc(docRef, {
      ...user,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating user');
  }
};

export const updateUserFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { fcmToken: token });
  } catch (error) {
    throw mapFirestoreError(error, 'updating FCM token');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDocument('users', userId);
};

// ============================================================================
// Chapters
// ============================================================================

export const fetchChapter = async (chapterId: string): Promise<Chapter> => {
  return await fetchDocument<Chapter>('chapters', chapterId);
};

export const fetchChapters = async (): Promise<Chapter[]> => {
  return await queryDocuments<Chapter>('chapters', [], 'name');
};

export const createChapter = async (chapter: Chapter): Promise<void> => {
  await saveDocument('chapters', chapter);
};

export const updateChapter = async (
  chapter: Partial<Chapter> & { id: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'chapters', chapter.id);
    await updateDoc(docRef, {
      ...chapter,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating chapter');
  }
};

// ============================================================================
// Events
// ============================================================================

export const fetchEvent = async (eventId: string): Promise<Event> => {
  return await fetchDocument<Event>('events', eventId);
};

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

export const fetchAllEvents = async (chapterId: string): Promise<Event[]> => {
  return await queryDocuments<Event>(
    'events',
    [{ field: 'chapterId', operator: '==', value: chapterId }],
    'date',
    'desc'
  );
};

export const createEvent = async (event: Event): Promise<void> => {
  await saveDocument('events', event);
};

export const updateEvent = async (
  event: Partial<Event> & { id: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'events', event.id);
    await updateDoc(docRef, {
      ...event,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating event');
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await deleteDocument('events', eventId);
};

// ============================================================================
// Rides
// ============================================================================

export const fetchRide = async (rideId: string): Promise<Ride> => {
  return await fetchDocument<Ride>('rides', rideId);
};

export const fetchActiveRides = async (eventId: string): Promise<Ride[]> => {
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

export const fetchRiderRides = async (riderId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [{ field: 'riderId', operator: '==', value: riderId }],
    'requestedAt',
    'desc',
    50
  );
};

export const fetchDDRides = async (ddId: string, eventId: string): Promise<Ride[]> => {
  return await queryDocuments<Ride>(
    'rides',
    [
      { field: 'ddId', operator: '==', value: ddId },
      { field: 'eventId', operator: '==', value: eventId },
    ],
    'requestedAt',
    'desc'
  );
};

export const createRide = async (ride: Ride): Promise<void> => {
  await saveDocument('rides', ride);
};

export const updateRide = async (ride: Partial<Ride> & { id: string }): Promise<void> => {
  await saveDocument('rides', ride as Ride, true);
};

// ============================================================================
// DD Assignments (Subcollection)
// ============================================================================

export const fetchDDAssignment = async (
  eventId: string,
  userId: string
): Promise<DDAssignment> => {
  try {
    const docRef = doc(db, 'events', eventId, 'ddAssignments', userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new FirestoreServiceError(
        'DD Assignment not found',
        FirestoreErrorCode.DOCUMENT_NOT_FOUND
      );
    }

    return { id: docSnap.id, ...docSnap.data() } as DDAssignment;
  } catch (error) {
    if (error instanceof FirestoreServiceError) {
      throw error;
    }
    throw mapFirestoreError(error, 'fetching DD assignment');
  }
};

export const fetchActiveDDAssignments = async (eventId: string): Promise<DDAssignment[]> => {
  try {
    const q = query(
      collection(db, 'events', eventId, 'ddAssignments'),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as DDAssignment)
    );
  } catch (error) {
    throw mapFirestoreError(error, 'fetching active DD assignments');
  }
};

export const fetchAllDDAssignments = async (eventId: string): Promise<DDAssignment[]> => {
  try {
    const q = query(collection(db, 'events', eventId, 'ddAssignments'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as DDAssignment)
    );
  } catch (error) {
    throw mapFirestoreError(error, 'fetching all DD assignments');
  }
};

export const createDDAssignment = async (
  eventId: string,
  assignment: DDAssignment
): Promise<void> => {
  try {
    const docRef = doc(db, 'events', eventId, 'ddAssignments', assignment.id);
    await setDoc(docRef, assignment);
  } catch (error) {
    throw mapFirestoreError(error, 'creating DD assignment');
  }
};

export const updateDDAssignment = async (
  eventId: string,
  assignment: Partial<DDAssignment> & { id: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'events', eventId, 'ddAssignments', assignment.id);
    await updateDoc(docRef, {
      ...assignment,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw mapFirestoreError(error, 'updating DD assignment');
  }
};

// ============================================================================
// Admin Alerts
// ============================================================================

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

export const createAdminAlert = async (alert: AdminAlert): Promise<void> => {
  await saveDocument('adminAlerts', alert);
};

export const markAlertAsRead = async (alertId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'adminAlerts', alertId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    throw mapFirestoreError(error, 'marking alert as read');
  }
};

// ============================================================================
// Year Transition Logs
// ============================================================================

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

export const createYearTransitionLog = async (log: YearTransitionLog): Promise<void> => {
  await saveDocument('yearTransitionLogs', log);
};

// ============================================================================
// Real-time Listeners
// ============================================================================

/**
 * Listen to active rides for an event
 */
export const observeActiveRides = (
  eventId: string,
  callback: (rides: Ride[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'rides'),
    where('eventId', '==', eventId),
    where('status', 'in', [RideStatus.QUEUED, RideStatus.ASSIGNED, RideStatus.ENROUTE]),
    orderBy('priority', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rides = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ride));
      callback(rides);
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing active rides');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to active DD assignments for an event
 */
export const observeActiveDDAssignments = (
  eventId: string,
  callback: (assignments: DDAssignment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'events', eventId, 'ddAssignments'),
    where('isActive', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const assignments = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as DDAssignment)
      );
      callback(assignments);
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing DD assignments');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to unread admin alerts for a chapter
 */
export const observeAdminAlerts = (
  chapterId: string,
  callback: (alerts: AdminAlert[]) => void,
  onError?: (error: Error) => void
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
      const alerts = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AdminAlert)
      );
      callback(alerts);
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing admin alerts');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to a specific chapter
 */
export const observeChapter = (
  chapterId: string,
  callback: (chapter: Chapter) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const docRef = doc(db, 'chapters', chapterId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const chapter = { id: snapshot.id, ...snapshot.data() } as Chapter;
        callback(chapter);
      } else {
        onError?.(
          new FirestoreServiceError(
            'Chapter not found',
            FirestoreErrorCode.DOCUMENT_NOT_FOUND
          )
        );
      }
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing chapter');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to active events for a chapter
 */
export const observeActiveEvents = (
  chapterId: string,
  callback: (events: Event[]) => void,
  onError?: (error: Error) => void
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
      const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Event));
      callback(events);
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing active events');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to a specific user
 */
export const observeUser = (
  userId: string,
  callback: (user: User) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const docRef = doc(db, 'users', userId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const user = { id: snapshot.id, ...snapshot.data() } as User;
        callback(user);
      } else {
        onError?.(
          new FirestoreServiceError('User not found', FirestoreErrorCode.DOCUMENT_NOT_FOUND)
        );
      }
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing user');
      onError?.(mappedError);
    }
  );
};

/**
 * Listen to a specific ride
 */
export const observeRide = (
  rideId: string,
  callback: (ride: Ride) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const docRef = doc(db, 'rides', rideId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const ride = { id: snapshot.id, ...snapshot.data() } as Ride;
        callback(ride);
      } else {
        onError?.(
          new FirestoreServiceError('Ride not found', FirestoreErrorCode.DOCUMENT_NOT_FOUND)
        );
      }
    },
    (error) => {
      const mappedError = mapFirestoreError(error, 'observing ride');
      onError?.(mappedError);
    }
  );
};
