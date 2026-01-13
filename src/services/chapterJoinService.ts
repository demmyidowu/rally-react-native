/**
 * Chapter Join Request Service
 * 
 * Handles requests from users to join a chapter.
 * Notifies chapter admins when a new request is made.
 */

import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface JoinRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    chapterId: string;
    chapterName: string;
    universityId: string;
    status: 'pending' | 'approved' | 'rejected';
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create a request to join a chapter
 */
export async function createJoinRequest(
    userId: string,
    userName: string,
    userEmail: string,
    chapterId: string,
    chapterName: string,
    universityId: string,
    message?: string
): Promise<string> {
    // Check if user already has a pending request for this chapter
    const existingQuery = query(
        collection(db, 'joinRequests'),
        where('userId', '==', userId),
        where('chapterId', '==', chapterId),
        where('status', '==', 'pending')
    );
    const existing = await getDocs(existingQuery);

    if (!existing.empty) {
        throw new Error('You already have a pending request for this chapter');
    }

    const requestData = {
        userId,
        userName,
        userEmail,
        chapterId,
        chapterName,
        universityId,
        status: 'pending',
        message: message || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'joinRequests'), requestData);
    console.log('✅ Join request created:', docRef.id);

    return docRef.id;
}

/**
 * Get all pending join requests for a chapter (for admins)
 */
export async function getChapterJoinRequests(chapterId: string): Promise<JoinRequest[]> {
    const q = query(
        collection(db, 'joinRequests'),
        where('chapterId', '==', chapterId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as JoinRequest[];
}

/**
 * Get user's join requests
 */
export async function getUserJoinRequests(userId: string): Promise<JoinRequest[]> {
    const q = query(
        collection(db, 'joinRequests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as JoinRequest[];
}

/**
 * Approve a join request (admin action)
 */
export async function approveJoinRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'joinRequests', requestId);
    const requestDoc = await getDocs(query(collection(db, 'joinRequests'), where('__name__', '==', requestId)));

    if (requestDoc.empty) {
        throw new Error('Request not found');
    }

    const requestData = requestDoc.docs[0].data();

    // Update user's chapterId
    await updateDoc(doc(db, 'users', requestData.userId), {
        chapterId: requestData.chapterId,
        updatedAt: Timestamp.now(),
    });

    // Update request status
    await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
    });

    console.log('✅ Join request approved:', requestId);
}

/**
 * Reject a join request (admin action)
 */
export async function rejectJoinRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, 'joinRequests', requestId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
    });

    console.log('❌ Join request rejected:', requestId);
}

/**
 * Cancel a join request (user action)
 */
export async function cancelJoinRequest(requestId: string, userId: string): Promise<void> {
    const requestRef = doc(db, 'joinRequests', requestId);

    // Verify the request belongs to the user
    const requestDoc = await getDocs(
        query(collection(db, 'joinRequests'), where('__name__', '==', requestId))
    );

    if (requestDoc.empty) {
        throw new Error('Request not found');
    }

    const requestData = requestDoc.docs[0].data();
    if (requestData.userId !== userId) {
        throw new Error('You can only cancel your own requests');
    }

    await deleteDoc(requestRef);
    console.log('🗑️ Join request cancelled:', requestId);
}

/**
 * Get count of pending requests for a chapter
 */
export async function getPendingRequestCount(chapterId: string): Promise<number> {
    const q = query(
        collection(db, 'joinRequests'),
        where('chapterId', '==', chapterId),
        where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
}
