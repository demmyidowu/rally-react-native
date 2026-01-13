/**
 * Firebase Configuration
 *
 * Initializes Firebase services for Rally app:
 * - Authentication
 * - Firestore Database
 * - Cloud Functions
 *
 * In development mode (__DEV__), connects to local Firebase emulators.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  Auth,
  initializeAuth,
  getAuth,
} from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists in RN but not in web types
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from GoogleService-Info.plist
const firebaseConfig = {
  apiKey: 'AIzaSyDm0jdaY_ykCj6ejqzjQkuI0uxLg5dnTdg',
  authDomain: 'ddride-didowu.firebaseapp.com',
  projectId: 'ddride-didowu',
  storageBucket: 'ddride-didowu.firebasestorage.app',
  messagingSenderId: '115001258662',
  appId: '1:115001258662:ios:f750a131088cfbe7883a67',
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase initialized');
} else {
  app = getApps()[0];
}

// Initialize Firebase services with AsyncStorage persistence for React Native
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized, get the existing instance
  auth = getAuth(app);
}

export { auth };
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

// Configure emulators in development
if (__DEV__) {
  console.log('🔧 Configuring Firebase Emulators...');

  // Only connect to emulators once
  try {
    // Firestore emulator (localhost:8080)
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('   ✅ Firestore: localhost:8080');
  } catch (error) {
    // Already connected
  }

  try {
    // Auth emulator (localhost:9099)
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('   ✅ Auth: localhost:9099');
  } catch (error) {
    // Already connected
  }

  try {
    // Functions emulator (localhost:5001)
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('   ✅ Functions: localhost:5001');
  } catch (error) {
    // Already connected
  }

  console.log('✅ Firebase Emulators configured');
}

export default app;
