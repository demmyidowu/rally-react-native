/**
 * Admin Code Functions
 *
 * Handles admin code validation for chapter admin self-registration.
 * Each university has a unique admin code that IFC shares with chapter admins.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const db = admin.firestore();

/**
 * Validate Admin Code
 *
 * Validates an admin code against a university's stored admin code.
 * Returns validation result with university info if valid.
 *
 * @param adminCode - The admin code to validate
 * @param universityId - The university ID to validate against
 * @returns { valid: boolean, universityName?: string, error?: string }
 */
export const validateAdminCode = onCall(async (request) => {
    const { adminCode, universityId } = request.data;

    // Validate input
    if (!adminCode || typeof adminCode !== 'string') {
        throw new HttpsError('invalid-argument', 'Admin code is required');
    }

    if (!universityId || typeof universityId !== 'string') {
        throw new HttpsError('invalid-argument', 'University ID is required');
    }

    try {
        // Get university document
        const universityDoc = await db.collection('universities').doc(universityId).get();

        if (!universityDoc.exists) {
            return {
                valid: false,
                error: 'University not found',
            };
        }

        const universityData = universityDoc.data();
        if (!universityData) {
            return {
                valid: false,
                error: 'University data not found',
            };
        }

        // Compare admin codes (case-insensitive)
        const storedCode = universityData.adminCode?.toLowerCase();
        const providedCode = adminCode.toLowerCase().trim();

        if (!storedCode) {
            return {
                valid: false,
                error: 'Admin code not configured for this university',
            };
        }

        if (storedCode !== providedCode) {
            return {
                valid: false,
                error: 'Invalid admin code',
            };
        }

        // Valid admin code
        return {
            valid: true,
            universityId: universityDoc.id,
            universityName: universityData.name,
            universityShortName: universityData.shortName,
        };
    } catch (error: any) {
        console.error('Error validating admin code:', error);
        throw new HttpsError('internal', 'Failed to validate admin code');
    }
});

/**
 * Create User with Admin Code
 *
 * Creates a new user with chapter_admin role if valid admin code is provided.
 * This is called during signup when the user checks "I'm a Chapter Admin".
 *
 * @param userData - User data for registration
 * @param adminCode - The admin code for admin registration
 * @param universityId - The university ID
 * @param chapterId - The chapter ID (optional)
 */
export const createAdminUser = onCall(async (request) => {
    const { userData, adminCode, universityId } = request.data;

    // Validate required fields
    if (!userData || !adminCode || !universityId) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Validate the admin code
    const universityDoc = await db.collection('universities').doc(universityId).get();

    if (!universityDoc.exists) {
        throw new HttpsError('not-found', 'University not found');
    }

    const universityData = universityDoc.data();
    const storedCode = universityData?.adminCode?.toLowerCase();
    const providedCode = adminCode.toLowerCase().trim();

    if (!storedCode || storedCode !== providedCode) {
        throw new HttpsError('permission-denied', 'Invalid admin code');
    }

    // User is authorized - the actual user creation is handled by Firebase Auth
    // This function just validates and returns confirmation
    return {
        valid: true,
        role: 'admin',
        universityId,
        universityName: universityData?.name,
        selfRegisteredAdmin: true,
    };
});

/**
 * Transfer Admin Status
 *
 * Transfers chapter admin status from one user to another.
 * The caller must be the current chapter admin.
 *
 * @param newAdminUserId - The user ID to transfer admin status to
 */
export const transferAdminStatus = onCall(async (request) => {
    const { newAdminUserId } = request.data;
    const callerUid = request.auth?.uid;

    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    if (!newAdminUserId || typeof newAdminUserId !== 'string') {
        throw new HttpsError('invalid-argument', 'New admin user ID is required');
    }

    try {
        // Get caller's user document
        const callerDoc = await db.collection('users').doc(callerUid).get();
        if (!callerDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }

        const callerData = callerDoc.data();
        if (callerData?.role !== 'admin') {
            throw new HttpsError('permission-denied', 'Only chapter admins can transfer admin status');
        }

        const callerChapterId = callerData?.chapterId;
        if (!callerChapterId) {
            throw new HttpsError('failed-precondition', 'You must belong to a chapter');
        }

        // Get new admin's user document
        const newAdminDoc = await db.collection('users').doc(newAdminUserId).get();
        if (!newAdminDoc.exists) {
            throw new HttpsError('not-found', 'New admin user not found');
        }

        const newAdminData = newAdminDoc.data();
        if (newAdminData?.chapterId !== callerChapterId) {
            throw new HttpsError('permission-denied', 'New admin must be in the same chapter');
        }

        if (newAdminData?.role === 'admin') {
            throw new HttpsError('already-exists', 'User is already an admin');
        }

        // Perform the transfer in a batch
        const batch = db.batch();

        // Demote current admin to member
        batch.update(db.collection('users').doc(callerUid), {
            role: 'member',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Promote new admin
        batch.update(db.collection('users').doc(newAdminUserId), {
            role: 'admin',
            selfRegisteredAdmin: false, // They received admin through transfer
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create audit log
        batch.set(db.collection('adminTransferLogs').doc(), {
            fromUserId: callerUid,
            toUserId: newAdminUserId,
            chapterId: callerChapterId,
            transferredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();

        return {
            success: true,
            message: 'Admin status transferred successfully',
        };
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error('Error transferring admin status:', error);
        throw new HttpsError('internal', 'Failed to transfer admin status');
    }
});

