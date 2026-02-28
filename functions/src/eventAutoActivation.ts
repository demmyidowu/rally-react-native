/**
 * Event Auto-Activation Function
 *
 * Scheduled function that runs every 5 minutes to automatically:
 * 1. Activate SCHEDULED events when their startTime is reached
 * 2. Complete ACTIVE events when their endTime is reached
 *
 * Uses Central Time (America/Chicago) for Kansas.
 */

import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Event status constants (matching src/models/Event.ts)
const EventStatus = {
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

/**
 * Event Auto-Activation Scheduled Function
 *
 * Runs every 5 minutes to check for events that need activation or completion
 * Schedule: "* /5 * * * *" = every 5 minutes (space added to avoid closing comment)
 */
export const eventAutoActivation = onSchedule(
  {
    schedule: "*/5 * * * *", // Every 5 minutes
    timeZone: "America/Chicago", // Central Time for Kansas
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async () => {
    logger.info("Event auto-activation check started");

    const now = Timestamp.now();
    let eventsActivated = 0;
    let eventsCompleted = 0;

    try {
      // ================================================================
      // 1. Activate SCHEDULED events where startTime <= now
      // ================================================================
      const scheduledEventsSnapshot = await db
        .collection("events")
        .where("status", "==", EventStatus.SCHEDULED)
        .where("startTime", "<=", now)
        .get();

      if (!scheduledEventsSnapshot.empty) {
        logger.info("Found events to activate", {
          count: scheduledEventsSnapshot.size,
        });

        const activationPromises = scheduledEventsSnapshot.docs.map(
          async (eventDoc) => {
            const event = eventDoc.data();
            try {
              await eventDoc.ref.update({
                status: EventStatus.ACTIVE,
                updatedAt: FieldValue.serverTimestamp(),
              });

              logger.info("Event activated", {
                eventId: eventDoc.id,
                eventName: event.name,
                chapterId: event.chapterId,
                startTime: event.startTime?.toDate?.()?.toISOString(),
              });

              eventsActivated++;
            } catch (error: any) {
              logger.error("Failed to activate event", {
                eventId: eventDoc.id,
                error: error.message,
              });
            }
          }
        );

        await Promise.all(activationPromises);
      }

      // ================================================================
      // 2. Complete ACTIVE events where endTime <= now
      // ================================================================
      const activeEventsSnapshot = await db
        .collection("events")
        .where("status", "==", EventStatus.ACTIVE)
        .where("endTime", "<=", now)
        .get();

      if (!activeEventsSnapshot.empty) {
        logger.info("Found events to complete", {
          count: activeEventsSnapshot.size,
        });

        const completionPromises = activeEventsSnapshot.docs.map(
          async (eventDoc) => {
            const event = eventDoc.data();
            try {
              await eventDoc.ref.update({
                status: EventStatus.COMPLETED,
                updatedAt: FieldValue.serverTimestamp(),
              });

              logger.info("Event completed", {
                eventId: eventDoc.id,
                eventName: event.name,
                chapterId: event.chapterId,
                endTime: event.endTime?.toDate?.()?.toISOString(),
              });

              eventsCompleted++;
            } catch (error: any) {
              logger.error("Failed to complete event", {
                eventId: eventDoc.id,
                error: error.message,
              });
            }
          }
        );

        await Promise.all(completionPromises);
      }

      logger.info("Event auto-activation check completed", {
        eventsActivated,
        eventsCompleted,
        timestamp: now.toDate().toISOString(),
      });
    } catch (error: any) {
      logger.error("Event auto-activation check failed", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);
