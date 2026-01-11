/**
 * Redux Store Configuration
 *
 * Configures the Redux store with:
 * - Redux Toolkit
 * - Redux Persist (for auth state)
 * - TypeScript types
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
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

// Import reducers
import authReducer from './slices/authSlice';
import ridesReducer from './slices/ridesSlice';
import eventsReducer from './slices/eventsSlice';
import ddAssignmentsReducer from './slices/ddAssignmentsSlice';

// Redux Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth state
  blacklist: ['rides', 'events', 'ddAssignments'], // Don't persist real-time data
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  rides: ridesReducer,
  events: eventsReducer,
  ddAssignments: ddAssignmentsReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore Date objects in state (we'll handle serialization manually if needed)
        ignoredPaths: [
          'auth.user.createdAt',
          'auth.user.updatedAt',
          'rides.rides',
          'rides.activeRides',
          'rides.queue',
          'rides.myRide',
          'events.activeEvent',
          'events.events',
          'ddAssignments.assignments',
          'ddAssignments.myAssignment',
        ],
      },
    }),
  devTools: __DEV__, // Enable Redux DevTools in development
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
