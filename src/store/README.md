# Redux Store

This directory contains the Redux Toolkit store configuration for the Rally React Native app.

## Structure

```
store/
├── store.ts                    # Main store configuration with Redux Persist
├── hooks.ts                    # Typed Redux hooks (useAppDispatch, useAppSelector)
├── index.ts                    # Central export for all store modules
└── slices/
    ├── authSlice.ts           # Authentication state
    ├── ridesSlice.ts          # Rides and queue state
    ├── eventsSlice.ts         # Events state
    └── ddAssignmentsSlice.ts  # DD assignments state
```

## Usage

### 1. Setup in App.tsx

Wrap your app with the Redux Provider and PersistGate:

```typescript
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {/* Your app components */}
      </PersistGate>
    </Provider>
  );
}
```

### 2. Using Typed Hooks

Always use the typed hooks instead of the default Redux hooks:

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch(); // Typed dispatch
  const user = useAppSelector((state) => state.auth.user); // Typed selector

  // ...
}
```

### 3. Dispatching Actions

#### Auth Actions

```typescript
import { signIn, signUp, logout, fetchUserProfile } from '../store';

// Sign in
dispatch(signIn({ email: 'user@ksu.edu', password: 'password' }));

// Sign up
dispatch(signUp({
  email: 'user@ksu.edu',
  password: 'password',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '123-456-7890',
  classYear: 2025,
}));

// Fetch user profile
dispatch(fetchUserProfile(userId));

// Logout
dispatch(logout());
```

#### Ride Actions

```typescript
import { requestRide, fetchActiveRides, assignRide, markEnRoute, completeRide } from '../store';

// Request a ride (rider)
dispatch(requestRide({
  riderId: user.uid,
  riderName: `${user.firstName} ${user.lastName}`,
  riderPhone: user.phoneNumber,
  classYear: user.classYear,
  pickupLocation: { latitude: 39.1910, longitude: -96.5861, address: '123 Main St' },
  dropoffLocation: { latitude: 39.1920, longitude: -96.5870, address: '456 Elm St' },
  isEmergency: false,
  notes: 'Please hurry',
}));

// Fetch active rides (admin/DD)
dispatch(fetchActiveRides());

// Assign ride to DD (admin)
dispatch(assignRide({
  rideId: 'ride123',
  ddId: 'dd456',
  ddName: 'Jane Smith',
  ddPhone: '987-654-3210',
}));

// Mark en route (DD)
dispatch(markEnRoute('ride123'));

// Complete ride (DD)
dispatch(completeRide('ride123'));
```

#### Event Actions

```typescript
import { createEvent, fetchActiveEvent, startEvent, endEvent } from '../store';

// Create event (admin)
dispatch(createEvent({
  name: 'Saturday Night',
  description: 'Weekend event',
  startTime: new Date('2024-03-15T20:00:00'),
  endTime: new Date('2024-03-16T02:00:00'),
  assignedDDs: ['dd1', 'dd2', 'dd3'],
  createdBy: user.uid,
}));

// Fetch active event
dispatch(fetchActiveEvent());

// Start event (admin)
dispatch(startEvent('event123'));

// End event (admin)
dispatch(endEvent('event123'));
```

#### DD Assignment Actions

```typescript
import { fetchDDAssignments, toggleDDActive } from '../store';

// Fetch DD assignments for event
dispatch(fetchDDAssignments('event123'));

// Toggle DD active status (DD)
dispatch(toggleDDActive({ assignmentId: 'assignment123', isActive: false }));
```

### 4. Selecting State

Use the `useAppSelector` hook to access state:

```typescript
import { useAppSelector } from '../store/hooks';

function MyComponent() {
  // Auth state
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authLoading = useAppSelector((state) => state.auth.loading);

  // Rides state
  const queue = useAppSelector((state) => state.rides.queue);
  const activeRides = useAppSelector((state) => state.rides.activeRides);
  const myRide = useAppSelector((state) => state.rides.myRide);

  // Events state
  const activeEvent = useAppSelector((state) => state.events.activeEvent);
  const allEvents = useAppSelector((state) => state.events.events);

  // DD assignments state
  const assignments = useAppSelector((state) => state.ddAssignments.assignments);
  const stats = useAppSelector((state) => state.ddAssignments.stats);

  // ...
}
```

## Real-time Updates

For real-time Firestore updates, use `onSnapshot` listeners in your components and dispatch actions to update the store:

```typescript
import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { setRides, updateRide, removeRide } from '../store';

function useRidesListener() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const q = query(
      collection(db, 'rides'),
      where('status', 'in', ['requested', 'assigned', 'en_route'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const ride = convertRideDocToRide(change.doc.id, change.doc.data());

        if (change.type === 'added' || change.type === 'modified') {
          dispatch(updateRide(ride));
        } else if (change.type === 'removed') {
          dispatch(removeRide(ride.id));
        }
      });
    });

    return () => unsubscribe();
  }, [dispatch]);
}
```

## State Persistence

Redux Persist is configured to persist only the **auth** state. Real-time data (rides, events, DD assignments) is **not persisted** and will be fetched fresh on app load.

### Why?

- Auth state should persist across app restarts (user stays logged in)
- Real-time data should always be fetched from Firestore to ensure data freshness
- Reduces storage usage and avoids stale data issues

## State Structure

### Auth State (`state.auth`)

```typescript
{
  user: User | null;              // Current user profile
  isAuthenticated: boolean;       // Auth status
  loading: boolean;               // Loading state
  error: string | null;           // Error message
  emailVerificationSent: boolean; // Email verification flag
}
```

### Rides State (`state.rides`)

```typescript
{
  rides: Ride[];           // All rides (requested, assigned, en_route)
  activeRides: Ride[];     // Rides with status: assigned, en_route
  queue: Ride[];           // Rides with status: requested (sorted by priority)
  myRide: Ride | null;     // Current user's active ride
  loading: boolean;        // Loading state
  error: string | null;    // Error message
}
```

### Events State (`state.events`)

```typescript
{
  activeEvent: Event | null; // Currently active event
  events: Event[];           // All events
  loading: boolean;          // Loading state
  error: string | null;      // Error message
}
```

### DD Assignments State (`state.ddAssignments`)

```typescript
{
  assignments: DDAssignment[];       // All DD assignments for active event
  myAssignment: DDAssignment | null; // Current DD's assignment
  stats: DDAssignmentStats[];        // Computed stats for each DD
  loading: boolean;                  // Loading state
  error: string | null;              // Error message
}
```

## Business Logic

### Queue Priority Algorithm

Priority is calculated when requesting a ride:

```
priority = (classYear × 10) + (waitMinutes × 0.5)
emergency priority = 9999
```

Implemented in `ridesSlice.ts` → `calculatePriority()`

### DD Assignment Algorithm

DDs are assigned based on **shortest wait time**:

- If DD has no active rides → 0 minutes wait
- If DD has active rides → sum estimated time for all queued/active rides
- Assign to DD with minimum wait time

This logic should be implemented in the DD assignment service or Cloud Function.

### Stats Computation

DD stats (in `ddAssignmentsSlice.ts`) are automatically computed:

```typescript
{
  ddId: string;
  ddName: string;
  totalRides: number;          // Completed rides
  currentRides: number;        // Active rides
  estimatedWaitMinutes: number; // currentRides × 15 minutes
  isActive: boolean;           // Currently accepting rides
}
```

## TypeScript Types

All slices are fully typed. Import types from the store:

```typescript
import type { RootState, AppDispatch } from '../store';
import type { AuthState, RidesState, EventsState, DDAssignmentsState } from '../store';
```

## Error Handling

Each slice has a `clearError` action to reset error state:

```typescript
import { clearAuthError, clearRidesError, clearEventsError, clearDDAssignmentsError } from '../store';

dispatch(clearAuthError());
dispatch(clearRidesError());
dispatch(clearEventsError());
dispatch(clearDDAssignmentsError());
```

## Development

### Redux DevTools

Redux DevTools are enabled in development mode (`__DEV__`). Install the React Native Debugger or use Flipper to inspect state and actions.

### Debugging

To debug state changes:

1. Open React Native Debugger
2. Go to Redux tab
3. Inspect actions and state changes
4. Time-travel through state history

## Best Practices

1. **Always use typed hooks** (`useAppDispatch`, `useAppSelector`)
2. **Use async thunks** for Firebase operations
3. **Handle loading states** in components
4. **Clear errors** after displaying to user
5. **Use real-time listeners** for live data updates
6. **Keep store normalized** (avoid nested duplicates)
7. **Use selectors** for derived state (consider `reselect` for memoization)

## Testing

Test Redux slices with Jest:

```typescript
import authReducer, { signIn, AuthState } from '../authSlice';

describe('authSlice', () => {
  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    emailVerificationSent: false,
  };

  it('should set loading to true on signIn.pending', () => {
    const action = { type: signIn.pending.type };
    const state = authReducer(initialState, action);
    expect(state.loading).toBe(true);
  });

  // ... more tests
});
```

## Migration Notes

This Redux setup replaces the Swift app's Combine-based state management with Redux Toolkit, providing:

- Centralized state management
- Type-safe actions and reducers
- Built-in async handling with thunks
- State persistence with Redux Persist
- DevTools integration for debugging
