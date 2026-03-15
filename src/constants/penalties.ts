/**
 * Penalty Constants
 *
 * Defines penalties for ride cancellation behavior.
 * Penalties are applied to reduce priority for future ride requests.
 */

import { RideStatus } from '../models/Ride';

/**
 * Priority penalty for cancelling a ride after DD has arrived
 * Applied as a negative value to the next ride's priority calculation
 */
export const LATE_CANCEL_PENALTY = -5;

/**
 * Ride statuses that incur a cancellation penalty
 * Currently only ARRIVED - when DD is at the pickup location
 */
export const PENALTY_STATUSES: readonly RideStatus[] = [RideStatus.ARRIVED] as const;

/**
 * Check if cancelling a ride at a given status should apply a penalty
 */
export const shouldApplyPenalty = (status: RideStatus): boolean => {
  return PENALTY_STATUSES.includes(status);
};

/**
 * Duration of the emergency abuse penalty window (7 days in milliseconds)
 */
export const EMERGENCY_ABUSE_PENALTY_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Priority cap applied to non-emergency rides while abuse penalty is active.
 * Senior waiting 30 min normally scores 55; cap at 20 keeps them behind all clean riders.
 */
export const EMERGENCY_ABUSE_MAX_PRIORITY = 20;
