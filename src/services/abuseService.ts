/**
 * Abuse Penalty Service
 *
 * Shared logic for applying emergency ride abuse penalties.
 * Called from both the Admin (AlertsScreen) and DD (RideDetailsScreen) paths.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateUserProfile } from './authService';
import { EMERGENCY_ABUSE_PENALTY_DURATION_MS } from '../constants/penalties';

/**
 * Apply a 7-day priority penalty to a rider for abusing the emergency button.
 *
 * This function is idempotent per alert: it stamps `abusePenaltyApplied = true`
 * on the originating emergency alert so neither the admin nor DD path can fire twice.
 *
 * @param riderId     Firebase UID of the rider to penalise
 * @param rideId      Firestore ID of the emergency ride
 * @param chapterId   Chapter the ride belongs to
 * @param reportedByDd  true = called from DD screen; false = called from admin screen
 * @param ddName      DD's display name (only used when reportedByDd = true)
 */
export async function applyAbusePenalty(
  riderId: string,
  rideId: string,
  chapterId: string,
  reportedByDd: boolean,
  ddName?: string,
): Promise<void> {
  // 1. Fetch current strike count
  const userSnap = await getDoc(doc(db, 'users', riderId));
  const currentStrikes = userSnap.data()?.emergencyAbuseStrikes ?? 0;

  // 2. Write penalty fields to user profile
  await updateUserProfile(riderId, {
    emergencyAbusePenaltyUntil: new Date(Date.now() + EMERGENCY_ABUSE_PENALTY_DURATION_MS).toISOString(),
    emergencyAbuseStrikes: currentStrikes + 1,
  });

  // 3. Stamp the original emergency alert as penalty-applied to prevent double-penalty
  const alertsQuery = query(
    collection(db, 'adminAlerts'),
    where('rideId', '==', rideId),
    where('type', '==', 'emergency_request'),
  );
  const alertSnap = await getDocs(alertsQuery);
  alertSnap.forEach((d) => updateDoc(d.ref, { abusePenaltyApplied: true }));

  // 4. If a DD reported it, create a new alert so admins are informed
  if (reportedByDd) {
    await addDoc(collection(db, 'adminAlerts'), {
      chapterId,
      type: 'dd_abuse_report',
      message: `DD ${ddName ?? 'Unknown'} flagged emergency ride as non-emergency. Penalty (7 days) has been applied automatically.`,
      rideId,
      riderId,
      abusePenaltyApplied: true,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  }
}
