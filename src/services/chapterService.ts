/**
 * Chapter Service
 * 
 * Fetches chapters from Firestore with caching for performance.
 * Chapters are stored under universities/{universityId}/chapters/{chapterId}
 */

import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Chapter {
    id: string;
    name: string;
    type: 'fraternity' | 'sorority';
    universityId: string;
}

export interface University {
    id: string;
    name: string;
    shortName: string;
    emailDomain?: string;
}

// Simple in-memory cache
const cache: {
    universities: University[] | null;
    chapters: Record<string, Chapter[]>;
    timestamp: number;
} = {
    universities: null,
    chapters: {},
    timestamp: 0,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
    return Date.now() - cache.timestamp < CACHE_TTL;
}

/**
 * Clear the cache (call after admin updates)
 */
export function clearChapterCache(): void {
    cache.universities = null;
    cache.chapters = {};
    cache.timestamp = 0;
}

/**
 * Fetch all universities
 */
export async function fetchUniversities(): Promise<University[]> {
    if (cache.universities && isCacheValid()) {
        return cache.universities;
    }

    try {
        const snapshot = await getDocs(collection(db, 'universities'));
        const universities: University[] = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            shortName: doc.data().shortName || doc.id,
            emailDomain: doc.data().emailDomain,
        }));

        cache.universities = universities;
        cache.timestamp = Date.now();
        return universities;
    } catch (error) {
        console.error('Failed to fetch universities:', error);
        // Return hardcoded fallback for KSU if Firestore fails
        return [{
            id: 'ksu',
            name: 'Kansas State University',
            shortName: 'K-State',
            emailDomain: 'ksu.edu',
        }];
    }
}

/**
 * Fetch chapters for a specific university
 */
export async function fetchChaptersForUniversity(universityId: string): Promise<Chapter[]> {
    if (cache.chapters[universityId] && isCacheValid()) {
        return cache.chapters[universityId];
    }

    try {
        const chaptersRef = collection(db, 'universities', universityId, 'chapters');
        const q = query(chaptersRef, orderBy('name'));
        const snapshot = await getDocs(q);

        const chapters: Chapter[] = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            type: doc.data().type || 'fraternity',
            universityId,
        }));

        cache.chapters[universityId] = chapters;
        cache.timestamp = Date.now();
        return chapters;
    } catch (error) {
        console.error(`Failed to fetch chapters for ${universityId}:`, error);
        return [];
    }
}

/**
 * Get a specific chapter by ID
 */
export async function fetchChapterById(universityId: string, chapterId: string): Promise<Chapter | null> {
    // Try cache first
    if (cache.chapters[universityId] && isCacheValid()) {
        const cached = cache.chapters[universityId].find(c => c.id === chapterId);
        if (cached) return cached;
    }

    try {
        const chapterDoc = await getDoc(doc(db, 'universities', universityId, 'chapters', chapterId));

        if (!chapterDoc.exists()) {
            return null;
        }

        return {
            id: chapterDoc.id,
            name: chapterDoc.data().name || 'Unknown',
            type: chapterDoc.data().type || 'fraternity',
            universityId,
        };
    } catch (error) {
        console.error(`Failed to fetch chapter ${chapterId}:`, error);
        return null;
    }
}

/**
 * Get chapter name from ID (convenience function)
 * Extracts university ID from chapter ID prefix
 */
export async function getChapterName(chapterId: string): Promise<string> {
    // Extract university from chapter ID prefix (e.g., ksu-alpha-chi-omega -> ksu)
    const universityId = chapterId.split('-')[0];

    const chapter = await fetchChapterById(universityId, chapterId);
    return chapter?.name || 'Unknown Chapter';
}

/**
 * Get university ID from chapter ID prefix
 */
export function getUniversityIdFromChapterId(chapterId: string): string {
    return chapterId.split('-')[0] || 'ksu';
}
