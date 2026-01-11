# Rally Migration - Quick Reference Guide

**For**: React Native developers migrating from Swift  
**Date**: 2026-01-11

---

## Critical Algorithms (DO NOT MODIFY)

### 1. Priority Calculation
**File**: `src/services/rideQueueService.ts`

```typescript
calculatePriority(
  classYear: number,
  waitMinutes: number,
  isEmergency: boolean,
  isSameChapter: boolean
): number {
  // Emergency always first
  if (isEmergency) return 9999;
  
  // Cross-chapter: only wait time matters
  if (!isSameChapter) {
    return waitMinutes * 0.5;
  }
  
  // Same chapter: class year + wait time
  return (classYear * 10) + (waitMinutes * 0.5);
}
```

### 2. DD Assignment
**File**: `src/services/ddAssignmentService.ts`

```typescript
async findBestDD(eventId: string): Promise<DDAssignment | null> {
  // 1. Get all active DDs
  const activeDDs = await fetchActiveDDAssignments(eventId);
  
  // 2. Calculate wait time for each
  const waitTimes = await Promise.all(
    activeDDs.map(dd => calculateWaitTime(dd))
  );
  
  // 3. Return DD with MINIMUM wait time
  return activeDDs[waitTimes.indexOf(Math.min(...waitTimes))];
}

// Wait time = active rides × 15 minutes
async calculateWaitTime(dd: DDAssignment): Promise<number> {
  const activeRides = await getActiveRides(dd.userId);
  return activeRides.length * 15;
}
```

### 3. Location Capture
**File**: `src/services/locationService.ts`

```typescript
// ONE-TIME CAPTURE ONLY
async captureLocationOnce(): Promise<LocationCoordinate> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Permission denied');
  }
  
  // Single capture with timeout
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
    timeInterval: 10000, // 10 second timeout
  });
  
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
```

---

## Data Models (TypeScript)

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;                // Must end with @ksu.edu
  phoneNumber: string;          // E.164: +15551234567
  chapterId: string;
  role: 'admin' | 'member';
  classYear: 1 | 2 | 3 | 4;    // 1=freshman, 4=senior
  isEmailVerified: boolean;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Ride
```typescript
interface Ride {
  id: string;
  riderId: string;
  ddId?: string;
  chapterId: string;
  eventId: string;
  pickupLocation: GeoPoint;
  pickupAddress: string;
  dropoffAddress?: string;
  status: 'queued' | 'assigned' | 'enroute' | 'completed' | 'cancelled';
  priority: number;
  isEmergency: boolean;
  estimatedWaitTime?: number;   // Minutes
  queuePosition?: number;       // Overall position across ALL DDs
  requestedAt: Date;
  assignedAt?: Date;
  enrouteAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
}
```

### Event
```typescript
interface Event {
  id: string;
  name: string;
  chapterId: string;
  date: Date;
  allowedChapterIds: string[];  // ["ALL"] or specific IDs
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### DDAssignment
```typescript
interface DDAssignment {
  id: string;                   // Same as userId
  userId: string;
  eventId: string;
  photoURL?: string;
  carDescription?: string;
  isActive: boolean;
  inactiveToggles: number;      // Track frequency
  lastActiveTimestamp?: Date;
  lastInactiveTimestamp?: Date;
  totalRidesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Firebase Integration

### Initialization
**File**: `src/config/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  // From Firebase Console
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Development: Connect to emulators
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Firestore Queries
```typescript
// Fetch active rides
const ridesRef = collection(db, 'rides');
const q = query(
  ridesRef,
  where('eventId', '==', eventId),
  where('status', 'in', ['queued', 'assigned', 'enroute']),
  orderBy('priority', 'desc')
);

const snapshot = await getDocs(q);
const rides = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
})) as Ride[];
```

### Real-Time Listeners
```typescript
// Subscribe to ride updates
const unsubscribe = onSnapshot(q, (snapshot) => {
  const rides = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Ride[];
  
  dispatch(setActiveRides(rides));
});

// Cleanup
return unsubscribe;
```

---

## Redux Setup

### Store Configuration
**File**: `src/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import riderReducer from './slices/riderSlice';
import ddReducer from './slices/ddSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rider: riderReducer,
    dd: ddReducer,
    admin: adminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Slice Example
**File**: `src/store/slices/riderSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RiderState {
  activeRide: Ride | null;
  queuePosition: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RiderState = {
  activeRide: null,
  queuePosition: null,
  isLoading: false,
  error: null,
};

export const riderSlice = createSlice({
  name: 'rider',
  initialState,
  reducers: {
    setActiveRide: (state, action: PayloadAction<Ride | null>) => {
      state.activeRide = action.payload;
    },
    setQueuePosition: (state, action: PayloadAction<number | null>) => {
      state.queuePosition = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setActiveRide, setQueuePosition, setLoading, setError } = riderSlice.actions;
export default riderSlice.reducer;
```

---

## Navigation

### Navigator Setup
**File**: `src/navigation/AppNavigator.tsx`

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
function MainTabs() {
  const user = useSelector((state: RootState) => state.auth.currentUser);
  
  return (
    <Tab.Navigator>
      {/* Dynamic tab based on role */}
      <Tab.Screen 
        name="Dashboard" 
        component={getDashboardComponent(user)} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root navigator
export function AppNavigator() {
  const user = useSelector((state: RootState) => state.auth.currentUser);
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        user.isEmailVerified ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

---

## Testing

### Unit Test Example
**File**: `__tests__/services/rideQueueService.test.ts`

```typescript
import { RideQueueService } from '../../src/services/rideQueueService';

describe('RideQueueService', () => {
  const service = new RideQueueService();
  
  describe('calculatePriority', () => {
    it('should return 9999 for emergency rides', () => {
      const priority = service.calculatePriority(1, 5, true, true);
      expect(priority).toBe(9999);
    });
    
    it('should calculate same-chapter priority correctly', () => {
      // Senior (4) waiting 5 min: (4 × 10) + (5 × 0.5) = 42.5
      const priority = service.calculatePriority(4, 5, false, true);
      expect(priority).toBe(42.5);
    });
    
    it('should calculate cross-chapter priority correctly', () => {
      // Any class year waiting 5 min: 5 × 0.5 = 2.5
      const priority = service.calculatePriority(4, 5, false, false);
      expect(priority).toBe(2.5);
    });
    
    it('should handle freshman waiting 15 min', () => {
      // (1 × 10) + (15 × 0.5) = 17.5
      const priority = service.calculatePriority(1, 15, false, true);
      expect(priority).toBe(17.5);
    });
  });
});
```

---

## Common Patterns

### Error Handling
```typescript
try {
  const ride = await rideRequestService.createRide(data);
  dispatch(setActiveRide(ride));
} catch (error) {
  if (error instanceof FirebaseError) {
    // Handle Firebase errors
    dispatch(setError(error.message));
  } else if (error instanceof LocationError) {
    // Handle location errors
    Alert.alert('Location Error', error.message);
  } else {
    // Generic error
    dispatch(setError('An unexpected error occurred'));
  }
}
```

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

async function handleRideRequest() {
  setIsLoading(true);
  try {
    const location = await locationService.captureLocationOnce();
    const ride = await rideRequestService.createRide({
      ...formData,
      pickupLocation: location,
    });
    dispatch(setActiveRide(ride));
  } catch (error) {
    handleError(error);
  } finally {
    setIsLoading(false);
  }
}
```

### Form Validation
```typescript
// KSU email validation
const validateKSUEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@ksu.edu');
};

// Phone number formatting (E.164)
const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return `+1${digits}`;
};
```

---

## Environment Setup

### Development
```bash
# Start Expo
npm start

# Start Firebase emulators
firebase emulators:start

# Run tests
npm test

# Type check
npm run tsc
```

### Firebase Emulator URLs
- Firestore: `http://localhost:8080`
- Auth: `http://localhost:9099`
- Functions: `http://localhost:5001`
- UI: `http://localhost:4000`

---

## Key Constants

```typescript
// Priority weights
export const EMERGENCY_PRIORITY = 9999;
export const CLASS_YEAR_WEIGHT = 10;
export const WAIT_TIME_WEIGHT = 0.5;

// DD assignment
export const AVERAGE_RIDE_TIME_MINUTES = 15;

// Location
export const LOCATION_TIMEOUT_MS = 10000;

// DD monitoring
export const INACTIVE_TOGGLE_THRESHOLD = 5;
export const PROLONGED_INACTIVITY_MINUTES = 15;
export const TOGGLE_RESET_MINUTES = 30;
```

---

## Troubleshooting

### Issue: Location capture fails
- Check permissions in `app.json`
- Ensure emulator has location set
- Check timeout settings

### Issue: Firestore connection error
- Verify emulator is running
- Check `__DEV__` flag
- Verify emulator URLs

### Issue: Redux state not updating
- Check if reducer is registered
- Verify action is dispatched
- Use Redux DevTools

### Issue: Priority calculation wrong
- Check for floating-point precision
- Verify isSameChapter logic
- Test with known examples

---

## Resources

- **Full Analysis**: `SWIFT_APP_ANALYSIS.md`
- **Migration Summary**: `MIGRATION_SUMMARY.md`
- **Project Config**: `CLAUDE.md`
- **Swift Source**: `/Users/didowu/DDRideApp/`

