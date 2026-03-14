# Rally - React Native Edition

## Project Overview
Cross-platform mobile app for managing designated drivers for K-State fraternities and sororities. Migrated from Swift/iOS to React Native with Expo for faster development and Android support.

## Tech Stack
- **Frontend**: React Native, Expo, TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation v6
- **Backend**: Firebase (Firestore, Cloud Functions, Authentication)
- **Location**: expo-location
- **Push Notifications**: expo-notifications
- **Maps**: Google Maps API (for ETA)

## Project Structure
```
rally-react-native/
├── .claude/                    # Claude Code configuration
│   ├── agents/                # Subagents (copied from Swift project + new RN ones)
│   ├── skills/                # Skills (existing + new RN skills)
│   └── commands/              
├── src/
│   ├── components/            # Reusable UI components
│   ├── screens/               # App screens
│   │   ├── Admin/
│   │   ├── DD/
│   │   ├── Rider/
│   │   └── Auth/
│   ├── navigation/            # React Navigation setup
│   ├── services/              # Business logic & Firebase
│   │   ├── authService.ts
│   │   ├── firestoreService.ts
│   │   ├── rideQueueService.ts
│   │   ├── ddAssignmentService.ts
│   │   ├── locationService.ts
│   │   └── notificationService.ts
│   ├── store/                 # Redux store
│   │   ├── slices/
│   │   └── store.ts
│   ├── models/                # TypeScript interfaces
│   │   ├── User.ts
│   │   ├── Ride.ts
│   │   ├── Event.ts
│   │   └── DDAssignment.ts
│   ├── utils/                 # Utilities
│   ├── types/                 # TypeScript types
│   └── constants/             # App constants
├── __tests__/                 # Tests
├── assets/                    # Images, fonts
├── app.json                   # Expo config
├── App.tsx                    # App entry point
├── firebase.json              # Firebase config (copied from Swift project)
├── functions/                 # Cloud Functions (reuse from Swift project)
└── package.json
```

## Key Features (Same as Swift version)
1. **Admin Dashboard**: DD assignment, event management, member management
2. **Ride Request System**: Smart queue with priority algorithm
3. **Push Notifications**: Firebase Cloud Messaging for ride updates
4. **Automatic Year Transitions**: Scheduled task on Aug 1
5. **KSU Email Verification**: Enforce @ksu.edu domain
6. **Emergency Button**: Immediate priority with admin alerts
7. **DD Activity Monitoring**: Track inactive toggles
8. **Ride Logs**: Complete audit trail

## Critical Business Rules

### Queue Priority Algorithm (UNCHANGED)
```typescript
priority = (classYear × 10) + (waitMinutes × 0.5)
emergency priority = 9999
```

### DD Assignment Algorithm (UNCHANGED)
Assign to DD with **shortest wait time**:
- If DD has no active rides → 0 minutes wait
- If DD has rides → sum estimated time for all queued/active rides
- Assign to DD with minimum wait time

### Location Capture (UNCHANGED)
- **One-time only** when rider requests ride
- **One-time only** when DD marks "en route"
- **No background tracking**

## Migration Notes

### What Changed from Swift
- UI: SwiftUI → React Native components
- State: Combine → Redux Toolkit
- Navigation: NavigationStack → React Navigation
- Location: Core Location → expo-location
- Styling: SwiftUI → StyleSheet/styled-components

### What Stayed the Same
- Firebase schema (Firestore structure)
- Cloud Functions (already TypeScript)
- Business logic algorithms
- Data models (converted to TypeScript interfaces)
- Backend services

### Dependencies
```json
{
  "dependencies": {
    "expo": "~50.x",
    "react": "18.x",
    "react-native": "0.73.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/stack": "^6.x",
    "@reduxjs/toolkit": "^2.x",
    "react-redux": "^9.x",
    "firebase": "^10.x",
    "expo-location": "~16.x",
    "expo-notifications": "~0.27.x",
    "expo-image-picker": "~14.x"
  }
}
```

## Development Workflow

### Using Subagents
Available subagents:
- `react-native-developer`: UI components and screens
- `expo-engineer`: Platform-specific configuration
- `firebase-backend-engineer`: Backend logic (reused from Swift)
- `github-specialist`: Git operations and commits
- `test-automator`: Testing
- `codebase-analyzer`: Code analysis
- Plus all Swift subagents that are still relevant

### Running the App
```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run tests
npm test

# Type checking
npm run tsc
```

### Firebase Emulators
```bash
# Start emulators
firebase emulators:start

# In another terminal, connect app to emulators
# (Already configured in src/config/firebase.ts)
```

## Git Workflow

Managed by `github-specialist` subagent:
- Commits after each completed feature
- Conventional commit messages
- Pushes every 2-4 commits
- Clean git history

## Important Files

### Firebase Config (src/config/firebase.ts)
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  // From Firebase Console
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (__DEV__) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Testing Strategy
- **Unit Tests**: Jest for business logic
- **Component Tests**: React Native Testing Library
- **Integration Tests**: Full flow testing
- **E2E Tests**: Detox (if needed later)

## Deployment
- **Development**: Expo Go app
- **Beta**: EAS Build → TestFlight (iOS) & Google Play Internal Testing (Android)
- **Production**: App Store & Google Play Store

## Links
- Swift codebase: ~/DDRideApp (reference for migration)
- Firebase Console: https://console.firebase.google.com
- Expo Dashboard: https://expo.dev

## Next Steps
1. Complete migration from Swift
2. Test all features on iOS and Android
3. Beta test with K-State SAE
4. Launch on both app stores
