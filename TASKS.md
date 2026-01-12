# RallyRide - React Native Migration Tasks

## Project Status
**Started:** January 11, 2026
**Current Phase:** Core Implementation
**Target:** Production-ready cross-platform app

---

## ✅ Completed Tasks

### Phase 1: Analysis & Planning
- [x] Analyze complete Swift codebase (87 files, 8 models, 14 services)
- [x] Create migration documentation (SWIFT_APP_ANALYSIS.md, MIGRATION_SUMMARY.md, QUICK_REFERENCE.md)
- [x] Document critical business logic (queue algorithm, DD assignment, location capture)
- [x] Create React Native skills (5 skills created in .claude/skills/)
- [x] Create specialized subagents (4 agents created in .claude/agents/)

### Phase 2: Project Setup
- [x] Initialize Expo project with TypeScript
- [x] Install dependencies (Firebase, React Navigation, Redux Toolkit, expo-location, expo-notifications)
- [x] Configure TypeScript with strict mode and path aliases
- [x] Configure app.json with RallyRide branding and permissions
- [x] Create folder structure (src/components, src/screens, src/services, src/store, etc.)
- [x] Set up Firebase configuration (src/config/firebase.ts)
- [x] Configure Firebase emulators for development

---

## 🚧 In Progress Tasks

### Phase 3: Core Infrastructure
- [ ] **Data Models** (Agent: general-purpose)
  - [ ] User.ts
  - [ ] Ride.ts
  - [ ] DDAssignment.ts
  - [ ] Event.ts
  - [ ] Chapter.ts
  - [ ] AdminAlert.ts
  - [ ] YearTransitionLog.ts
  - [ ] AdminTransitionLog.ts
  - [ ] index.ts (export all models)

- [ ] **Firebase Services** (Agent: firebase-backend-engineer)
  - [ ] firestoreService.ts (CRUD operations, real-time listeners)
  - [ ] authService.ts (basic setup)

- [ ] **Business Logic Services** (Agent: business-logic-specialist)
  - [ ] rideQueueService.ts (priority algorithm)
  - [ ] ddAssignmentService.ts (shortest wait time algorithm)
  - [ ] etaService.ts (Google Maps integration)

- [ ] **Authentication** (Agent: auth-security-specialist)
  - [ ] Enhance authService.ts with KSU validation
  - [ ] Email verification flow
  - [ ] User profile creation

- [ ] **Location Services** (Agent: location-services-expert)
  - [ ] locationService.ts (one-time capture)
  - [ ] Permission management (iOS & Android)
  - [ ] Geocoding and reverse geocoding

- [ ] **State Management** (Agent: general-purpose)
  - [ ] store/store.ts (Redux configuration)
  - [ ] store/slices/authSlice.ts
  - [ ] store/slices/ridesSlice.ts
  - [ ] store/slices/eventsSlice.ts
  - [ ] store/slices/ddAssignmentsSlice.ts
  - [ ] store/hooks.ts (typed hooks)

- [ ] **Navigation** (Agent: general-purpose)
  - [ ] AppNavigator.tsx
  - [ ] AuthNavigator.tsx
  - [ ] MainNavigator.tsx
  - [ ] types.ts (navigation types)

- [ ] **Push Notifications** (Agent: general-purpose)
  - [ ] notificationService.ts
  - [ ] Permission handling
  - [ ] FCM token management
  - [ ] Notification handlers

---

## 📋 Pending Tasks

### Phase 4: UI Components & Screens
- [ ] **Shared Components**
  - [ ] Button component
  - [ ] Input component
  - [ ] Card component
  - [ ] Loading spinner
  - [ ] Error message
  - [ ] EmptyState component

- [ ] **Auth Screens**
  - [ ] LoginScreen.tsx
  - [ ] SignupScreen.tsx
  - [ ] EmailVerificationScreen.tsx
  - [ ] ForgotPasswordScreen.tsx

- [ ] **Admin Screens**
  - [ ] AdminDashboard.tsx
  - [ ] EventManagementScreen.tsx
  - [ ] DDManagementScreen.tsx
  - [ ] MemberManagementScreen.tsx
  - [ ] AdminAlertsScreen.tsx

- [ ] **DD Screens**
  - [ ] DDDashboard.tsx
  - [ ] ActiveRidesScreen.tsx
  - [ ] ToggleActiveScreen.tsx
  - [ ] RideDetailsScreen.tsx

- [ ] **Rider Screens**
  - [ ] RiderDashboard.tsx
  - [ ] RequestRideScreen.tsx
  - [ ] MyRidesScreen.tsx
  - [ ] QueueStatusScreen.tsx
  - [ ] EmergencyButtonScreen.tsx

### Phase 5: Testing
- [ ] **Unit Tests**
  - [ ] Queue priority algorithm tests
  - [ ] DD assignment algorithm tests
  - [ ] Auth service tests
  - [ ] Firestore service tests
  - [ ] Location service tests

- [ ] **Integration Tests**
  - [ ] Complete ride flow test
  - [ ] DD assignment flow test
  - [ ] Emergency ride flow test
  - [ ] Year transition test

- [ ] **Platform Testing**
  - [ ] iOS testing (simulator + device)
  - [ ] Android testing (emulator + device)
  - [ ] Permission handling on both platforms
  - [ ] Notification delivery on both platforms

### Phase 6: Cloud Functions (Reuse from Swift)
- [ ] Copy Cloud Functions from Swift project
- [ ] Update package.json dependencies if needed
- [ ] Test SMS notifications (Twilio)
- [ ] Test push notifications (FCM)
- [ ] Deploy to Firebase

### Phase 7: Deployment Preparation
- [ ] Configure EAS Build
- [ ] Set up environment variables
- [ ] Create app icons and splash screens
- [ ] Configure code signing (iOS)
- [ ] Configure app signing (Android)
- [ ] TestFlight setup (iOS)
- [ ] Internal testing track (Android)

### Phase 8: Documentation
- [ ] Update README.md
- [ ] Create API documentation
- [ ] Create deployment guide
- [ ] Create user guide
- [ ] Create admin guide

---

## 🔧 Manual Configuration Required

### Firebase
- [ ] **GoogleService-Info.plist** - Download from Firebase Console and place in project root
  - Path: `rally-react-native/GoogleService-Info.plist`
  - For iOS: Add to Xcode project

- [ ] **google-services.json** - Download from Firebase Console for Android
  - Path: `rally-react-native/google-services.json`
  - For Android build configuration

### Twilio
- [ ] **Twilio Account SID** - Add to Cloud Functions environment
  ```bash
  firebase functions:config:set twilio.account_sid="YOUR_ACCOUNT_SID"
  ```

- [ ] **Twilio Auth Token** - Add to Cloud Functions environment
  ```bash
  firebase functions:config:set twilio.auth_token="YOUR_AUTH_TOKEN"
  ```

- [ ] **Twilio Phone Number** - Add to Cloud Functions environment
  ```bash
  firebase functions:config:set twilio.phone_number="YOUR_TWILIO_PHONE"
  ```

### Google Maps
- [ ] **Google Maps API Key** - For ETA calculations
  - Enable Distance Matrix API in Google Cloud Console
  - Add key to environment variables
  - Add to app.json for iOS and Android

### EAS Build
- [ ] **Create Expo account** - https://expo.dev
- [ ] **Configure eas.json**
- [ ] **Set up credentials** - `eas credentials`

### App Store Connect (iOS)
- [ ] Create app listing
- [ ] Configure app information
- [ ] Add screenshots
- [ ] Submit for review

### Google Play Console (Android)
- [ ] Create app listing
- [ ] Configure store listing
- [ ] Add screenshots
- [ ] Submit for review

---

## 🎯 Critical Business Logic (MUST PRESERVE)

### Queue Priority Algorithm
```typescript
// Normal rides (same chapter)
priority = (classYear × 10) + (waitMinutes × 0.5)

// Cross-chapter rides
priority = waitMinutes × 0.5

// Emergency rides
priority = 9999
```

### DD Assignment Algorithm
- **Assign to DD with SHORTEST WAIT TIME** (not round-robin)
- Wait time = number of active rides × 15 minutes
- If DD has no active rides → 0 minutes wait

### Location Capture Rules
- **ONE-TIME ONLY** - No background tracking
- Rider: Capture when requesting ride
- DD: Capture when marking "en route"
- Battery efficient (high accuracy, single read)

### Queue Position
- Overall position across **ALL DDs** (not per-DD)
- Recalculate when rides are assigned/completed

### SMS Triggers
1. Ride assigned → SMS to DD with rider info
2. DD en route → SMS to rider with ETA

---

## 📊 Progress Summary

- **Total Tasks:** ~120
- **Completed:** 12 (10%)
- **In Progress:** 8 (7%)
- **Remaining:** 100 (83%)

**Estimated Completion:** ~4-6 weeks (with testing and deployment)

---

## 🚨 Blockers & Risks

### Current Blockers
- None

### Potential Risks
1. **Algorithm Accuracy** - Must validate queue and DD assignment match Swift exactly
2. **Location Services** - Different APIs between iOS (Core Location) and RN (expo-location)
3. **Android Compatibility** - Ensure all features work on Android
4. **Firebase Rules** - Need to copy security rules from Swift project
5. **Cloud Functions** - Need to redeploy and test SMS/push notifications

---

## 📝 Notes

- Using Expo SDK 54 with React Native 0.81.5
- Firebase v11 (modular SDK)
- TypeScript strict mode enabled
- All commits managed by github-specialist
- Regular pushes to: https://github.com/demmyidowu/rally-react-native

---

**Last Updated:** January 11, 2026 - 3:10 PM
