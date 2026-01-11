---
name: react-native-state-management
description: Redux Toolkit patterns for React Native apps. Use when setting up Redux store, creating slices, managing async operations with thunks, or integrating global state management.
---

# React Native State Management with Redux Toolkit

## When to Use This Skill
Managing application state in React Native with Redux Toolkit:
- Setting up Redux store
- Creating slices for different features
- Async operations with createAsyncThunk
- Selectors and hooks
- TypeScript integration
- Middleware and persistence

## Redux Store Setup

### Store Configuration
```typescript
// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import rideReducer from './slices/rideSlice';
import userReducer from './slices/userSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth slice
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    ride: rideReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// TypeScript types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Provider Setup
```typescript
// App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { ActivityIndicator } from 'react-native';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<ActivityIndicator />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
```

## TypeScript Hooks

### Typed Hooks
```typescript
// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout app instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## Creating Slices

### Basic Slice Pattern
```typescript
// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'dd' | 'rider';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

// Export actions
export const { setUser, clearUser, setLoading, setError } = authSlice.actions;

// Selectors
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Export reducer
export default authSlice.reducer;
```

### Slice with Nested State
```typescript
// src/store/slices/rideSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface Ride {
  id: string;
  riderId: string;
  ddId: string | null;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: 'pending' | 'assigned' | 'enRoute' | 'completed' | 'cancelled';
  priority: number;
  isEmergency: boolean;
  createdAt: string;
}

interface RideState {
  rides: Ride[];
  activeRide: Ride | null;
  loading: boolean;
  error: string | null;
}

const initialState: RideState = {
  rides: [],
  activeRide: null,
  loading: false,
  error: null,
};

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    setRides: (state, action: PayloadAction<Ride[]>) => {
      state.rides = action.payload;
    },
    addRide: (state, action: PayloadAction<Ride>) => {
      state.rides.push(action.payload);
    },
    updateRide: (state, action: PayloadAction<Ride>) => {
      const index = state.rides.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rides[index] = action.payload;
      }
      if (state.activeRide?.id === action.payload.id) {
        state.activeRide = action.payload;
      }
    },
    removeRide: (state, action: PayloadAction<string>) => {
      state.rides = state.rides.filter((r) => r.id !== action.payload);
      if (state.activeRide?.id === action.payload) {
        state.activeRide = null;
      }
    },
    setActiveRide: (state, action: PayloadAction<Ride | null>) => {
      state.activeRide = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setRides,
  addRide,
  updateRide,
  removeRide,
  setActiveRide,
  setLoading,
  setError,
} = rideSlice.actions;

// Selectors
export const selectRides = (state: RootState) => state.ride.rides;
export const selectActiveRide = (state: RootState) => state.ride.activeRide;
export const selectPendingRides = (state: RootState) =>
  state.ride.rides.filter((r) => r.status === 'pending');
export const selectRideById = (state: RootState, rideId: string) =>
  state.ride.rides.find((r) => r.id === rideId);

export default rideSlice.reducer;
```

## Async Thunks

### Basic Async Thunk
```typescript
// src/store/slices/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserService } from '../../services/userService';
import type { RootState } from '../store';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface UserState {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  users: [],
  loading: false,
  error: null,
};

// Async thunk to fetch user
export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      const user = await UserService.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to update user
export const updateUser = createAsyncThunk(
  'user/updateUser',
  async (
    { userId, data }: { userId: string; data: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      await UserService.updateUser(userId, data);
      const updatedUser = await UserService.getUser(userId);
      return updatedUser!;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to fetch multiple users
export const fetchUsersByOrganization = createAsyncThunk(
  'user/fetchUsersByOrganization',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const users = await UserService.getUsersByOrganization(organizationId);
      return users;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.currentUser = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUser
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // updateUser
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchUsersByOrganization
    builder
      .addCase(fetchUsersByOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUsersByOrganization.fulfilled,
        (state, action: PayloadAction<User[]>) => {
          state.loading = false;
          state.users = action.payload;
        }
      )
      .addCase(fetchUsersByOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUser } = userSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectUsers = (state: RootState) => state.user.users;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

export default userSlice.reducer;
```

## Using Redux in Components

### Dispatching Actions
```typescript
// src/screens/ProfileScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchUser,
  updateUser,
  selectCurrentUser,
  selectUserLoading
} from '../store/slices/userSlice';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const loading = useAppSelector(selectUserLoading);

  useEffect(() => {
    // Fetch user on mount
    dispatch(fetchUser('user123'));
  }, [dispatch]);

  const handleUpdateProfile = () => {
    dispatch(
      updateUser({
        userId: 'user123',
        data: { firstName: 'John', lastName: 'Doe' },
      })
    );
  };

  if (loading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>{user?.firstName} {user?.lastName}</Text>
      <Button title="Update Profile" onPress={handleUpdateProfile} />
    </View>
  );
};
```

### Using Selectors
```typescript
import React from 'react';
import { FlatList, Text } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { selectPendingRides } from '../store/slices/rideSlice';

export const PendingRidesList: React.FC = () => {
  // Selector automatically filters pending rides
  const pendingRides = useAppSelector(selectPendingRides);

  return (
    <FlatList
      data={pendingRides}
      renderItem={({ item }) => <Text>{item.id}</Text>}
      keyExtractor={(item) => item.id}
    />
  );
};
```

## Advanced Patterns

### Memoized Selectors (Reselect)
```typescript
// src/store/slices/rideSlice.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Basic selector
const selectRides = (state: RootState) => state.ride.rides;

// Memoized selector - only recalculates when rides change
export const selectSortedRides = createSelector(
  [selectRides],
  (rides) => {
    return [...rides].sort((a, b) => b.priority - a.priority);
  }
);

// Selector with parameters
export const selectRidesByStatus = createSelector(
  [selectRides, (_state: RootState, status: string) => status],
  (rides, status) => {
    return rides.filter((ride) => ride.status === status);
  }
);

// Usage in component
const sortedRides = useAppSelector(selectSortedRides);
const pendingRides = useAppSelector((state) => selectRidesByStatus(state, 'pending'));
```

### RTK Query (API Integration)
```typescript
// src/store/api/rideApi.ts
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { RideService } from '../../services/rideService';

export const rideApi = createApi({
  reducerPath: 'rideApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Ride'],
  endpoints: (builder) => ({
    getRides: builder.query({
      queryFn: async () => {
        try {
          const rides = await RideService.getAllRides();
          return { data: rides };
        } catch (error: any) {
          return { error: error.message };
        }
      },
      providesTags: ['Ride'],
    }),
    createRide: builder.mutation({
      queryFn: async (rideData) => {
        try {
          const ride = await RideService.createRide(rideData);
          return { data: ride };
        } catch (error: any) {
          return { error: error.message };
        }
      },
      invalidatesTags: ['Ride'],
    }),
  }),
});

export const { useGetRidesQuery, useCreateRideMutation } = rideApi;

// Add to store
import { rideApi } from './api/rideApi';

export const store = configureStore({
  reducer: {
    // ... other reducers
    [rideApi.reducerPath]: rideApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(rideApi.middleware),
});
```

### Optimistic Updates
```typescript
// src/store/slices/rideSlice.ts
export const updateRideStatus = createAsyncThunk(
  'ride/updateStatus',
  async (
    { rideId, status }: { rideId: string; status: string },
    { dispatch, rejectWithValue }
  ) => {
    // Optimistic update
    const tempRide = { id: rideId, status } as Ride;
    dispatch(updateRide(tempRide));

    try {
      await RideService.updateRide(rideId, { status });
      return tempRide;
    } catch (error: any) {
      // Revert on error
      dispatch(fetchRide(rideId));
      return rejectWithValue(error.message);
    }
  }
);
```

## Middleware

### Logger Middleware
```typescript
// src/store/middleware/logger.ts
import { Middleware } from '@reduxjs/toolkit';

export const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next State:', store.getState());
  return result;
};

// Add to store (dev only)
const middleware = (getDefaultMiddleware: any) => {
  const middlewares = getDefaultMiddleware();
  if (__DEV__) {
    middlewares.push(loggerMiddleware);
  }
  return middlewares;
};
```

## Persistence

### Redux Persist with AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer, persistStore } from 'redux-persist';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // Slices to persist
  blacklist: ['ride'], // Slices to exclude
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
```

### Selective Persistence
```typescript
// Persist only specific fields
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'isAuthenticated'], // Only persist these fields
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
```

## Common Pitfalls to Avoid

### 1. Mutating State Outside Reducers
```typescript
// BAD - Direct mutation
const user = useAppSelector(selectCurrentUser);
user.name = 'New Name'; // Don't mutate directly!

// GOOD - Dispatch action
dispatch(updateUser({ userId: user.id, data: { name: 'New Name' } }));
```

### 2. Non-Serializable Values in State
```typescript
// BAD - Don't store functions, Promises, or class instances
{
  callback: () => {}, // Don't store functions
  promise: fetchData(), // Don't store Promises
  date: new Date(), // Don't store Date objects
}

// GOOD - Use serializable values
{
  timestamp: Date.now(), // Store timestamp
  dateString: new Date().toISOString(), // Store ISO string
}
```

### 3. Not Using TypeScript Properly
```typescript
// BAD - Any types defeat the purpose
const user = useAppSelector((state: any) => state.user);

// GOOD - Use typed selectors
const user = useAppSelector(selectCurrentUser);
```

### 4. Over-Normalizing State
```typescript
// BAD - Too complex normalization for simple data
{
  rides: { byId: {}, allIds: [] },
  riders: { byId: {}, allIds: [] },
  // ...too many layers
}

// GOOD - Simple structure for simple data
{
  rides: [],
  activeRide: null,
}
```

### 5. Fetching in Reducers
```typescript
// BAD - Async operations in reducers
reducers: {
  fetchUser: async (state, action) => {
    const user = await UserService.getUser(); // Don't do async in reducers
  }
}

// GOOD - Use async thunks
export const fetchUser = createAsyncThunk('user/fetch', async () => {
  return await UserService.getUser();
});
```

## Best Practices

1. **Use TypeScript** for type-safe state management
2. **Create typed hooks** (useAppDispatch, useAppSelector)
3. **Use createAsyncThunk** for async operations
4. **Normalize state** for complex relational data
5. **Use selectors** to derive computed state
6. **Memoize selectors** with createSelector for performance
7. **Keep slices focused** on single features
8. **Persist only necessary data** to AsyncStorage
9. **Use middleware** for logging and side effects
10. **Test reducers** with Jest

## Testing

### Testing Reducers
```typescript
import reducer, { setUser, clearUser } from './authSlice';

describe('authSlice', () => {
  it('should handle setUser', () => {
    const user = { uid: '123', email: 'test@ksu.edu', role: 'rider' };
    const state = reducer(undefined, setUser(user));

    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle clearUser', () => {
    const state = reducer({ user: {}, isAuthenticated: true }, clearUser());

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
```

### Testing Async Thunks
```typescript
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fetchUser } from './userSlice';

const mockStore = configureStore([thunk]);

describe('fetchUser thunk', () => {
  it('should fetch user successfully', async () => {
    const store = mockStore({});
    await store.dispatch(fetchUser('123'));

    const actions = store.getActions();
    expect(actions[0].type).toBe('user/fetchUser/pending');
    expect(actions[1].type).toBe('user/fetchUser/fulfilled');
  });
});
```

## References

- Redux Toolkit: https://redux-toolkit.js.org/
- Redux Persist: https://github.com/rt2zz/redux-persist
- Reselect: https://github.com/reduxjs/reselect
- RTK Query: https://redux-toolkit.js.org/rtk-query/overview
