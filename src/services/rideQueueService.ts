/**
 * rideQueueService.ts
 *
 * Service for managing ride queue operations and priority calculations
 *
 * This service implements the critical business logic for:
 * - Priority calculation with differentiation between same-chapter and cross-chapter rides
 *   - Same-chapter: (classYear × 10) + (waitMinutes × 0.5)
 *   - Cross-chapter: (waitMinutes × 0.5) only (class year doesn't matter)
 *   - Emergency rides get priority 9999 (regardless of chapter)
 * - Overall queue position across all DDs (not per-DD)
 * - Estimated wait time calculations
 *
 * Example Usage:
 * ```typescript
 * // Calculate priority for same-chapter ride
 * const priority1 = calculatePriority(4, 5, false, true);
 * // Result: (4 × 10) + (5 × 0.5) = 42.5
 *
 * // Calculate priority for cross-chapter ride
 * const priority2 = calculatePriority(4, 5, false, false);
 * // Result: 5 × 0.5 = 2.5 (class year ignored)
 *
 * // Get overall queue position
 * const position = await getOverallQueuePosition('ride123', 'event456');
 * // Result: 3 (3rd in line overall, not per-DD)
 * ```
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Type imports (will be created separately)
interface Ride {
  id: string;
  riderId: string;
  ddId?: string;
  chapterId: string;
  eventId: string;
  pickupLocation: { latitude: number; longitude: number };
  pickupAddress: string;
  dropoffAddress?: string;
  status: 'queued' | 'assigned' | 'enroute' | 'completed' | 'cancelled';
  priority: number;
  isEmergency: boolean;
  estimatedWaitTime?: number;
  queuePosition?: number;
  requestedAt: Date;
  assignedAt?: Date;
  enrouteAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
}

interface Event {
  id: string;
  name: string;
  chapterId: string;
  date: Date;
  allowedChapterIds: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface User {
  id: string;
  classYear: number;
  chapterId: string;
  // ... other fields
}

// Constants
const EMERGENCY_PRIORITY = 9999.0;
const CLASS_YEAR_WEIGHT = 10.0;
const WAIT_TIME_WEIGHT = 0.5;
const AVERAGE_RIDE_TIME_MINUTES = 15.0;

// MARK: - Priority Calculation

/**
 * Calculate priority for a ride based on class year, wait time, emergency status, and chapter relationship
 *
 * Algorithm:
 * - Emergency rides: always 9999 (regardless of chapter)
 * - Same-chapter rides: (classYear × 10) + (waitMinutes × 0.5)
 * - Cross-chapter rides: (waitMinutes × 0.5) only (class year doesn't matter)
 *
 * Rationale:
 * - Same-chapter: DDs know their own chapter's members and respect class year hierarchy
 * - Cross-chapter: DDs don't know other chapters' hierarchies, so only wait time matters
 *
 * Examples:
 * - Same chapter - Senior (4) waiting 5 min: (4×10) + (5×0.5) = 42.5
 * - Same chapter - Junior (3) waiting 10 min: (3×10) + (10×0.5) = 35.0
 * - Same chapter - Sophomore (2) waiting 20 min: (2×10) + (20×0.5) = 30.0
 * - Same chapter - Freshman (1) waiting 15 min: (1×10) + (15×0.5) = 17.5
 * - Cross chapter - Senior (4) waiting 5 min: 5×0.5 = 2.5 (class year ignored)
 * - Cross chapter - Freshman (1) waiting 15 min: 15×0.5 = 7.5 (class year ignored)
 * - Emergency (any): 9999
 *
 * @param classYear - Student's class year (1=freshman, 2=sophomore, 3=junior, 4=senior)
 * @param waitMinutes - How many minutes the rider has been waiting
 * @param isEmergency - Whether this is an emergency ride request
 * @param isSameChapter - Whether the rider is from the same chapter as the event's DDs
 * @returns The calculated priority (higher = more priority)
 */
export function calculatePriority(
  classYear: number,
  waitMinutes: number,
  isEmergency: boolean,
  isSameChapter: boolean
): number {
  // Emergency always highest priority
  if (isEmergency) {
    return EMERGENCY_PRIORITY;
  }

  // Cross-chapter: only wait time matters (DDs don't know other chapters' hierarchies)
  if (!isSameChapter) {
    return waitMinutes * WAIT_TIME_WEIGHT;
  }

  // Same chapter: class year + wait time
  const classYearPriority = classYear * CLASS_YEAR_WEIGHT;
  const waitTimePriority = waitMinutes * WAIT_TIME_WEIGHT;

  return classYearPriority + waitTimePriority;
}

/**
 * Determine if a ride is from the same chapter as the event's DDs
 *
 * Logic:
 * - If event allows all chapters (contains "ALL"), check if rider's chapter matches event's chapter
 * - Otherwise, check if rider's chapter matches event's chapter
 *
 * @param ride - The ride to check
 * @param event - The event the ride is associated with
 * @returns True if same chapter, false if cross-chapter
 */
export function isSameChapterRide(ride: Ride, event: Event): boolean {
  // If event allows all chapters, riders could be from different chapters
  // Check if rider's chapter matches event's hosting chapter
  if (event.allowedChapterIds.includes('ALL')) {
    return ride.chapterId === event.chapterId;
  }

  // If event is restricted to specific chapters, check if rider's chapter matches event's chapter
  return ride.chapterId === event.chapterId;
}

/**
 * Calculate priority for an existing ride based on current time
 *
 * Note: This is a simplified calculation that assumes same-chapter.
 * For accurate cross-chapter priority, use calculatePriorityForRide()
 *
 * @param ride - The ride to calculate priority for
 * @returns The calculated priority
 */
export function calculateCurrentPriority(ride: Ride): number {
  const waitMinutes = (Date.now() - ride.requestedAt.getTime()) / (1000 * 60);
  return calculatePriority(
    0, // Will need to fetch user's classYear separately
    waitMinutes,
    ride.isEmergency,
    true // Default to same chapter for backward compatibility
  );
}

/**
 * Calculate priority for a ride with full context
 *
 * This is the preferred method when you have access to the event and user information
 *
 * @param ride - The ride to calculate priority for
 * @param event - The event the ride is associated with
 * @param classYear - The rider's class year
 * @returns The calculated priority
 */
export function calculatePriorityForRide(
  ride: Ride,
  event: Event,
  classYear: number
): number {
  const waitMinutes = (Date.now() - ride.requestedAt.getTime()) / (1000 * 60);
  const isSameChapter = isSameChapterRide(ride, event);

  return calculatePriority(
    classYear,
    waitMinutes,
    ride.isEmergency,
    isSameChapter
  );
}

// MARK: - Queue Position

/**
 * Fetch all active rides for an event
 *
 * @param eventId - The event ID
 * @returns Array of active rides
 */
async function fetchActiveRides(eventId: string): Promise<Ride[]> {
  const ridesRef = collection(db, 'rides');
  const q = query(
    ridesRef,
    where('eventId', '==', eventId),
    where('status', 'in', ['queued', 'assigned', 'enroute'])
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      requestedAt: data.requestedAt?.toDate() || new Date(),
      assignedAt: data.assignedAt?.toDate(),
      enrouteAt: data.enrouteAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      cancelledAt: data.cancelledAt?.toDate(),
    } as Ride;
  });
}

/**
 * Get the overall queue position for a ride across ALL DDs
 *
 * This returns the rider's position in the OVERALL queue, not per-DD.
 * For example, if there are 10 total active rides across 3 DDs,
 * and this ride has the 4th highest priority, it returns 4.
 *
 * @param rideId - The ride ID to get position for
 * @param eventId - The event ID
 * @returns Queue position (1-indexed, 1 = first in line)
 * @throws Error if ride not found
 */
export async function getOverallQueuePosition(
  rideId: string,
  eventId: string
): Promise<number> {
  // Fetch all active rides for the event
  const allRides = await fetchActiveRides(eventId);

  // Sort by priority (descending - higher priority first)
  const sortedRides = allRides.sort((a, b) => b.priority - a.priority);

  // Find the position of this ride (1-indexed)
  const index = sortedRides.findIndex(ride => ride.id === rideId);

  if (index === -1) {
    throw new Error('Ride not found in active rides');
  }

  return index + 1; // Convert 0-indexed to 1-indexed
}

/**
 * Get queue positions for multiple rides at once
 *
 * @param eventId - The event ID
 * @returns Dictionary mapping ride ID to queue position
 */
export async function getQueuePositions(
  eventId: string
): Promise<Record<string, number>> {
  const allRides = await fetchActiveRides(eventId);
  const sortedRides = allRides.sort((a, b) => b.priority - a.priority);

  const positions: Record<string, number> = {};
  sortedRides.forEach((ride, index) => {
    positions[ride.id] = index + 1;
  });

  return positions;
}

// MARK: - Estimated Wait Time

/**
 * Fetch a single ride by ID
 */
async function fetchRide(rideId: string): Promise<Ride> {
  const rideRef = doc(db, 'rides', rideId);
  const snapshot = await getDoc(rideRef);

  if (!snapshot.exists()) {
    throw new Error('Ride not found');
  }

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    requestedAt: data.requestedAt?.toDate() || new Date(),
    assignedAt: data.assignedAt?.toDate(),
    enrouteAt: data.enrouteAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
    cancelledAt: data.cancelledAt?.toDate(),
  } as Ride;
}

/**
 * Fetch all rides for a specific DD
 */
async function fetchDDRides(ddId: string, eventId: string): Promise<Ride[]> {
  const ridesRef = collection(db, 'rides');
  const q = query(
    ridesRef,
    where('eventId', '==', eventId),
    where('ddId', '==', ddId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      requestedAt: data.requestedAt?.toDate() || new Date(),
      assignedAt: data.assignedAt?.toDate(),
      enrouteAt: data.enrouteAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      cancelledAt: data.cancelledAt?.toDate(),
    } as Ride;
  });
}

/**
 * Fetch active DD assignments for an event
 */
async function fetchActiveDDAssignments(eventId: string): Promise<any[]> {
  const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
  const q = query(assignmentsRef, where('isActive', '==', true));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  }));
}

/**
 * Calculate wait time for a ride assigned to a specific DD
 *
 * @param ddId - The DD's user ID
 * @param eventId - The event ID
 * @param currentRideId - The ride we're calculating for
 * @returns Estimated wait time in minutes
 */
async function calculateWaitTimeForAssignedDD(
  ddId: string,
  eventId: string,
  currentRideId: string
): Promise<number> {
  // Get all rides assigned to this DD
  const ddRides = await fetchDDRides(ddId, eventId);

  // Filter to only active rides (queued, assigned, enroute)
  const activeRides = ddRides.filter(ride =>
    ride.status === 'queued' ||
    ride.status === 'assigned' ||
    ride.status === 'enroute'
  );

  // Sort by priority to determine order
  const sortedRides = activeRides.sort((a, b) => b.priority - a.priority);

  // Find position of current ride in DD's queue
  const rideIndex = sortedRides.findIndex(ride => ride.id === currentRideId);

  if (rideIndex === -1) {
    return 0;
  }

  // Calculate wait time: number of rides ahead × average ride time
  const ridesAhead = rideIndex;
  const estimatedMinutes = Math.floor(ridesAhead * AVERAGE_RIDE_TIME_MINUTES);

  return estimatedMinutes;
}

/**
 * Estimate wait time for an unassigned ride
 *
 * @param eventId - The event ID
 * @param rideId - The ride ID
 * @returns Estimated wait time in minutes
 */
async function estimateWaitTimeForUnassignedRide(
  eventId: string,
  rideId: string
): Promise<number> {
  // Get overall queue position
  const position = await getOverallQueuePosition(rideId, eventId);

  // Get number of active DDs
  const activeDDs = await fetchActiveDDAssignments(eventId);
  const ddCount = Math.max(activeDDs.length, 1); // Avoid division by zero

  // Estimate: (position / number of DDs) × average ride time
  // This assumes rides are distributed evenly across DDs
  const estimatedRidesAhead = (position - 1) / ddCount;
  const estimatedMinutes = Math.floor(estimatedRidesAhead * AVERAGE_RIDE_TIME_MINUTES);

  return estimatedMinutes;
}

/**
 * Get estimated wait time for a ride
 *
 * Calculation logic:
 * 1. If ride is not yet assigned → estimate based on average DD availability
 * 2. If ride is assigned → calculate based on DD's current queue
 *
 * @param rideId - The ride ID
 * @param eventId - The event ID
 * @returns Estimated wait time in minutes
 */
export async function getEstimatedWaitTime(
  rideId: string,
  eventId: string
): Promise<number> {
  const ride = await fetchRide(rideId);

  if (ride.ddId) {
    // Ride is assigned - calculate based on DD's queue
    return await calculateWaitTimeForAssignedDD(ride.ddId, eventId, rideId);
  } else {
    // Ride not assigned - estimate based on average availability
    return await estimateWaitTimeForUnassignedRide(eventId, rideId);
  }
}

// MARK: - Queue Statistics

/**
 * Queue statistics for an event
 */
export interface QueueStats {
  totalActive: number;
  queued: number;
  assigned: number;
  enroute: number;
  emergency: number;
  activeDDs: number;
  averageWaitMinutes: number;
}

/**
 * Get queue statistics for an event
 *
 * @param eventId - The event ID
 * @returns Queue statistics
 */
export async function getQueueStats(eventId: string): Promise<QueueStats> {
  const rides = await fetchActiveRides(eventId);
  const activeDDs = await fetchActiveDDAssignments(eventId);

  const queuedCount = rides.filter(r => r.status === 'queued').length;
  const assignedCount = rides.filter(r => r.status === 'assigned').length;
  const enrouteCount = rides.filter(r => r.status === 'enroute').length;
  const emergencyCount = rides.filter(r => r.isEmergency).length;

  let avgWaitTime = 0;
  if (rides.length > 0) {
    const totalWaitMinutes = rides.reduce((sum, ride) => {
      return sum + (Date.now() - ride.requestedAt.getTime()) / (1000 * 60);
    }, 0);
    avgWaitTime = totalWaitMinutes / rides.length;
  }

  return {
    totalActive: rides.length,
    queued: queuedCount,
    assigned: assignedCount,
    enroute: enrouteCount,
    emergency: emergencyCount,
    activeDDs: activeDDs.length,
    averageWaitMinutes: Math.floor(avgWaitTime),
  };
}
