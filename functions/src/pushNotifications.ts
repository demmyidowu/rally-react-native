/**
 * Push Notification Functions
 *
 * Handles sending push notifications to DDs and riders via Firebase Cloud Messaging
 * for ride status updates.
 *
 * Flow:
 * 1. Ride queued → DD assigned → DD notified with pickup location
 * 2. DD accepts (ride becomes "enroute") → Rider notified with DD info + ETA (single notification)
 * 3. DD arrives → Rider notified
 * 4. Ride completed → Rider notified
 */

import * as logger from "firebase-functions/logger";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { defineSecret } from "firebase-functions/params";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const messaging = getMessaging();

// Define the secret for Google Maps API
const googleMapsApiKey = defineSecret("GOOGLE_PLACES_API_KEY");

/**
 * Calculate driving ETA between two points
 */
async function calculateDrivingETA(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number> {
  const apiKey = googleMapsApiKey.value();
  if (!apiKey) {
    logger.warn("No Google Maps API key, returning default ETA");
    return 15; // Default 15 min
  }

  try {
    const params = new URLSearchParams({
      origins: `${originLat},${originLng}`,
      destinations: `${destLat},${destLng}`,
      key: apiKey,
      mode: "driving",
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );

    const data = await response.json();
    const element = data.rows?.[0]?.elements?.[0];

    if (element?.status === "OK") {
      return Math.ceil((element.duration?.value || 900) / 60);
    }
  } catch (error) {
    logger.error("ETA calculation failed", { error });
  }

  return 15; // Default fallback
}

/**
 * Send push notification to a user
 * Configured for background/lock screen delivery
 */
async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
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
          priority: "high" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10", // High priority for immediate delivery
        },
        payload: {
          aps: {
            badge: 1,
            sound: "default",
            "content-available": 1, // Background notification
          },
        },
      },
    };

    await messaging.send(message);
    logger.info("Push notification sent", { userId, title });
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
 * Format: "New ride request. Pick up {Name} from {Address}"
 * Deep links to open pickup in maps
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

    if (!before || !after) return;

    // Only trigger when status changes from queued to assigned
    if (before.status !== "queued" || after.status !== "assigned") {
      return;
    }

    const ddId = after.ddId;
    if (!ddId) {
      logger.error("No DD ID in ride", { rideId });
      return;
    }

    const riderName = after.riderName || "Rider";
    const pickupAddress = after.pickupAddress || "Unknown location";
    const pickupLat = after.pickupLocation?._latitude || after.pickupLocation?.latitude;
    const pickupLng = after.pickupLocation?._longitude || after.pickupLocation?.longitude;
    const isEmergency = after.isEmergency || false;

    const title = isEmergency
      ? "🚨 Emergency Ride Request"
      : "New ride request";
    const body = `Pick up ${riderName} from "${pickupAddress}"`;

    // Include coordinates for deep linking to maps
    await sendPushNotification(ddId, title, body, {
      type: "ride_assigned",
      rideId,
      riderName,
      pickupAddress,
      pickupLat: String(pickupLat || ""),
      pickupLng: String(pickupLng || ""),
      isEmergency: String(isEmergency),
    });

    logger.info("DD notified of new ride", { rideId, ddId, riderName });
  }
);

/**
 * Notify rider when DD accepts/is en route
 *
 * Format: "{DD Name} is on the way in a {Color} {Make} {Model}! ~{ETA} min away"
 *
 * Merged flow: Assignment implies en route, single notification
 * Captures DD location and calculates ETA
 *
 * Triggered when ride status changes from "assigned" to "enroute"
 */
export const notifyRiderEnRoute = onDocumentUpdated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [googleMapsApiKey],
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const rideId = event.params.rideId;

    if (!before || !after) return;

    // Trigger when assigned → enroute
    if (before.status !== "assigned" || after.status !== "enroute") {
      return;
    }

    const riderId = after.riderId;
    const ddId = after.ddId;
    if (!riderId || !ddId) {
      logger.error("Missing rider or DD ID", { rideId });
      return;
    }

    // Fetch DD info for car details
    const ddDoc = await db.collection("users").doc(ddId).get();
    const ddData = ddDoc.data();

    const ddName = after.ddName || ddData?.name || "Your DD";
    const carColor = ddData?.carColor || "";
    const carMake = ddData?.carMake || "";
    const carModel = ddData?.carModel || "";

    // Format car description
    const carDescription = carColor && carMake && carModel
      ? `${carColor} ${carMake} ${carModel}`
      : "their car";

    // Get ETA from ride document or calculate
    let etaMinutes = after.estimatedETA;

    if (!etaMinutes && after.ddLocation && after.pickupLocation) {
      const ddLat = after.ddLocation._latitude || after.ddLocation.latitude;
      const ddLng = after.ddLocation._longitude || after.ddLocation.longitude;
      const pickupLat = after.pickupLocation._latitude || after.pickupLocation.latitude;
      const pickupLng = after.pickupLocation._longitude || after.pickupLocation.longitude;

      if (ddLat && ddLng && pickupLat && pickupLng) {
        etaMinutes = await calculateDrivingETA(ddLat, ddLng, pickupLat, pickupLng);

        // Update ride with calculated ETA
        await db.collection("rides").doc(rideId).update({
          estimatedETA: etaMinutes,
        });
      }
    }

    const etaText = etaMinutes ? `~${etaMinutes} minutes away` : "on the way";

    const title = "🚗 Your DD is on the way!";
    const body = `${ddName} is on the way in a ${carDescription}! ${etaText}.`;

    await sendPushNotification(riderId, title, body, {
      type: "dd_enroute",
      rideId,
      ddName,
      carDescription,
      eta: String(etaMinutes || 0),
    });

    logger.info("Rider notified of DD en route", {
      rideId,
      riderId,
      ddName,
      etaMinutes,
    });
  }
);

/**
 * Notify rider when DD has arrived
 *
 * Triggered when ride status changes to "arrived"
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

    if (!before || !after) return;

    // Trigger when enroute → arrived
    if (before.status !== "enroute" || after.status !== "arrived") {
      return;
    }

    const riderId = after.riderId;
    if (!riderId) return;

    const ddName = after.ddName || "Your DD";

    // Get car description
    const ddId = after.ddId;
    let carDescription = "their car";
    if (ddId) {
      const ddDoc = await db.collection("users").doc(ddId).get();
      const ddData = ddDoc.data();
      if (ddData?.carColor && ddData?.carMake && ddData?.carModel) {
        carDescription = `${ddData.carColor} ${ddData.carMake} ${ddData.carModel}`;
      }
    }

    const title = "🚗 Your DD Has Arrived!";
    const body = `${ddName} in the ${carDescription} is here! Head to your pickup location.`;

    await sendPushNotification(riderId, title, body, {
      type: "dd_arrived",
      rideId,
    });
  }
);

/**
 * Notify rider when ride is completed
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

    if (!before || !after) return;

    // Only trigger when status changes to completed
    if (after.status !== "completed" || before.status === "completed") {
      return;
    }

    const riderId = after.riderId;
    if (!riderId) return;

    const title = "Ride Complete!";
    const body = "Thanks for using Rally Ride. Get home safe!";

    await sendPushNotification(riderId, title, body, {
      type: "ride_complete",
      rideId,
    });
  }
);

/**
 * Increment DD ride count when ride is completed
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

    if (!before || !after) return;

    if (after.status !== "completed" || before.status === "completed") {
      return;
    }

    const ddId = after.ddId;
    if (!ddId) return;

    try {
      await db.collection("users").doc(ddId).update({
        totalRidesCompleted: FieldValue.increment(1),
      });

      logger.info("DD ride count incremented", { ddId, rideId });
    } catch (error: any) {
      logger.error("Error incrementing DD ride count", {
        ddId,
        rideId,
        error: error.message,
      });
    }
  }
);

/**
 * Notify admins when emergency ride is created
 */
export const notifyEmergencyRide = onDocumentCreated(
  {
    document: "rides/{rideId}",
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (event) => {
    const rideData = event.data?.data();
    const rideId = event.params.rideId;

    if (!rideData?.isEmergency) {
      return;
    }

    // Get all admins from the rider's chapter
    const chapterId = rideData.chapterId;
    if (!chapterId) return;

    const adminsSnapshot = await db
      .collection("users")
      .where("chapterId", "==", chapterId)
      .where("role", "==", "admin")
      .get();

    const riderName = rideData.riderName || "Rider";
    const pickupAddress = rideData.pickupAddress || "Unknown location";

    const title = "🚨 Emergency Ride Alert";
    const body = `${riderName} needs emergency pickup from ${pickupAddress}`;

    const promises = adminsSnapshot.docs.map((adminDoc) =>
      sendPushNotification(adminDoc.id, title, body, {
        type: "emergency_ride",
        rideId,
      })
    );

    await Promise.all(promises);
    logger.info("Emergency notifications sent", {
      rideId,
      adminCount: adminsSnapshot.size,
    });
  }
);
