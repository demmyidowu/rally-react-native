/**
 * Store Index
 *
 * Re-exports all store-related modules for convenient importing
 */

// Export store and persistor
export { store, persistor } from './store';
export type { RootState, AppDispatch } from './store';

// Export typed hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Export auth slice
export {
  signIn,
  signUp,
  fetchUserProfile,
  updateUserProfile,
  signOut,
  setUser,
  clearError as clearAuthError,
  checkEmailVerification,
} from './slices/authSlice';
export type { AuthState } from './slices/authSlice';

// Export rides slice
export {
  requestRide,
  fetchActiveRides,
  fetchMyRide,
  assignRide,
  markEnRoute,
  completeRide,
  cancelRide,
  setRides,
  updateRide,
  removeRide,
  clearError as clearRidesError,
} from './slices/ridesSlice';
export type { RidesState } from './slices/ridesSlice';

// Export events slice
export {
  createEvent,
  fetchActiveEvent,
  fetchAllEvents,
  startEvent,
  endEvent,
  cancelEvent,
  updateEvent,
  setActiveEvent,
  setEvents,
  updateEventInState,
  clearError as clearEventsError,
} from './slices/eventsSlice';
export type { EventsState } from './slices/eventsSlice';

// Export DD assignments slice
export {
  fetchDDAssignments,
  fetchMyDDAssignment,
  createDDAssignment,
  toggleDDActive,
  addRideToDD,
  completeRideForDD,
  removeRideFromDD,
  setAssignments,
  updateAssignment,
  clearError as clearDDAssignmentsError,
} from './slices/ddAssignmentsSlice';
export type { DDAssignmentsState } from './slices/ddAssignmentsSlice';
