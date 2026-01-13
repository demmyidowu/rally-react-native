/**
 * Push Notification Functions
 *
 * Handles sending push notifications to DDs and riders via Firebase Cloud Messaging
 * for ride status updates. Replaces Twilio SMS functionality.
 */

import * as logger from "firebase-functions/logger";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const messaging = getMessaging();

/**
 * Send push notification to a user
 *
 * @param userId - The user ID to send notification to
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload
 * @return boolean indicating success
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    // Get user's FCM token
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.fcmToken) {
      logger.warn("User has no FCM token", { userId });
      return false;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: userData.fcmToken,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "rides",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
    };

    await messaging.send(message);
    logger.info("Push notification sent successfully", { userId, title });
    return true;
  } catch (error: any) {
    logger.error("Failed to send push notification", {
      userId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Notify DD when a new ride is assigned to them
 *
 * Triggered when ride status changes from "queued" to "assigned"
 */
export const notifyDDNewRide = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) {
      logger.error("Missing ride data", { rideId });
      return;
    }

    // Only trigger when status changes from queued to assigned
    if (before.status !== "queued" || after.status !== "assigned") {
      return;
    }

    const ddId = after.ddId;
    if (!ddId) {
      logger.error("No DD ID in ride", { rideId });
      return;
    }

    logger.info("Notifying DD of new ride assignment", {
      rideId,
      ddId,
      riderId: after.riderId,
    });

    const riderName = after.riderName || "Rider";
    const pickupAddress = after.pickupAddress || "Unknown location";
    const isEmergency = after.isEmergency || false;

    const title = isEmergency ? "🚨 Emergency Ride!" : "New Ride Assigned";
    const body = `${riderName} at ${pickupAddress}`;

    await sendPushNotification(ddId, title, body, {
      type: "ride_assigned",
      rideId,
      isEmergency: String(isEmergency),
    });
  }
);

/**
 * Notify rider when DD is en route
 *
 * Triggered when ride status changes from "assigned" to "enroute"
 */
export const notifyRiderEnRoute = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) {
      logger.error("Missing ride data", { rideId });
      return;
    }

    // Only trigger when status changes from assigned to enroute
    if (before.status !== "assigned" || after.status !== "enroute") {
      return;
    }

    const riderId = after.riderId;
    if (!riderId) {
      logger.error("No rider ID in ride", { rideId });
      return;
    }

    logger.info("Notifying rider that DD is en route", {
      rideId,
      riderId,
      ddId: after.ddId,
    });

    const ddName = after.ddName || "Your DD";
    const carDescription = after.ddCarDescription || "their car";
    const estimatedETA = after.estimatedETA;

    let etaText = "on the way";
    if (estimatedETA && estimatedETA > 0) {
      etaText = `${estimatedETA} min${estimatedETA !== 1 ? "s" : ""} away`;
    }

    const title = "Your Ride is On The Way!";
    const body = `${ddName} in ${carDescription} is ${etaText}`;

    await sendPushNotification(riderId, title, body, {
      type: "dd_enroute",
      rideId,
      eta: String(estimatedETA || 0),
    });
  }
);

/**
 * Notify rider when ride is completed
 *
 * Triggered when ride status changes to "completed"
 */
export const notifyRideComplete = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) {
      logger.error("Missing ride data", { rideId });
      return;
    }

    // Only trigger when status changes to completed
    if (after.status !== "completed" || before.status === "completed") {
      return;
    }

    const riderId = after.riderId;
    if (!riderId) {
      return;
    }

    logger.info("Notifying rider of ride completion", { rideId, riderId });

    await sendPushNotification(riderId, "Ride Complete", "Thank you for using Rally! Stay safe.", {
      type: "ride_complete",
      rideId,
    });
  }
);

/**
 * Increment DD ride count when ride is completed
 *
 * Triggered when ride status changes to "completed"
 * Updates the DD's totalRidesCompleted counter
 */
export const incrementDDRideCount = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) {
      logger.error("Missing ride data", { rideId });
      return;
    }

    // Only trigger when status changes to completed
    if (after.status !== "completed" || before.status === "completed") {
      return;
    }

    const ddId = after.ddId;
    const eventId = after.eventId;

    if (!ddId || !eventId) {
      logger.error("Missing ddId or eventId", { rideId, ddId, eventId });
      return;
    }

    logger.info("Incrementing DD ride count", {
      rideId,
      ddId,
      eventId,
    });

    try {
      // Update DD assignment ride count
      const ddAssignmentRef = db
        .collection("events")
        .doc(eventId)
        .collection("ddAssignments")
        .doc(ddId);

      const ddAssignment = await ddAssignmentRef.get();
      const currentCount = ddAssignment.data()?.totalRidesCompleted || 0;

      await ddAssignmentRef.update({
        totalRidesCompleted: currentCount + 1,
      });

      logger.info("DD ride count incremented successfully", {
        rideId,
        ddId,
        newCount: currentCount + 1,
      });
    } catch (error: any) {
      logger.error("Error incrementing DD ride count", {
        rideId,
        ddId,
        error: error.message,
      });
    }
  }
);

/**
 * Notify admins when emergency ride is created
 *
 * Triggered when a new ride is created with isEmergency = true
 */
export const notifyEmergencyRide = onDocumentCreated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const ride = event.data?.data();
    const rideId = event.params.rideId;

    if (!ride || !ride.isEmergency) {
      return;
    }

    logger.info("Emergency ride created, notifying admins", { rideId });

    const chapterId = ride.chapterId;
    if (!chapterId) {
      return;
    }

    // Get all admins for the chapter
    const adminsSnapshot = await db
      .collection("users")
      .where("chapterId", "==", chapterId)
      .where("role", "==", "admin")
      .get();

    const riderName = ride.riderName || "Rider";
    const location = ride.pickupAddress || "Unknown location";

    // Notify each admin
    const promises = adminsSnapshot.docs.map((doc) =>
      sendPushNotification(
        doc.id,
        "🚨 EMERGENCY RIDE",
        `${riderName} needs emergency ride at ${location}`,
        {
          type: "emergency_ride",
          rideId,
        }
      )
    );

    await Promise.all(promises);
    logger.info("Emergency notifications sent to admins", {
      rideId,
      adminCount: adminsSnapshot.size,
    });
  }
);

/**
 * Notify rider when DD has arrived at pickup location
 *
 * Triggered when ride status changes from "enroute" to "arrived"
 */
export const notifyRiderDDArrived = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) {
      logger.error("Missing ride data", { rideId });
      return;
    }

    // Only trigger when status changes from enroute to arrived
    if (before.status !== "enroute" || after.status !== "arrived") {
      return;
    }

    const riderId = after.riderId;
    if (!riderId) {
      logger.error("No rider ID in ride", { rideId });
      return;
    }

    logger.info("Notifying rider that DD has arrived", {
      rideId,
      riderId,
      ddId: after.ddId,
    });

    const ddName = after.ddName || "Your DD";
    const carDescription = after.ddCarDescription || "their car";

    const title = "🚗 Your DD Has Arrived!";
    const body = `${ddName} in ${carDescription} is here! Head to your pickup location.`;

    await sendPushNotification(riderId, title, body, {
      type: "dd_arrived",
      rideId,
    });
  }
);
