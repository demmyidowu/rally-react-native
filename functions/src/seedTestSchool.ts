/**
 * One-time seed function for App Store review test school
 *
 * Call via: curl https://us-central1-ddride-didowu.cloudfunctions.net/seedTestSchool
 *
 * Creates:
 * - universities/test (RallyRide Demo University, geofencing disabled)
 * - universities/test/chapters/test-demo-fraternity
 * - events/app-store-review-event (permanently active, endTime 2099)
 * - reviewerRider@ksu.edu (member account, emailVerified via Admin SDK)
 * - reviewerDD@ksu.edu (admin account, car pre-set, active DD assignment)
 *
 * Guard: _seeds/testSchool — function is a no-op if that doc exists.
 */

import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getApps, initializeApp } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * Creates a Firebase Auth user, handling the case where the account already
 * exists from a previous partial run. Returns the uid either way.
 */
async function upsertAuthUser(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<string> {
  try {
    const user = await auth.createUser({
      email: params.email,
      password: params.password,
      displayName: params.displayName,
      emailVerified: true,
    });
    return user.uid;
  } catch (err: any) {
    if (err.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(params.email);
      // Ensure emailVerified is set in case it wasn't on a prior partial run
      await auth.updateUser(existing.uid, { emailVerified: true });
      return existing.uid;
    }
    throw err;
  }
}

export const seedTestSchool = onRequest(
  { region: "us-central1", timeoutSeconds: 120 },
  async (_req, res) => {
    try {
      // Guard check — only run once
      const guardDoc = await db.collection("_seeds").doc("testSchool").get();
      if (guardDoc.exists) {
        res.status(200).json({ already_seeded: true });
        return;
      }

      console.log("🚀 Starting test school seed...");

      const now = FieldValue.serverTimestamp();
      const startTime = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000)); // 1 hr ago
      const endTime = Timestamp.fromDate(new Date("2099-12-31T23:59:59Z"));

      // ------------------------------------------------------------------ //
      // 1. Firestore documents
      // ------------------------------------------------------------------ //

      // universities/test
      await db.collection("universities").doc("test").set({
        name: "RallyRide Demo University",
        shortName: "Demo",
        emailDomains: ["ksu.edu"],
        adminCode: "REVIEWTEST",
        isActive: true,
        geofencingEnabled: false,
        state: "Kansas",
        city: "Manhattan",
        createdAt: now,
        updatedAt: now,
      });

      // universities/test/chapters/test-demo-fraternity
      await db
        .collection("universities")
        .doc("test")
        .collection("chapters")
        .doc("test-demo-fraternity")
        .set({
          name: "Demo Fraternity",
          type: "fraternity",
          universityId: "test",
          createdAt: now,
          updatedAt: now,
        });

      // events/app-store-review-event (permanently active)
      await db.collection("events").doc("app-store-review-event").set({
        name: "App Review Event",
        chapterId: "test-demo-fraternity",
        status: "active",
        allowAll: true,
        startTime: startTime,
        endTime: endTime,
        createdBy: "seed-function",
        createdAt: now,
        updatedAt: now,
      });

      // ------------------------------------------------------------------ //
      // 2. Auth accounts + Firestore user docs
      // ------------------------------------------------------------------ //

      // Rider account
      const riderUid = await upsertAuthUser({
        email: "reviewerRider@ksu.edu",
        password: "RallyDemo2025!",
        displayName: "Test Rider",
      });

      await db.collection("users").doc(riderUid).set({
        id: riderUid,
        name: "Test Rider",
        email: "reviewerRider@ksu.edu",
        chapterId: "test-demo-fraternity",
        role: "member",
        classYear: 1,
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      });

      // DD account (admin, car pre-set)
      const ddUid = await upsertAuthUser({
        email: "reviewerDD@ksu.edu",
        password: "RallyDemo2025!",
        displayName: "Test DD",
      });

      await db.collection("users").doc(ddUid).set({
        id: ddUid,
        name: "Test DD",
        email: "reviewerDD@ksu.edu",
        chapterId: "test-demo-fraternity",
        role: "admin",
        classYear: 1,
        isEmailVerified: true,
        carColor: "Black",
        carMake: "Demo",
        carModel: "Car",
        isActive: true,
        totalRidesCompleted: 0,
        createdAt: now,
        updatedAt: now,
      });

      // ------------------------------------------------------------------ //
      // 3. DDAssignment so auto-assign immediately finds this DD
      // ------------------------------------------------------------------ //

      await db.collection("ddAssignments").doc(ddUid).set({
        eventId: "app-store-review-event",
        ddId: ddUid,
        ddName: "Test DD",
        carDescription: "Black Demo Car",
        isActive: true,
        totalRides: 0,
        currentRides: [],
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // ------------------------------------------------------------------ //
      // 4. Guard document — mark as seeded
      // ------------------------------------------------------------------ //

      await db.collection("_seeds").doc("testSchool").set({
        seededAt: now,
        riderUid,
        ddUid,
      });

      console.log("✅ Test school seeded successfully");
      console.log(`   Rider UID: ${riderUid}`);
      console.log(`   DD UID:    ${ddUid}`);

      res.status(200).json({
        success: true,
        message: "Test school seeded",
        riderUid,
        ddUid,
      });
    } catch (error: any) {
      console.error("❌ Seed failed:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
