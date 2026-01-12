/**
 * Services Index
 *
 * Central export point for all business logic services in Rally React Native.
 *
 * These services implement the critical business algorithms for the DD Ride app:
 * - Firestore CRUD operations and real-time listeners
 * - Ride queue management and priority calculation
 * - DD assignment based on shortest wait time
 * - ETA calculation using Google Maps Distance Matrix API
 * - Authentication and user management
 * - Location tracking and geocoding
 * - Push notifications
 *
 * Usage:
 * ```typescript
 * import {
 *   createRide,
 *   calculatePriority,
 *   findBestDD,
 *   calculateETA
 * } from '../services';
 * ```
 */

// ============================================================================
// Firestore Service - Core Database Operations
// ============================================================================
export {
  // User Operations
  createUser,
  getUser,
  fetchUser,
  updateUser,
  deleteUser,
  updateUserFCMToken,
  fetchMembers,
  subscribeToUser,
  observeUser,

  // Chapter Operations
  getChapter,
  fetchChapter,
  fetchChapters,
  createChapter,
  updateChapter,
  subscribeToChapter,
  observeChapter,

  // Event Operations
  createEvent,
  getEvent,
  fetchEvent,
  updateEvent,
  deleteEvent,
  getActiveEvent,
  fetchEvents,
  getAllEvents,
  fetchAllEvents,
  subscribeToActiveEvent,
  observeActiveEvents,

  // Ride Operations
  createRide,
  getRide,
  fetchRide,
  updateRide,
  getRidesByStatus,
  getActiveRidesForDD,
  fetchDDRides,
  getActiveRidesForRider,
  fetchRiderRides,
  getActiveRidesForEvent,
  fetchActiveRides,
  subscribeToActiveRides,
  observeActiveRides,
  observeRide,

  // DD Assignment Operations
  createDDAssignment,
  getDDAssignment,
  fetchDDAssignment,
  updateDDAssignment,
  getActiveDDs,
  fetchActiveDDAssignments,
  getAllDDsForEvent,
  fetchAllDDAssignments,
  toggleDDActive,
  subscribeToActiveDDs,
  observeActiveDDAssignments,

  // Admin Alerts
  fetchAdminAlerts,
  createAdminAlert,
  markAlertAsRead,
  observeAdminAlerts,

  // Year Transition Logs
  fetchYearTransitionLogs,
  createYearTransitionLog,

  // Batch Operations
  executeBatch,
  executeLargeBatch,

  // Utility Functions
  createGeoPoint,
  createTimestamp,
  timestampToDate,
  getServerTimestamp,

  // Generic CRUD
  saveDocument,
  fetchDocument,
  deleteDocument,
  queryDocuments,

  // Types and Errors
  FirestoreServiceError,
  FirestoreErrorCode,
  type QueryFilter,
  type BatchOperation,
} from './firestoreService';

// ============================================================================
// Ride Queue Service - Priority and Queue Management
// ============================================================================
export {
  calculatePriority,
  isSameChapterRide,
  calculateCurrentPriority,
  calculatePriorityForRide,
  getOverallQueuePosition,
  getQueuePositions,
  getEstimatedWaitTime,
  getQueueStats,
  type QueueStats,
} from './rideQueueService';

// ============================================================================
// DD Assignment Service - Smart DD Selection and Monitoring
// ============================================================================
export {
  calculateWaitTime,
  calculateWaitTimes,
  findBestDD,
  findBestDDForRide,
  assignRide,
  assignNextRide,
  checkInactiveToggles,
  checkProlongedInactivity,
  monitorDDActivity,
  toggleDDStatus,
  getDDStats,
  resetInactiveToggles,
  type DDStats,
} from './ddAssignmentService';

// ============================================================================
// ETA Service - Google Maps Distance Matrix Integration
// ============================================================================
export {
  calculateETA,
  calculateETAToAddress,
  calculateETAWithFallback,
  calculateETAToAddressWithFallback,
  calculateDistance,
  metersToMiles,
  metersToKilometers,
  calculateBatchETAs,
  ETAErrorType,
  ETAError,
} from './etaService';

// ============================================================================
// Authentication Service
// ============================================================================
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  sendEmailVerification,
  sendPasswordReset,
  getCurrentUser,
  onAuthStateChanged,
  isEmailVerified,
  reloadUser,
  AuthServiceError,
  AuthErrorCode,
} from './authService';

// ============================================================================
// Location Service
// ============================================================================
export {
  requestLocationPermissions,
  getCurrentLocation,
  reverseGeocode,
  geocodeAddress,
  watchPosition,
  stopWatchingPosition,
  isLocationEnabled,
  openLocationSettings,
  LocationServiceError,
  LocationErrorCode,
  type Location,
  type GeocodedAddress,
} from './locationService';

// ============================================================================
// Notification Service
// ============================================================================
export {
  requestNotificationPermissions,
  getNotificationPermissions,
  registerForPushNotifications,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  handleNotification,
  handleNotificationResponse,
  NotificationServiceError,
  NotificationErrorCode,
  type NotificationData,
  type NotificationPermissionsStatus,
} from './notificationService';
