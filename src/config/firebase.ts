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
  getAuth,
  connectAuthEmulator,
  Auth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
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

// Initialize Firebase services
// Use initializeAuth with AsyncStorage persistence for React Native
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
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
