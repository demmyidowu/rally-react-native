# Firebase Service Layer - Rally React Native

## Overview

This document describes the Firebase service layer for the Rally React Native app. The service layer provides comprehensive CRUD operations, real-time listeners, and business logic for managing the DD ride application.

## Files Created

### 1. Models (`src/models/`)

All TypeScript interfaces matching the Swift app's Firestore schema:

- **User.ts** - User model with KSU email validation
- **Chapter.ts** - Fraternity/sorority chapter model
- **Event.ts** - DD event/shift model
- **Ride.ts** - Ride request model with priority system
- **DDAssignment.ts** - DD assignment for events (subcollection)
- **AdminAlert.ts** - Admin notification model
- **YearTransitionLog.ts** - Year transition audit log
- **index.ts** - Centralized exports

### 2. Services (`src/services/`)

#### **firestoreService.ts** (NEW - 817 lines)

Comprehensive Firestore service with:

**Generic CRUD Operations:**
- `saveDocument()` - Create/update any document
- `fetchDocument()` - Fetch single document by ID
- `deleteDocument()` - Delete document by ID
- `queryDocuments()` - Query with filters, ordering, and limits

**Batch Operations:**
- `executeBatch()` - Execute up to 500 operations
- `executeLargeBatch()` - Auto-split large batches

**Users:**
- `createUser()` - Create user
- `fetchUser()` - Get user by ID
- `fetchMembers()` - Get chapter members
- `updateUser()` - Update user with auto timestamp
- `updateUserFCMToken()` - Update FCM token
- `deleteUser()` - Delete user

**Chapters:**
- `fetchChapter()` - Get chapter by ID
- `fetchChapters()` - Get all chapters
- `createChapter()` - Create chapter
- `updateChapter()` - Update chapter

**Events:**
- `fetchEvent()` - Get event by ID
- `fetchEvents()` - Get active events for chapter
- `fetchAllEvents()` - Get all events (active + completed)
- `createEvent()` - Create event
- `updateEvent()` - Update event
- `deleteEvent()` - Delete event

**Rides:**
- `fetchRide()` - Get ride by ID
- `fetchActiveRides()` - Get queued/assigned/enroute rides for event
- `fetchRiderRides()` - Get rides for specific rider
- `fetchDDRides()` - Get rides for specific DD
- `createRide()` - Create ride request
- `updateRide()` - Update ride status/details

**DD Assignments (Subcollection):**
- `fetchDDAssignment()` - Get DD assignment
- `fetchActiveDDAssignments()` - Get active DDs for event
- `fetchAllDDAssignments()` - Get all DDs for event
- `createDDAssignment()` - Create DD assignment
- `updateDDAssignment()` - Update DD status/rides

**Admin Alerts:**
- `fetchAdminAlerts()` - Get alerts (optionally unread only)
- `createAdminAlert()` - Create alert
- `markAlertAsRead()` - Mark alert as read

**Year Transition Logs:**
- `fetchYearTransitionLogs()` - Get transition history
- `createYearTransitionLog()` - Log transition

**Real-time Listeners:**
- `observeActiveRides()` - Listen to active rides for event
- `observeActiveDDAssignments()` - Listen to active DDs
- `observeAdminAlerts()` - Listen to unread alerts
- `observeChapter()` - Listen to chapter changes
- `observeActiveEvents()` - Listen to active events
- `observeUser()` - Listen to user changes
- `observeRide()` - Listen to ride changes

**Error Handling:**
- Custom `FirestoreServiceError` class
- User-friendly error messages
- Proper error mapping from Firebase errors

#### **authService.ts** (EXISTING - Enhanced)

Already implemented with:
- KSU email validation (@ksu.edu)
- Email verification enforcement
- Phone number formatting (E.164)
- Session management
- FCM token management

## Firestore Schema

### Collections

```typescript
// Top-level collections
users/{userId}
chapters/{chapterId}
events/{eventId}
rides/{rideId}
adminAlerts/{alertId}
yearTransitionLogs/{logId}

// Subcollection (NEW!)
events/{eventId}/ddAssignments/{userId}
```

### Key Differences from Swift App

**DD Assignments:**
- **Swift:** Stored in top-level `ddAssignments` collection
- **React Native:** Stored as subcollection under events for better organization
- Path: `events/{eventId}/ddAssignments/{userId}`

This design improves:
- Query performance (auto-scoped to event)
- Data organization
- Security rules (cascade permissions from event)

## Usage Examples

### 1. Create a Ride Request

```typescript
import { createRide } from '../services/firestoreService';
import { Ride, RideStatus } from '../models';
import { Timestamp, GeoPoint } from 'firebase/firestore';

const ride: Ride = {
  id: 'unique-ride-id',
  riderId: 'user-123',
  chapterId: 'sigma-chi',
  eventId: 'event-456',
  pickupLocation: new GeoPoint(39.1836, -96.5717), // K-State coordinates
  pickupAddress: '1234 College Ave, Manhattan, KS',
  status: RideStatus.QUEUED,
  priority: 45, // (classYear × 10) + (waitTime × 0.5)
  isEmergency: false,
  requestedAt: Timestamp.now(),
};

await createRide(ride);
```

### 2. Listen to Active Rides (Real-time)

```typescript
import { observeActiveRides } from '../services/firestoreService';

const unsubscribe = observeActiveRides(
  eventId,
  (rides) => {
    console.log('Active rides updated:', rides);
    // Update UI with new rides
  },
  (error) => {
    console.error('Error observing rides:', error);
  }
);

// Clean up listener when component unmounts
return () => unsubscribe();
```

### 3. Fetch Active DDs for Event

```typescript
import { fetchActiveDDAssignments } from '../services/firestoreService';

const activeDDs = await fetchActiveDDAssignments('event-456');
console.log(`${activeDDs.length} DDs are active`);
```

### 4. Update DD Status

```typescript
import { updateDDAssignment } from '../services/firestoreService';
import { serverTimestamp } from 'firebase/firestore';

await updateDDAssignment('event-456', {
  id: 'dd-user-id',
  isActive: false,
  inactiveToggles: 1,
  lastInactiveTimestamp: serverTimestamp(),
});
```

### 5. Batch Operations

```typescript
import { executeBatch } from '../services/firestoreService';

await executeBatch([
  { type: 'update', collection: 'rides', id: 'ride-1', data: { status: 'completed' } },
  { type: 'update', collection: 'rides', id: 'ride-2', data: { status: 'completed' } },
  { type: 'create', collection: 'adminAlerts', id: 'alert-1', data: { /* alert data */ } },
]);
```

### 6. Query with Filters

```typescript
import { queryDocuments } from '../services/firestoreService';
import { Ride, RideStatus } from '../models';

const emergencyRides = await queryDocuments<Ride>(
  'rides',
  [
    { field: 'eventId', operator: '==', value: 'event-456' },
    { field: 'isEmergency', operator: '==', value: true },
  ],
  'requestedAt',
  'desc'
);
```

## Error Handling

All service methods throw `FirestoreServiceError` with:
- User-friendly error messages
- Error codes from `FirestoreErrorCode` enum
- Original Firebase error for debugging

```typescript
import { fetchUser, FirestoreServiceError, FirestoreErrorCode } from '../services';

try {
  const user = await fetchUser('user-123');
} catch (error) {
  if (error instanceof FirestoreServiceError) {
    if (error.code === FirestoreErrorCode.DOCUMENT_NOT_FOUND) {
      console.log('User not found');
    } else if (error.code === FirestoreErrorCode.PERMISSION_DENIED) {
      console.log('Permission denied');
    }
  }
}
```

## Real-time Listener Cleanup

All `observe*` functions return an `Unsubscribe` function. Always clean up listeners:

```typescript
import { useEffect } from 'react';
import { observeActiveRides } from '../services';

useEffect(() => {
  const unsubscribe = observeActiveRides(
    eventId,
    (rides) => setRides(rides),
    (error) => console.error(error)
  );

  // IMPORTANT: Clean up on unmount
  return () => unsubscribe();
}, [eventId]);
```

## Timestamp Handling

Firebase Timestamps are automatically handled:

**Writing:**
```typescript
import { serverTimestamp } from 'firebase/firestore';

// Use serverTimestamp() for automatic server-side timestamps
await updateRide({
  id: 'ride-123',
  assignedAt: serverTimestamp(),
});
```

**Reading:**
```typescript
// Timestamps come back as Firebase Timestamp objects
const ride = await fetchRide('ride-123');
const date = ride.requestedAt.toDate(); // Convert to JS Date
```

## Security Rules Integration

The service respects Firestore security rules:
- Users can only read/write their own data (unless admin)
- Admins have full access
- Email must be verified for most operations
- KSU email domain enforced

See `/Users/didowu/DDRideApp/firestore.rules` for complete rules.

## Performance Optimization

**Composite Indexes Required:**
The following queries require composite indexes (see `firestore.indexes.json`):

1. Active rides by event + status + priority
2. DD rides by event + ddId + status
3. Active DD assignments by event + isActive + totalRidesCompleted

**Best Practices:**
- Use real-time listeners for live data
- Use one-time fetches for historical data
- Batch writes when possible (max 500 operations)
- Limit query results with `limitCount` parameter

## Next Steps

1. **Redux Integration** - Create Redux slices for state management
2. **React Hooks** - Create custom hooks for common operations
3. **Offline Support** - Firestore automatically caches data
4. **Cloud Functions** - Integrate with existing backend functions

## Migration Notes

### From Swift to React Native

**What Changed:**
- Firebase SDK: iOS SDK → Modular Web SDK (v11)
- Async patterns: Combine → async/await
- DD Assignments: Top-level collection → Subcollection
- Timestamps: `Date` → Firebase `Timestamp`

**What Stayed the Same:**
- Firestore schema (collections, field names)
- Business logic algorithms
- Security rules
- Cloud Functions

## Related Files

- Swift reference: `/Users/didowu/DDRideApp/ios/DDRide/Core/Services/FirestoreService.swift`
- Firebase config: `/Users/didowu/Desktop/Coding/rally-react-native/src/config/firebase.ts`
- Models: `/Users/didowu/Desktop/Coding/rally-react-native/src/models/`
- Other services: `/Users/didowu/Desktop/Coding/rally-react-native/src/services/`

## Author Notes

This service layer provides a solid foundation for the Rally React Native app. It maintains feature parity with the Swift app while leveraging React Native best practices.

For questions or enhancements, consult the Swift codebase or Firebase documentation.
