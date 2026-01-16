/**
 * Firebase Cloud Functions for Rally Ride App
 *
 * This file exports all Cloud Functions for the Rally Ride application.
 * Functions are organized by responsibility:
 *
 * 1. Ride Management (rideAssignment.ts)
 *    - autoAssignRide: Automatically assign rides to DDs with shortest wait time
 *
 * 2. Push Notifications (pushNotifications.ts)
 *    - notifyDDNewRide: Send push notification to DD when ride is assigned
 *    - notifyRiderEnRoute: Send push notification to rider when DD is en route
 *    - notifyRideComplete: Send push notification when ride is completed
 *    - incrementDDRideCount: Update DD ride count on completion
 *    - notifyEmergencyRide: Alert admins of emergency rides
 *
 * 3. Scheduled Tasks (yearTransition.ts)
 *    - yearTransition: Annual class year transition (August 1st)
 *
 * 4. Activity Monitoring (ddMonitoring.ts)
 *    - monitorDDActivity: Monitor DD inactive toggles and prolonged inactivity
 *
 * 5. Emergency Handling (emergencyHandler.ts)
 *    - handleEmergencyRide: Process emergency ride requests
 *    - monitorEmergencyRideStatus: Alert if emergency ride unassigned too long
 *
 * @see https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions/v2";

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10, // Cost control
  region: "us-central1", // Central US region for K-State
});

// ============================================================================
// RIDE MANAGEMENT
// ============================================================================

/**
 * Automatically assigns new rides to the DD with the shortest wait time
 * Trigger: onCreate rides/{rideId}
 */
export { autoAssignRide } from "./rideAssignment";

// ============================================================================
// PUSH NOTIFICATIONS (Replaced SMS with FCM)
// ============================================================================

/**
 * Sends push notification to DD when a new ride is assigned
 * Trigger: onUpdate rides/{rideId} (queued -> assigned)
 */
export { notifyDDNewRide } from "./pushNotifications";

/**
 * Sends push notification to rider when DD marks en route
 * Trigger: onUpdate rides/{rideId} (assigned -> enroute)
 */
export { notifyRiderEnRoute } from "./pushNotifications";

/**
 * Sends push notification to rider when ride is completed
 * Trigger: onUpdate rides/{rideId} (any -> completed)
 */
export { notifyRideComplete } from "./pushNotifications";

/**
 * Increments DD's totalRidesCompleted counter when ride is completed
 * Trigger: onUpdate rides/{rideId} (any -> completed)
 */
export { incrementDDRideCount } from "./pushNotifications";

/**
 * Notifies admins when an emergency ride is created
 * Trigger: onCreate rides/{rideId} where isEmergency === true
 */
export { notifyEmergencyRide } from "./pushNotifications";

/**
 * Sends push notification to rider when DD has arrived at pickup
 * Trigger: onUpdate rides/{rideId} (enroute -> arrived)
 */
export { notifyRiderDDArrived } from "./pushNotifications";

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

/**
 * Annual year transition function
 * Schedule: August 1st at midnight (America/Chicago)
 * Actions:
 * - Removes all seniors (classYear === 4)
 * - Advances all other members (classYear += 1)
 * - Creates audit log
 * - Notifies admins
 */
export { yearTransition } from "./yearTransition";

// ============================================================================
// ACTIVITY MONITORING
// ============================================================================

/**
 * Monitors DD activity patterns and creates alerts
 * Trigger: onUpdate events/{eventId}/ddAssignments/{ddId}
 * Checks:
 * - Excessive inactive toggles (>5)
 * - Prolonged inactivity (>15 minutes)
 * - Auto-resets toggle counter after 30 minutes
 */
export { monitorDDActivity } from "./ddMonitoring";

// ============================================================================
// EMERGENCY HANDLING
// ============================================================================

/**
 * Handles emergency ride requests
 * Trigger: onCreate rides/{rideId} where isEmergency === true
 * Actions:
 * - Sets priority to 9999
 * - Creates admin alert
 * - Notifies chapter admins via push notification
 */
export { handleEmergencyRide } from "./emergencyHandler";

/**
 * Monitors emergency ride assignment status
 * Trigger: onCreate rides/{rideId} where isEmergency === true
 * Waits 2 minutes, then alerts if still unassigned
 */
export { monitorEmergencyRideStatus } from "./emergencyHandler";

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Export utility functions for testing purposes
export * as validation from "./utils/validation";

// ============================================================================
// ADMIN CODE SELF-REGISTRATION
// ============================================================================

/**
 * Validates an admin code against a university
 * Callable function for signup flow
 */
export { validateAdminCode } from "./adminCode";

/**
 * Creates a user with admin role if valid admin code is provided
 * Callable function for signup flow
 */
export { createAdminUser } from "./adminCode";

/**
 * Transfers admin status from one user to another
 * Callable function for admin settings
 */
export { transferAdminStatus } from "./adminCode";

// ============================================================================
// GOOGLE PLACES PROXY
// ============================================================================

/**
 * Searches for place predictions (address autocomplete)
 * Callable function - keeps API key server-side
 */
export { searchPlaces } from "./placesProxy";

/**
 * Gets place details including coordinates
 * Callable function - keeps API key server-side
 */
export { getPlaceDetails } from "./placesProxy";

// ============================================================================
// LOCATION SERVICES
// ============================================================================

/**
 * Reverse geocode coordinates to address
 * Callable function - keeps API key server-side
 */
export { reverseGeocode } from "./locationServices";

/**
 * Calculate driving ETA between two points
 * Callable function - keeps API key server-side
 */
export { calculateETA } from "./locationServices";

// ============================================================================
// SEED DATA (One-time setup)
// ============================================================================

/**
 * Seeds chapters data into Firestore
 * One-time HTTP trigger - call via curl after deployment
 */
export { seedChapters } from "./seedData";

/**
 * Fixes university data (adds missing adminCode)
 * Call with ?code=YOUR_ADMIN_CODE
 */
export { fixUniversityData } from "./fixData";


