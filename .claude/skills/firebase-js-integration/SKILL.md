---
name: firebase-js-integration
description: Firebase JavaScript SDK integration patterns for React Native. Use when implementing Firebase Authentication, Firestore database operations, Cloud Functions calls, or real-time listeners.
---

# Firebase JS Integration for React Native

## When to Use This Skill
Implementing Firebase services in React Native apps:
- Authentication (sign up, sign in, email verification)
- Firestore queries and real-time listeners
- Cloud Functions calls
- Firebase configuration and initialization
- Security rules integration

## Firebase Initialization

### Configuration Setup
```typescript
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Environment Variables (.env)
```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123
```

## Firebase Authentication

### Auth Service Pattern
```typescript
// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export class AuthService {
  // Sign up with email/password
  static async signUp(email: string, password: string): Promise<User> {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Send verification email
      await sendEmailVerification(userCredential.user);

      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign in with email/password
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Check if email is verified
  static async checkEmailVerified(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    await user.reload();
    return user.emailVerified;
  }

  // Send password reset email
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Get auth token
  static async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  // Error handling
  private static handleAuthError(error: any): Error {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('Email already in use');
      case 'auth/invalid-email':
        return new Error('Invalid email address');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters');
      case 'auth/user-not-found':
        return new Error('No account found with this email');
      case 'auth/wrong-password':
        return new Error('Incorrect password');
      case 'auth/too-many-requests':
        return new Error('Too many attempts. Please try again later');
      default:
        return new Error(error.message || 'Authentication error');
    }
  }
}
```

### Auth State Listener Hook
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return { user, loading };
};
```

## Firestore Database

### Firestore Service Pattern
```typescript
// src/services/firestoreService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirestoreService {
  // Create or update document
  static async setDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error setting document:', error);
      throw error;
    }
  }

  // Get single document
  static async getDocument<T>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  // Update document
  static async updateDocument(
    collectionName: string,
    docId: string,
    data: Partial<DocumentData>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  // Delete document
  static async deleteDocument(
    collectionName: string,
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Query documents
  static async queryDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error('Error querying documents:', error);
      throw error;
    }
  }

  // Real-time listener for single document
  static subscribeToDocument<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void
  ): () => void {
    const docRef = doc(db, collectionName, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() } as T);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in document subscription:', error);
      }
    );

    return unsubscribe;
  }

  // Real-time listener for query
  static subscribeToQuery<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: T[]) => void
  ): () => void {
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        callback(data);
      },
      (error) => {
        console.error('Error in query subscription:', error);
      }
    );

    return unsubscribe;
  }
}
```

### Example: User Service
```typescript
// src/services/userService.ts
import { FirestoreService } from './firestoreService';
import { where, orderBy } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'dd' | 'rider';
  organizationId: string;
  classYear: number;
  createdAt: any;
  updatedAt: any;
}

export class UserService {
  private static COLLECTION = 'users';

  static async createUser(userId: string, userData: Omit<User, 'id'>): Promise<void> {
    await FirestoreService.setDocument(this.COLLECTION, userId, userData);
  }

  static async getUser(userId: string): Promise<User | null> {
    return await FirestoreService.getDocument<User>(this.COLLECTION, userId);
  }

  static async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await FirestoreService.updateDocument(this.COLLECTION, userId, data);
  }

  static async getUsersByOrganization(orgId: string): Promise<User[]> {
    return await FirestoreService.queryDocuments<User>(this.COLLECTION, [
      where('organizationId', '==', orgId),
      orderBy('lastName', 'asc'),
    ]);
  }

  static subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    return FirestoreService.subscribeToDocument<User>(
      this.COLLECTION,
      userId,
      callback
    );
  }
}
```

### Firestore Hook Pattern
```typescript
// src/hooks/useFirestoreDocument.ts
import { useState, useEffect } from 'react';
import { FirestoreService } from '../services/firestoreService';

export const useFirestoreDocument = <T>(
  collectionName: string,
  docId: string | null
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = FirestoreService.subscribeToDocument<T>(
      collectionName,
      docId,
      (document) => {
        setData(document);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading, error };
};
```

## Cloud Functions

### Functions Service Pattern
```typescript
// src/services/cloudFunctionsService.ts
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '../config/firebase';

export class CloudFunctionsService {
  // Generic function call
  static async callFunction<RequestData, ResponseData>(
    functionName: string,
    data: RequestData
  ): Promise<ResponseData> {
    try {
      const callable = httpsCallable<RequestData, ResponseData>(
        functions,
        functionName
      );
      const result: HttpsCallableResult<ResponseData> = await callable(data);
      return result.data;
    } catch (error: any) {
      console.error(`Error calling function ${functionName}:`, error);
      throw new Error(error.message || 'Cloud function error');
    }
  }

  // Example: Assign DD to ride
  static async assignDDToRide(rideId: string): Promise<{ success: boolean; ddId: string }> {
    return await this.callFunction('assignDDToRide', { rideId });
  }

  // Example: Send SMS notification
  static async sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean }> {
    return await this.callFunction('sendSMS', { phoneNumber, message });
  }

  // Example: Create event
  static async createEvent(eventData: any): Promise<{ eventId: string }> {
    return await this.callFunction('createEvent', eventData);
  }
}
```

## Common Patterns

### Batch Operations
```typescript
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

async function batchUpdateRides(rideIds: string[], status: string) {
  const batch = writeBatch(db);

  rideIds.forEach((rideId) => {
    const rideRef = doc(db, 'rides', rideId);
    batch.update(rideRef, { status });
  });

  await batch.commit();
}
```

### Transactions
```typescript
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

async function transferPoints(fromUserId: string, toUserId: string, points: number) {
  await runTransaction(db, async (transaction) => {
    const fromRef = doc(db, 'users', fromUserId);
    const toRef = doc(db, 'users', toUserId);

    const fromDoc = await transaction.get(fromRef);
    const toDoc = await transaction.get(toRef);

    if (!fromDoc.exists() || !toDoc.exists()) {
      throw new Error('User not found');
    }

    const fromPoints = fromDoc.data().points;
    if (fromPoints < points) {
      throw new Error('Insufficient points');
    }

    transaction.update(fromRef, { points: fromPoints - points });
    transaction.update(toRef, { points: toDoc.data().points + points });
  });
}
```

## TypeScript Types

### Firestore Timestamp Handling
```typescript
import { Timestamp } from 'firebase/firestore';

export interface RideData {
  id: string;
  riderId: string;
  pickupLocation: string;
  status: 'pending' | 'assigned' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Timestamp to Date for display
function formatTimestamp(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString();
}

// Create Timestamp from Date
const now = Timestamp.now();
const fromDate = Timestamp.fromDate(new Date());
```

## Common Pitfalls to Avoid

### 1. Not Cleaning Up Listeners
```typescript
// BAD - Memory leak
useEffect(() => {
  onSnapshot(docRef, (snapshot) => {
    // Handle snapshot
  });
}, []);

// GOOD - Cleanup subscription
useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    // Handle snapshot
  });
  return () => unsubscribe();
}, []);
```

### 2. Missing Error Handling
```typescript
// BAD
const user = await getDoc(userRef);

// GOOD
try {
  const user = await getDoc(userRef);
  if (!user.exists()) {
    throw new Error('User not found');
  }
} catch (error) {
  console.error('Error fetching user:', error);
  // Handle error appropriately
}
```

### 3. Overfetching Data
```typescript
// BAD - Fetches all rides
const allRides = await getDocs(collection(db, 'rides'));

// GOOD - Use query constraints
const activeRides = await getDocs(
  query(
    collection(db, 'rides'),
    where('status', '==', 'active'),
    limit(20)
  )
);
```

### 4. Not Using Indexes
```typescript
// Compound queries require indexes
// Create index in Firebase Console or firestore.indexes.json
const rides = await getDocs(
  query(
    collection(db, 'rides'),
    where('organizationId', '==', orgId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
);
```

### 5. Storing Sensitive Data
```typescript
// BAD - Storing sensitive data in Firestore
await setDoc(doc(db, 'users', userId), {
  password: 'plaintext123', // NEVER do this
  creditCard: '1234-5678-9012-3456', // NEVER do this
});

// GOOD - Use Firebase Auth and secure backend functions
// Passwords handled by Firebase Auth
// Payment info processed server-side via Cloud Functions
```

## Security Rules Integration

### Example Firestore Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
    }

    // Rides collection
    match /rides/{rideId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() &&
        (isOwner(resource.data.riderId) || isOwner(resource.data.ddId));
    }
  }
}
```

## Best Practices

1. **Always cleanup listeners** to prevent memory leaks
2. **Use TypeScript interfaces** for Firestore documents
3. **Handle Firestore errors** with try-catch
4. **Use query constraints** to minimize data transfer
5. **Create indexes** for compound queries
6. **Validate data** on both client and server
7. **Use Cloud Functions** for sensitive operations
8. **Test with emulators** during development
9. **Implement offline persistence** for better UX
10. **Use batch operations** for multiple writes

## Testing with Emulators

```typescript
// Connect to emulators in test environment
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

if (process.env.NODE_ENV === 'test') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## References

- Firebase JS SDK: https://firebase.google.com/docs/web/setup
- Firestore: https://firebase.google.com/docs/firestore
- Firebase Auth: https://firebase.google.com/docs/auth
- Cloud Functions: https://firebase.google.com/docs/functions
