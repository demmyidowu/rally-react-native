# Rally Migration Summary - Swift → React Native

**Date**: 2026-01-11  
**Analyst**: Claude Code  
**Full Analysis**: See `SWIFT_APP_ANALYSIS.md`

---

## Quick Overview

The Rally app (formerly DD Ride) is a **designated driver management system** for K-State fraternities and sororities. This document summarizes the migration from Swift/iOS to React Native.

---

## App Statistics

- **87 Swift files** to migrate
- **~15,000 lines** of Swift code
- **8 data models** (direct translation to TypeScript)
- **14 service classes** (preserve business logic)
- **60+ UI components** (complete rewrite)
- **5 Cloud Functions** (reuse as-is - already TypeScript!)

---

## CRITICAL Business Logic to Preserve

### 1. Queue Priority Algorithm
```
Emergency: priority = 9999
Same-chapter: priority = (classYear × 10) + (waitMinutes × 0.5)
Cross-chapter: priority = waitMinutes × 0.5
```

**Location**: `RideQueueService.calculatePriority()`

### 2. DD Assignment Algorithm
```
Assign to DD with SHORTEST WAIT TIME (not lowest ride count!)
Wait time = number of active rides × 15 minutes
```

**Location**: `DDAssignmentService.findBestDD()`

### 3. Location Capture Rules
- **One-time only** when rider requests ride
- **One-time only** when DD marks "en route"
- **NO background tracking** (battery efficient)

**Location**: `LocationService.captureLocationOnce()`

### 4. SMS Triggers
- **Ride assigned** → SMS to DD: "New ride: {name} at {address}"
- **DD en route** → SMS to rider: "{DD} in {car} is {ETA} mins away"

**Location**: Cloud Functions `notifyDDNewRide`, `notifyRiderEnRoute`

### 5. Queue Position
- **Overall position** across ALL DDs (not per-DD!)

**Location**: `RideQueueService.getOverallQueuePosition()`

---

## Architecture

### Swift (Current)
```
MVVM Pattern
├── Models: Codable structs
├── Services: ObservableObject classes
├── ViewModels: @Published properties
└── Views: SwiftUI + Combine
```

### React Native (Target)
```
Redux Pattern
├── Models: TypeScript interfaces
├── Services: Async/await functions
├── Redux Slices: State management
└── Screens: React Native + Hooks
```

---

## Data Models (8 Models)

All models translate directly to TypeScript interfaces:

1. **User** - Name, email (@ksu.edu), phone, chapter, role, classYear
2. **Ride** - Rider, DD, location, status, priority, timestamps
3. **Event** - Name, date, status, allowed chapters
4. **DDAssignment** - DD info, active status, ride count
5. **Chapter** - Name, university, invite code
6. **AdminAlert** - Alert type, message, read status
7. **YearTransitionLog** - Audit trail for Aug 1 transitions
8. **AdminTransitionLog** - Audit trail for admin role transfers

---

## Core Services (14 Services)

### High Priority (CRITICAL - Preserve Algorithms)
1. **RideQueueService** (419 lines) - Priority calculation, queue position
2. **DDAssignmentService** (485 lines) - DD assignment, activity monitoring
3. **LocationService** (391 lines) - One-time location capture
4. **EmergencyService** (235 lines) - Emergency handling (priority 9999)

### Medium Priority (Firebase Integration)
5. **AuthService** (252 lines) - Firebase Auth, KSU email validation
6. **FirestoreService** (734 lines) - Firestore CRUD, real-time listeners
7. **ETAService** (259 lines) - ETA calculation (MapKit → Google Maps)
8. **NotificationService** - Push notifications (FCM)

### Standard Priority
9. **RideRequestService** - Ride creation flow
10. **YearTransitionService** - Annual class year transition
11. **DDMonitoringService** - DD activity alerts
12. **AdminTransitionService** - Admin role transfer
13. **FirebaseService** - Firebase initialization
14. **ErrorHandler** - Error handling

---

## UI Components

### Screens (15+ screens)
- **Auth**: Login, SignUp, EmailVerification, ForgotPassword
- **Admin**: Dashboard, Alerts, MemberManagement, EventCreation, DDProfile, RideDetail
- **DD**: Dashboard, PhotoUpload
- **Rider**: Dashboard, RideRequest, ActiveRide
- **Profile**: User profile

### Shared Components (15 components)
- Buttons: PrimaryButton, CustomButton
- States: LoadingView, ErrorView, EmptyStateView
- Cards: RideCard, InfoCard, ActionCard, StatCard
- Rows: LocationRow, MemberRow
- Badges: StatusBadge, DDStatusBadge, RoleBadge
- Other: ErrorBanner, OfflineIndicator

---

## Firebase Backend (Reuse As-Is!)

### Cloud Functions (Already TypeScript)
✓ **autoAssignRide** - Assigns ride to DD with shortest wait time  
✓ **notifyDDNewRide** - SMS to DD when ride assigned  
✓ **notifyRiderEnRoute** - SMS to rider when DD en route  
✓ **monitorDDActivity** - DD activity monitoring  
✓ **yearTransition** - Aug 1 class year transition (scheduled)  

**No changes needed!** All Cloud Functions are already in TypeScript.

### Firestore Rules
✓ Keep as-is

### Firestore Indexes
✓ Keep as-is

---

## Technology Stack Migration

| Component | Swift/iOS | React Native |
|-----------|-----------|--------------|
| **Framework** | SwiftUI | React Native + Expo |
| **State** | Combine | Redux Toolkit |
| **Navigation** | NavigationStack | React Navigation |
| **Backend** | Firebase iOS SDK | Firebase JS SDK |
| **Database** | Firestore (same) | Firestore (same) |
| **Auth** | Firebase Auth (same) | Firebase Auth (same) |
| **Location** | Core Location | expo-location |
| **Maps/ETA** | MapKit | Google Maps API |
| **Notifications** | FCM | expo-notifications |
| **SMS** | Twilio (Cloud Functions) | Twilio (same) |
| **Language** | Swift 5.9 | TypeScript 5.0 |
| **iOS Version** | iOS 17+ | iOS 13+ |
| **Android** | N/A | Android 6+ |

---

## Dependencies

### React Native (Target)
```json
{
  "expo": "~50.x",
  "react-native": "0.73.x",
  "@react-navigation/native": "^6.x",
  "@reduxjs/toolkit": "^2.x",
  "firebase": "^10.x",
  "expo-location": "~16.x",
  "expo-notifications": "~0.27.x"
}
```

### Cloud Functions (Existing - No Change)
```json
{
  "firebase-admin": "^12.0.0",
  "firebase-functions": "^5.0.0",
  "twilio": "^4.19.0"
}
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Set up React Native project
- Configure Firebase
- Implement data models
- Set up navigation

### Phase 2: Core Services (Week 3-4)
- RideQueueService (CRITICAL)
- DDAssignmentService (CRITICAL)
- LocationService
- AuthService, FirestoreService

### Phase 3: UI (Week 5-6)
- Shared components
- Authentication screens
- Rider, DD, Admin dashboards

### Phase 4: Testing (Week 7-8)
- Unit tests for algorithms
- Integration tests
- Android-specific testing

### Phase 5: Deploy (Week 9-10)
- Beta testing
- App Store submissions
- Production launch

---

## High-Risk Areas

1. **Priority Algorithm Accuracy** (CRITICAL)
   - Must preserve exact formula
   - Port Swift tests to TypeScript
   
2. **DD Assignment Logic** (CRITICAL)
   - Shortest wait time, not ride count
   - Extensive validation needed

3. **Location Services** (HIGH)
   - Different APIs (Core Location → expo-location)
   - One-time capture behavior
   - Test on both platforms

4. **Real-Time Updates** (MEDIUM)
   - Combine → Redux
   - Firestore listeners

5. **Android Compatibility** (MEDIUM)
   - Different permission model
   - Different lifecycle
   - Battery optimization

---

## File Migration Map (Key Files)

### Models (Direct Translation)
```
User.swift → models/User.ts
Ride.swift → models/Ride.ts
Event.swift → models/Event.ts
DDAssignment.swift → models/DDAssignment.ts
Chapter.swift → models/Chapter.ts
AdminAlert.swift → models/AdminAlert.ts
```

### Services (Preserve Logic)
```
RideQueueService.swift → services/rideQueueService.ts
DDAssignmentService.swift → services/ddAssignmentService.ts
LocationService.swift → services/locationService.ts (platform-specific)
AuthService.swift → services/authService.ts
FirestoreService.swift → services/firestoreService.ts
EmergencyService.swift → services/emergencyService.ts
ETAService.swift → services/etaService.ts (MapKit → Google Maps)
```

### Views (Complete Rewrite)
```
LoginView.swift → screens/Auth/LoginScreen.tsx
AdminDashboardView.swift → screens/Admin/AdminDashboardScreen.tsx
DDDashboardView.swift → screens/DD/DDDashboardScreen.tsx
RiderDashboardView.swift → screens/Rider/RiderDashboardScreen.tsx
```

---

## Testing Strategy

### Unit Tests (High Priority)
- Priority algorithm validation
- DD assignment algorithm
- Location capture logic
- Auth flows

### Integration Tests (Medium Priority)
- Full ride request flow
- DD assignment flow
- Emergency ride flow

### E2E Tests (Low Priority)
- Complete user journeys
- Cross-platform testing

---

## Key Design Decisions to Preserve

1. **Battery Efficiency** - One-time location capture only
2. **Fairness** - Priority balances class year + wait time
3. **Reliability** - Offline support, error handling
4. **Safety** - Emergency button with admin alerts
5. **Audit Trail** - Complete logs for liability

---

## Success Criteria

### Functional
- [ ] All 8 data models migrated
- [ ] All 14 services migrated with preserved logic
- [ ] Priority algorithm matches Swift exactly
- [ ] DD assignment algorithm matches Swift exactly
- [ ] Location capture works one-time only
- [ ] SMS triggers fire correctly
- [ ] Real-time updates work
- [ ] Emergency flow works

### Performance
- [ ] App launch < 3 seconds
- [ ] Location capture < 5 seconds
- [ ] 60 FPS navigation
- [ ] Minimal battery impact

### Quality
- [ ] 80%+ test coverage on algorithms
- [ ] No critical bugs
- [ ] Works on iOS and Android
- [ ] Passes beta testing

---

## Next Steps

1. Review this analysis with stakeholders
2. Set up React Native project skeleton
3. Configure Firebase (same project)
4. Implement data models
5. Start with RideQueueService (highest priority)

---

## Resources

- **Full Analysis**: `SWIFT_APP_ANALYSIS.md` (comprehensive 20-section document)
- **Swift Codebase**: `/Users/didowu/DDRideApp/`
- **React Native Project**: `/Users/didowu/Desktop/Coding/rally-react-native/`
- **Firebase Console**: https://console.firebase.google.com
- **Cloud Functions**: `/Users/didowu/DDRideApp/functions/` (reuse as-is)

---

**End of Summary**

For detailed information on any topic, see the full analysis document.
