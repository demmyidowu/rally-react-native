/**
 * Services Index
 *
 * Central export point for all business logic services in Rally React Native.
 *
 * These services implement the critical business algorithms for the DD Ride app:
 * - Ride queue management and priority calculation
 * - DD assignment based on shortest wait time
 * - ETA calculation using Google Maps Distance Matrix API
 *
 * Usage:
 * ```typescript
 * import {
 *   calculatePriority,
 *   findBestDD,
 *   calculateETA
 * } from '../services';
 * ```
 */

// Ride Queue Service
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

// DD Assignment Service
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

// ETA Service
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
