import { Timestamp } from 'firebase/firestore';

/**
 * University model
 *
 * Represents a university that has chapters registered in the system.
 * Each university has a unique admin code for chapter admin self-registration.
 * Stored in collection: universities
 */
export interface University {
    /** Unique identifier */
    id: string;

    /** Full university name (e.g., "Kansas State University") */
    name: string;

    /** Short name or abbreviation (e.g., "K-State", "KSU") */
    shortName: string;

    /** Email domain for .edu validation (e.g., "ksu.edu", "k-state.edu") */
    emailDomains: string[];

    /** Admin code for chapter admin self-registration */
    adminCode: string;

    /** When the admin code was last updated/rotated */
    adminCodeUpdatedAt?: Timestamp;

    /** State where the university is located */
    state: string;

    /** City where the university is located */
    city: string;

    /** Whether the university is active in the system */
    isActive: boolean;

    /** Timestamp when university was added */
    createdAt: Timestamp;

    /** Timestamp when university was last updated */
    updatedAt: Timestamp;
}

/**
 * Firestore document type for University (without id field)
 */
export type UniversityDocument = Omit<University, 'id'>;
