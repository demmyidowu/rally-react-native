/**
 * ddAssignmentService.ts
 *
 * Service for DD assignment logic and activity monitoring
 *
 * This service implements critical business logic for:
 * - Finding the best DD based on SHORTEST WAIT TIME (not lowest ride count)
 * - Assigning rides to DDs atomically
 * - Monitoring DD activity (inactive toggles, prolonged inactivity)
 * - Generating admin alerts for DD issues
 *
 * Example Usage:
 * ```typescript
 * // Find best available DD for a ride
 * const bestDD = await findBestDD(event, allRides);
 *
 * // Assign ride to DD
 * await assignRide(ride, bestDD);
 *
 * // Check for DD monitoring alerts
 * const alerts = await monitorDDActivity(ddAssignment);
 * ```
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getOverallQueuePosition } from './rideQueueService';

// Type definitions
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

interface DDAssignment {
  id: string;
  userId: string;
  eventId: string;
  photoURL?: string;
  carDescription?: string;
  isActive: boolean;
  inactiveToggles: number;
  lastActiveTimestamp?: Date;
  lastInactiveTimestamp?: Date;
  totalRidesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
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
  name: string;
  phoneNumber: string;
  classYear: number;
  chapterId: string;
}

interface AdminAlert {
  id: string;
  chapterId: string;
  type: 'ddInactiveToggle' | 'ddProlongedInactive' | 'emergency' | 'other';
  message: string;
  ddId?: string;
  rideId?: string;
  isRead: boolean;
  createdAt: Date;
}

// Constants for monitoring thresholds
const AVERAGE_RIDE_TIME_MINUTES = 15.0;
const INACTIVE_TOGGLE_THRESHOLD = 5;
const PROLONGED_INACTIVITY_MINUTES = 15.0;

// MARK: - Wait Time Calculation

/**
 * Calculate wait time for a DD based on their current active rides
 *
 * If DD has no active rides → 0 minutes
 * If DD has rides → sum of estimated time for all queued/active rides
 * Average ride time: 15 minutes per ride
 *
 * @param ddAssignment - The DD assignment to calculate wait time for
 * @param rides - All active rides for the event
 * @returns Wait time in seconds (number)
 */
export async function calculateWaitTime(
  ddAssignment: DDAssignment,
  rides: Ride[]
): Promise<number> {
  // Filter rides assigned to this DD
  const ddRides = rides.filter(ride => ride.ddId === ddAssignment.userId);

  // Only count active rides (queued, assigned, enroute)
  const activeRides = ddRides.filter(
    ride =>
      ride.status === 'queued' ||
      ride.status === 'assigned' ||
      ride.status === 'enroute'
  );

  // If no active rides, wait time is 0
  if (activeRides.length === 0) {
    return 0;
  }

  // Calculate total wait time: number of rides × average ride time
  const totalMinutes = activeRides.length * AVERAGE_RIDE_TIME_MINUTES;

  // Convert to seconds
  return totalMinutes * 60.0;
}

/**
 * Calculate wait times for all DDs at once
 *
 * @param ddAssignments - All DD assignments
 * @param rides - All active rides
 * @returns Dictionary mapping DD ID to wait time in seconds
 */
export async function calculateWaitTimes(
  ddAssignments: DDAssignment[],
  rides: Ride[]
): Promise<Record<string, number>> {
  const waitTimes: Record<string, number> = {};

  for (const dd of ddAssignments) {
    try {
      const waitTime = await calculateWaitTime(dd, rides);
      waitTimes[dd.userId] = waitTime;
    } catch (error) {
      // If calculation fails, assume 0 wait time
      waitTimes[dd.userId] = 0;
    }
  }

  return waitTimes;
}

// MARK: - Firestore Helper Functions

/**
 * Fetch all active DD assignments for an event
 */
async function fetchActiveDDAssignments(eventId: string): Promise<DDAssignment[]> {
  const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
  const q = query(assignmentsRef, where('isActive', '==', true));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastActiveTimestamp: data.lastActiveTimestamp?.toDate(),
      lastInactiveTimestamp: data.lastInactiveTimestamp?.toDate(),
    } as DDAssignment;
  });
}

/**
 * Fetch all active rides for an event
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
 * Fetch a single event by ID
 */
async function fetchEvent(eventId: string): Promise<Event> {
  const eventRef = doc(db, 'events', eventId);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    throw new Error('Event not found');
  }

  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    date: data.date?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Event;
}

/**
 * Fetch a user by ID
 */
async function fetchUser(userId: string): Promise<User> {
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error('User not found');
  }

  return {
    ...snapshot.data(),
    id: snapshot.id,
  } as User;
}

// MARK: - Find Best DD (CRITICAL ALGORITHM)

/**
 * Find the best DD to assign a ride to
 *
 * CRITICAL: This always assigns to the DD with the SHORTEST WAIT TIME
 * NOT the DD with the lowest ride count!
 *
 * Algorithm:
 * 1. Fetch all active DD assignments for the event
 * 2. For each DD, calculate wait time (number of active rides × 15 min)
 * 3. Select DD with MINIMUM wait time
 * 4. If multiple DDs have same wait time, pick first one
 * 5. Return null if no active DDs available
 *
 * @param event - The event to find DD for
 * @param rides - All active rides for the event (to calculate wait times)
 * @returns The best DD assignment, or null if none available
 * @throws Error if operation fails or no DDs available
 */
export async function findBestDD(
  event: Event,
  rides: Ride[]
): Promise<DDAssignment | null> {
  // Fetch all active DD assignments for the event
  let activeDDs: DDAssignment[];
  try {
    activeDDs = await fetchActiveDDAssignments(event.id);
  } catch (error) {
    throw new Error('Failed to fetch active DDs: ' + (error as Error).message);
  }

  // If no active DDs, throw error
  if (activeDDs.length === 0) {
    throw new Error('No DDs available');
  }

  // Calculate wait time for each DD
  const waitTimes = await calculateWaitTimes(activeDDs, rides);

  // Find DD with minimum wait time
  let bestDD: DDAssignment | null = null;
  let minWaitTime = Infinity;

  for (const dd of activeDDs) {
    const waitTime = waitTimes[dd.userId] ?? Infinity;
    if (waitTime < minWaitTime) {
      minWaitTime = waitTime;
      bestDD = dd;
    }
  }

  if (!bestDD) {
    throw new Error('No DDs available');
  }

  // Check if all DDs are extremely busy (> 60 min wait)
  if (minWaitTime > 3600) {
    const waitMinutes = Math.floor(minWaitTime / 60);
    console.warn(`⚠️ All DDs busy - shortest wait: ${waitMinutes} minutes`);
    // Still return the best DD, but this could trigger a warning
  }

  return bestDD;
}

/**
 * Find best DD for a specific ride
 *
 * @param ride - The ride to find DD for
 * @returns The best DD assignment, or null if none available
 */
export async function findBestDDForRide(ride: Ride): Promise<DDAssignment | null> {
  const event = await fetchEvent(ride.eventId);
  const rides = await fetchActiveRides(ride.eventId);

  return await findBestDD(event, rides);
}

// MARK: - Assign Ride

/**
 * Assign a ride to a DD atomically
 *
 * Updates:
 * - ride.status = 'assigned'
 * - ride.ddId = ddAssignment.userId
 * - ride.assignedAt = current Date
 * - ride.estimatedWaitTime = calculated wait time
 * - ride.queuePosition = overall queue position
 *
 * @param ride - The ride to assign
 * @param ddAssignment - The DD to assign to
 * @throws Error if operation fails or invalid state
 */
export async function assignRide(
  ride: Ride,
  ddAssignment: DDAssignment
): Promise<void> {
  // Verify DD is still active
  if (!ddAssignment.isActive) {
    throw new Error('DD is inactive');
  }

  // Verify ride is still queued
  if (ride.status !== 'queued') {
    throw new Error('Invalid ride status - must be queued');
  }

  // Fetch DD user info
  let ddUser: User;
  try {
    ddUser = await fetchUser(ddAssignment.userId);
  } catch (error) {
    throw new Error('Failed to fetch DD user info: ' + (error as Error).message);
  }

  // Calculate estimated wait time
  let allRides: Ride[];
  try {
    allRides = await fetchActiveRides(ride.eventId);
  } catch (error) {
    throw new Error('Failed to fetch active rides: ' + (error as Error).message);
  }

  const waitTimeSeconds = await calculateWaitTime(ddAssignment, allRides);
  const waitTimeMinutes = Math.floor(waitTimeSeconds / 60.0);

  // Calculate queue position (non-critical)
  let position = 1;
  try {
    position = await getOverallQueuePosition(ride.id, ride.eventId);
  } catch (error) {
    console.warn('⚠️ Failed to get queue position during assignment:', (error as Error).message);
  }

  // Update ride atomically
  const rideRef = doc(db, 'rides', ride.id);
  await updateDoc(rideRef, {
    status: 'assigned',
    ddId: ddAssignment.userId,
    assignedAt: Timestamp.now(),
    estimatedWaitTime: waitTimeMinutes,
    queuePosition: position,
  });
}

/**
 * Auto-assign next ride in queue to best available DD
 *
 * @param eventId - The event ID
 * @returns The assigned ride, or null if no rides to assign
 */
export async function assignNextRide(eventId: string): Promise<Ride | null> {
  // Fetch active rides
  const rides = await fetchActiveRides(eventId);

  // Filter to only queued rides (not yet assigned)
  const queuedRides = rides.filter(r => r.status === 'queued');

  // If no queued rides, return null
  if (queuedRides.length === 0) {
    return null;
  }

  // Sort by priority (descending - higher priority first)
  const sortedRides = queuedRides.sort((a, b) => b.priority - a.priority);
  const nextRide = sortedRides[0];

  // Find best DD
  const event = await fetchEvent(eventId);
  const bestDD = await findBestDD(event, rides);

  if (!bestDD) {
    // No available DDs
    return null;
  }

  // Assign ride
  await assignRide(nextRide, bestDD);

  return nextRide;
}

// MARK: - DD Activity Monitoring

/**
 * Check if DD has toggled inactive too many times
 *
 * Alert threshold: >5 inactive toggles in 30 minutes
 *
 * @param ddAssignment - The DD assignment to check
 * @returns AdminAlert if threshold exceeded, null otherwise
 */
export async function checkInactiveToggles(
  ddAssignment: DDAssignment
): Promise<AdminAlert | null> {
  // Check if toggle count exceeds threshold
  if (ddAssignment.inactiveToggles <= INACTIVE_TOGGLE_THRESHOLD) {
    return null;
  }

  // Check if last toggle was within 30 minutes
  if (ddAssignment.lastInactiveTimestamp) {
    const minutesSinceLastToggle =
      (Date.now() - ddAssignment.lastInactiveTimestamp.getTime()) / (1000 * 60);

    // Only alert if within 30 minutes
    if (minutesSinceLastToggle > 30) {
      return null;
    }
  }

  // Fetch DD user and event info
  const ddUser = await fetchUser(ddAssignment.userId);
  const event = await fetchEvent(ddAssignment.eventId);

  // Create admin alert
  const alert: AdminAlert = {
    id: '', // Will be set when saved to Firestore
    chapterId: event.chapterId,
    type: 'ddInactiveToggle',
    message: `${ddUser.name} has toggled inactive ${ddAssignment.inactiveToggles} times in the last 30 minutes`,
    ddId: ddAssignment.userId,
    isRead: false,
    createdAt: new Date(),
  };

  return alert;
}

/**
 * Check if DD has been inactive for too long during their shift
 *
 * Alert threshold: >15 minutes inactive during shift
 *
 * @param ddAssignment - The DD assignment to check
 * @returns AdminAlert if threshold exceeded, null otherwise
 */
export async function checkProlongedInactivity(
  ddAssignment: DDAssignment
): Promise<AdminAlert | null> {
  // Only check if DD is currently inactive
  if (ddAssignment.isActive) {
    return null;
  }

  // Check if last inactive timestamp exists
  if (!ddAssignment.lastInactiveTimestamp) {
    return null;
  }

  // Calculate minutes inactive
  const minutesInactive =
    (Date.now() - ddAssignment.lastInactiveTimestamp.getTime()) / (1000 * 60);

  // Check if exceeds threshold
  if (minutesInactive <= PROLONGED_INACTIVITY_MINUTES) {
    return null;
  }

  // Fetch DD user and event info
  const ddUser = await fetchUser(ddAssignment.userId);
  const event = await fetchEvent(ddAssignment.eventId);

  // Create admin alert
  const alert: AdminAlert = {
    id: '',
    chapterId: event.chapterId,
    type: 'ddProlongedInactive',
    message: `${ddUser.name} has been inactive for ${Math.floor(minutesInactive)} minutes during their shift`,
    ddId: ddAssignment.userId,
    isRead: false,
    createdAt: new Date(),
  };

  return alert;
}

/**
 * Create an admin alert in Firestore
 */
async function createAdminAlert(alert: AdminAlert): Promise<void> {
  const alertsRef = collection(db, 'adminAlerts');
  await addDoc(alertsRef, {
    chapterId: alert.chapterId,
    type: alert.type,
    message: alert.message,
    ddId: alert.ddId,
    rideId: alert.rideId,
    isRead: alert.isRead,
    createdAt: Timestamp.now(),
  });
}

/**
 * Monitor DD activity and create alerts if needed
 *
 * This should be called whenever a DD toggles inactive
 *
 * @param ddAssignment - The DD assignment to monitor
 * @returns Array of generated alerts (if any)
 */
export async function monitorDDActivity(
  ddAssignment: DDAssignment
): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];

  // Check for inactive toggles
  const toggleAlert = await checkInactiveToggles(ddAssignment);
  if (toggleAlert) {
    alerts.push(toggleAlert);
    await createAdminAlert(toggleAlert);
  }

  // Check for prolonged inactivity
  const inactivityAlert = await checkProlongedInactivity(ddAssignment);
  if (inactivityAlert) {
    alerts.push(inactivityAlert);
    await createAdminAlert(inactivityAlert);
  }

  return alerts;
}

// MARK: - DD Toggle Management

/**
 * Toggle DD active/inactive status
 *
 * Updates:
 * - isActive flag
 * - lastActiveTimestamp or lastInactiveTimestamp
 * - inactiveToggles count (if toggling to inactive)
 * - Monitors for alerts
 *
 * @param ddAssignment - The DD assignment to toggle
 * @param isActive - New active status
 * @returns Array of generated alerts (if any)
 */
export async function toggleDDStatus(
  ddAssignment: DDAssignment,
  isActive: boolean
): Promise<AdminAlert[]> {
  const assignmentRef = doc(
    db,
    'events',
    ddAssignment.eventId,
    'ddAssignments',
    ddAssignment.userId
  );

  const updateData: any = {
    isActive,
    updatedAt: Timestamp.now(),
  };

  if (isActive) {
    // Toggling to active
    updateData.lastActiveTimestamp = Timestamp.now();
  } else {
    // Toggling to inactive
    updateData.lastInactiveTimestamp = Timestamp.now();
    updateData.inactiveToggles = ddAssignment.inactiveToggles + 1;
  }

  // Save updated assignment
  await updateDoc(assignmentRef, updateData);

  // Update local object for monitoring
  const updatedAssignment = {
    ...ddAssignment,
    isActive,
    lastActiveTimestamp: isActive ? new Date() : ddAssignment.lastActiveTimestamp,
    lastInactiveTimestamp: !isActive ? new Date() : ddAssignment.lastInactiveTimestamp,
    inactiveToggles: !isActive ? ddAssignment.inactiveToggles + 1 : ddAssignment.inactiveToggles,
  };

  // Monitor for alerts
  return await monitorDDActivity(updatedAssignment);
}

// MARK: - DD Statistics

/**
 * Statistics for a DD during an event
 */
export interface DDStats {
  totalRidesCompleted: number;
  currentActiveRides: number;
  isActive: boolean;
  inactiveToggles: number;
  averageCompletionMinutes: number;
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
 * Get statistics for a DD during an event
 *
 * @param ddId - The DD's user ID
 * @param eventId - The event ID
 * @returns DD statistics
 */
export async function getDDStats(ddId: string, eventId: string): Promise<DDStats> {
  // Fetch DD assignment
  const assignmentRef = doc(db, 'events', eventId, 'ddAssignments', ddId);
  const assignmentSnap = await getDoc(assignmentRef);

  if (!assignmentSnap.exists()) {
    throw new Error('DD assignment not found');
  }

  const assignmentData = assignmentSnap.data();
  const assignment = {
    ...assignmentData,
    id: assignmentSnap.id,
  } as DDAssignment;

  const rides = await fetchDDRides(ddId, eventId);

  const completedRides = rides.filter(r => r.status === 'completed');
  const activeRides = rides.filter(
    r => r.status === 'queued' || r.status === 'assigned' || r.status === 'enroute'
  );

  let avgCompletionTime = 0;
  if (completedRides.length > 0) {
    const totalTime = completedRides.reduce((sum, ride) => {
      if (ride.assignedAt && ride.completedAt) {
        return sum + (ride.completedAt.getTime() - ride.assignedAt.getTime());
      }
      return sum;
    }, 0);

    avgCompletionTime = totalTime / completedRides.length / (1000 * 60); // Convert to minutes
  }

  return {
    totalRidesCompleted: assignment.totalRidesCompleted,
    currentActiveRides: activeRides.length,
    isActive: assignment.isActive,
    inactiveToggles: assignment.inactiveToggles,
    averageCompletionMinutes: Math.floor(avgCompletionTime),
  };
}

// MARK: - Batch DD Updates

/**
 * Reset inactive toggle counts for all DDs in an event
 *
 * This should be called periodically (e.g., every 30 minutes)
 *
 * @param eventId - The event ID
 */
export async function resetInactiveToggles(eventId: string): Promise<void> {
  const assignmentsRef = collection(db, 'events', eventId, 'ddAssignments');
  const snapshot = await getDocs(assignmentsRef);

  const updatePromises = snapshot.docs.map(docSnap =>
    updateDoc(doc(db, 'events', eventId, 'ddAssignments', docSnap.id), {
      inactiveToggles: 0,
    })
  );

  await Promise.all(updatePromises);
}
