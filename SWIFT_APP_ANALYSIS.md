# Rally Swift iOS App - Complete Architecture Analysis

**Generated**: 2026-01-11  
**Purpose**: Migration mapping from Swift/iOS to React Native  
**Source**: `/Users/didowu/DDRideApp/`

---

## Executive Summary

The Rally (formerly DD Ride) app is a comprehensive designated driver management system built for K-State fraternities and sororities. The Swift iOS app contains **87 Swift files** organized into a clean MVVM architecture with Firebase backend integration.

### Key Statistics
- **Lines of Code**: ~15,000+ Swift code
- **Total Swift Files**: 87
- **Cloud Functions**: 5 TypeScript functions
- **Data Models**: 8 core models
- **Services**: 14 service classes
- **View Components**: 60+ views and components
- **Business Logic Complexity**: High (priority algorithms, DD assignment, location services)

---

## 1. Project Structure

```
DDRideApp/
├── ios/
│   ├── DDRide/                          # Main app code
│   │   ├── DDRideApp.swift             # App entry point with Firebase init
│   │   ├── App/                         # Root app structure
│   │   │   ├── ContentView.swift       # Auth state router
│   │   │   └── MainTabView.swift       # Main tab navigation
│   │   ├── Core/                        # Business logic layer
│   │   │   ├── Models/                 # 8 data models
│   │   │   ├── Services/               # 14 service classes
│   │   │   ├── Utilities/              # Helpers, extensions, constants
│   │   │   └── Errors/                 # Error handling system
│   │   ├── Features/                    # Feature modules (MVVM)
│   │   │   ├── Authentication/         # Login, signup, verification
│   │   │   ├── Admin/                  # Admin dashboard & management
│   │   │   ├── DD/                     # DD dashboard & controls
│   │   │   ├── Rider/                  # Rider dashboard & requests
│   │   │   └── Profile/                # User profile
│   │   ├── Shared/                      # Reusable components
│   │   │   ├── Components/             # 15 reusable UI components
│   │   │   ├── Modifiers/              # SwiftUI modifiers
│   │   │   └── Styles/                 # Theme & styling
│   │   ├── Resources/                   # Assets, config files
│   │   │   └── GoogleService-Info.plist
│   │   └── Tests/                       # Unit & integration tests
│   │       ├── Services/               # Service tests
│   │       ├── Integration/            # Full flow tests
│   │       └── TestHelpers/            # Test utilities
│   └── DDRide.xcodeproj                # Xcode project
├── functions/                            # Cloud Functions (TypeScript)
│   └── src/
│       ├── index.ts                    # Function exports
│       ├── rideAssignment.ts           # Auto-assign algorithm
│       ├── smsNotifications.ts         # Twilio SMS integration
│       ├── emergencyHandler.ts         # Emergency ride handling
│       ├── ddMonitoring.ts             # DD activity monitoring
│       ├── yearTransition.ts           # Annual class year transition
│       └── utils/                      # Shared utilities
├── firebase.json                        # Firebase config
├── firestore.rules                      # Security rules
└── firestore.indexes.json              # DB indexes
```

---

## 2. Data Models (8 Core Models)

All models conform to `Codable` and `Identifiable` for Firestore integration.

### 2.1 User Model
**File**: `/ios/DDRide/Core/Models/User.swift`

```swift
struct User: Codable, Identifiable, Equatable {
    let id: String                    // Firebase UID
    var name: String
    var email: String                 // Must be @ksu.edu
    var phoneNumber: String           // E.164 format: +15551234567
    var chapterId: String
    var role: UserRole                // .admin or .member
    var classYear: Int                // 4=senior, 3=junior, 2=sophomore, 1=freshman
    var isEmailVerified: Bool
    var fcmToken: String?             // For push notifications
    var createdAt: Date
    var updatedAt: Date
}

enum UserRole: String, Codable {
    case admin = "admin"
    case member = "member"
}
```

**React Native Mapping**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  chapterId: string;
  role: 'admin' | 'member';
  classYear: 1 | 2 | 3 | 4;
  isEmailVerified: boolean;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Ride Model
**File**: `/ios/DDRide/Core/Models/Ride.swift`

```swift
struct Ride: Codable, Identifiable, Equatable {
    let id: String
    var riderId: String
    var ddId: String?
    var chapterId: String
    var eventId: String
    var pickupLocation: GeoPoint       // Firebase GeoPoint
    var pickupAddress: String
    var dropoffAddress: String?
    var status: RideStatus             // .queued, .assigned, .enroute, .completed, .cancelled
    var priority: Double               // Algorithm: (classYear × 10) + (waitMinutes × 0.5) or 9999
    var isEmergency: Bool
    var estimatedWaitTime: Int?        // Minutes
    var queuePosition: Int?            // Overall position across all DDs
    var requestedAt: Date
    var assignedAt: Date?
    var enrouteAt: Date?
    var completedAt: Date?
    var cancelledAt: Date?
    var cancellationReason: String?
    var notes: String?
}

enum RideStatus: String, Codable {
    case queued = "queued"
    case assigned = "assigned"
    case enroute = "enroute"
    case completed = "completed"
    case cancelled = "cancelled"
}
```

**React Native Mapping**:
```typescript
interface Ride {
  id: string;
  riderId: string;
  ddId?: string;
  chapterId: string;
  eventId: string;
  pickupLocation: FirebaseFirestore.GeoPoint;
  pickupAddress: string;
  dropoffAddress?: string;
  status: 'queued' | 'assigned' | 'enroute' | 'completed' | 'cancelled';
  priority: number;
  isEmergency: boolean;
  estimatedWaitTime?: number;
  queuePosition?: number;
  requestedAt: Date;
  assignedAt?: Date;
  enrouteAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  notes?: string;
}
```

### 2.3 Event Model
**File**: `/ios/DDRide/Core/Models/Event.swift`

```swift
struct Event: Codable, Identifiable {
    let id: String
    var name: String
    var chapterId: String
    var date: Date
    var allowedChapterIds: [String]    // ["ALL"] or specific IDs
    var status: EventStatus
    var location: String?
    var description: String?
    var createdAt: Date
    var updatedAt: Date
    var createdBy: String              // User ID
}

enum EventStatus: String, Codable {
    case scheduled = "scheduled"
    case active = "active"
    case completed = "completed"
    case cancelled = "cancelled"
}
```

### 2.4 DDAssignment Model
**File**: `/ios/DDRide/Core/Models/DDAssignment.swift`

```swift
struct DDAssignment: Codable, Identifiable {
    var id: String                     // Same as userId
    var userId: String
    var eventId: String
    var photoURL: String?              // DD's photo
    var carDescription: String?        // e.g., "Blue Toyota Camry"
    var isActive: Bool
    var inactiveToggles: Int           // Track toggle frequency
    var lastActiveTimestamp: Date?
    var lastInactiveTimestamp: Date?
    var totalRidesCompleted: Int
    var createdAt: Date
    var updatedAt: Date
}
```

### 2.5 Chapter Model
**File**: `/ios/DDRide/Core/Models/Chapter.swift`

```swift
struct Chapter: Codable, Identifiable {
    let id: String
    var name: String                   // e.g., "Sigma Chi"
    var universityId: String           // e.g., "ksu"
    var inviteCode: String             // Unique join code
    var yearTransitionDate: Date       // Aug 1 annually
    var createdAt: Date
    var updatedAt: Date
}
```

### 2.6 AdminAlert Model
**File**: `/ios/DDRide/Core/Models/AdminAlert.swift`

```swift
struct AdminAlert: Codable, Identifiable {
    let id: String
    var chapterId: String
    var type: AlertType
    var message: String
    var ddId: String?
    var rideId: String?
    var isRead: Bool
    var createdAt: Date
}

enum AlertType: String, Codable {
    case ddInactiveToggle = "dd_inactive_toggle"     // >5 toggles in 30 min
    case ddProlongedInactive = "dd_prolonged_inactive" // >15 min inactive
    case emergencyRide = "emergency_ride"
    case systemError = "system_error"
}
```

### 2.7 YearTransitionLog Model
**File**: `/ios/DDRide/Core/Models/YearTransitionLog.swift`

```swift
struct YearTransitionLog: Codable, Identifiable {
    let id: String
    var chapterId: String
    var executionDate: Date
    var seniorsRemoved: Int
    var usersAdvanced: Int
    var status: TransitionStatus       // .success, .failed, .partial
    var errorMessage: String?
    var createdAt: Date
}
```

### 2.8 AdminTransitionLog Model
**File**: `/ios/DDRide/Core/Models/AdminTransitionLog.swift`

```swift
struct AdminTransitionLog: Codable, Identifiable {
    let id: String
    let chapterId: String
    let fromUserId: String
    let fromUserName: String
    let toUserId: String
    let toUserName: String
    let performedBy: String
    let timestamp: Date
}
```

---

## 3. Services (14 Core Services)

All services are `@MainActor` classes with `ObservableObject` for SwiftUI integration.

### 3.1 RideQueueService
**File**: `/ios/DDRide/Core/Services/RideQueueService.swift`  
**Lines**: 419 lines  
**Purpose**: Queue priority and position management

**Critical Algorithms**:
```swift
// Priority Calculation with Cross-Chapter Logic
func calculatePriority(
    classYear: Int,
    waitMinutes: Double,
    isEmergency: Bool,
    isSameChapter: Bool
) -> Double {
    // Emergency always highest
    if isEmergency {
        return 9999.0
    }
    
    // Cross-chapter: only wait time matters
    if !isSameChapter {
        return waitMinutes * 0.5
    }
    
    // Same chapter: class year + wait time
    return (Double(classYear) * 10.0) + (waitMinutes * 0.5)
}
```

**Key Methods**:
- `calculatePriority()` - Priority algorithm (CRITICAL)
- `isSameChapterRide()` - Determine same vs cross-chapter
- `getOverallQueuePosition()` - Position across ALL DDs (not per-DD)
- `getEstimatedWaitTime()` - Calculate wait time
- `observeQueueUpdates()` - Real-time Combine publisher
- `updateAllPriorities()` - Batch priority recalculation

**React Native Equivalent**:
- `src/services/rideQueueService.ts`
- Use Redux for state management instead of Combine
- Same business logic, different reactive framework

### 3.2 DDAssignmentService
**File**: `/ios/DDRide/Core/Services/DDAssignmentService.swift`  
**Lines**: 485 lines  
**Purpose**: DD assignment and activity monitoring

**Critical Algorithm**:
```swift
// Find DD with SHORTEST WAIT TIME (not lowest ride count!)
func findBestDD(for event: Event, rides: [Ride]) async throws -> DDAssignment? {
    let activeDDs = try await firestoreService.fetchActiveDDAssignments(eventId: event.id)
    
    // Calculate wait time for each DD
    let waitTimes = await calculateWaitTimes(for: activeDDs, with: rides)
    
    // Return DD with minimum wait time
    return activeDDs.min { dd1, dd2 in
        let wait1 = waitTimes[dd1.userId] ?? .infinity
        let wait2 = waitTimes[dd2.userId] ?? .infinity
        return wait1 < wait2
    }
}

// Wait time = number of active rides × 15 minutes
func calculateWaitTime(for ddAssignment: DDAssignment, with rides: [Ride]) async throws -> TimeInterval {
    let ddRides = rides.filter { $0.ddId == ddAssignment.userId }
    let activeRides = ddRides.filter {
        $0.status == .queued || $0.status == .assigned || $0.status == .enroute
    }
    
    if activeRides.isEmpty {
        return 0
    }
    
    // 15 minutes per ride
    return Double(activeRides.count) * 15.0 * 60.0
}
```

**Key Methods**:
- `findBestDD()` - Assign to DD with shortest wait (CRITICAL)
- `calculateWaitTime()` - Wait time calculation
- `assignRide()` - Atomic assignment operation
- `checkInactiveToggles()` - Monitor >5 toggles in 30 min
- `checkProlongedInactivity()` - Monitor >15 min inactive
- `toggleDDStatus()` - Active/inactive toggle with monitoring

**React Native Equivalent**:
- `src/services/ddAssignmentService.ts`
- Same algorithms, async/await already compatible

### 3.3 LocationService
**File**: `/ios/DDRide/Core/Services/LocationService.swift`  
**Lines**: 391 lines  
**Purpose**: Battery-efficient one-time location capture

**Key Design**:
```swift
// ONE-TIME CAPTURE ONLY (no background tracking)
func captureLocationOnce() async throws -> CLLocationCoordinate2D {
    // 1. Check permission
    guard isAuthorized else {
        throw LocationError.unauthorized
    }
    
    // 2. Request single location (not continuous)
    locationManager.requestLocation()
    
    // 3. 10-second timeout
    // 4. Stop immediately after capture
    // 5. Return coordinate
}

// Convert to address
func geocodeAddress(coordinate: CLLocationCoordinate2D) async throws -> String {
    let placemarks = try await geocoder.reverseGeocodeLocation(location)
    return formatAddress(from: placemarks.first)
}
```

**Two Location Captures Per Ride**:
1. Rider's pickup location (when requesting ride)
2. DD's location (when marking "en route" for ETA)

**React Native Equivalent**:
- `src/services/locationService.ts`
- Use `expo-location`
- `Location.getCurrentPositionAsync()` for one-time capture
- `Location.reverseGeocodeAsync()` for address

### 3.4 AuthService
**File**: `/ios/DDRide/Core/Services/AuthService.swift`  
**Lines**: 252 lines  
**Purpose**: Firebase Auth integration

**Key Methods**:
- `signIn()` - Email/password auth with KSU email check
- `signUp()` - Create account with KSU validation
- `formatPhoneNumber()` - Convert to E.164 format (+1XXXXXXXXXX)
- `sendPasswordReset()` - Password reset email
- `refreshEmailVerification()` - Check email verification status

**KSU Email Validation**:
```swift
guard email.lowercased().hasSuffix("@ksu.edu") else {
    throw AppError.emailNotKSU
}
```

**Phone Number Format**:
```swift
// Input: "(555) 123-4567"
// Output: "+15551234567"
func formatPhoneNumber(_ phone: String) -> String {
    var digits = phone.filter { $0.isNumber }
    if digits.first == "1" {
        return "+\(digits)"
    }
    return "+1\(digits)"
}
```

### 3.5 FirestoreService
**File**: `/ios/DDRide/Core/Services/FirestoreService.swift`  
**Lines**: 734 lines  
**Purpose**: Firestore CRUD operations with offline support

**Features**:
- Generic CRUD methods
- Query builder with filters
- Batch operations (max 500)
- Transaction support with retry
- Real-time listeners with Combine
- Offline persistence enabled
- Network status monitoring

**Key Methods**:
- `save<T>()` - Generic document save
- `fetch<T>()` - Generic document fetch
- `query<T>()` - Query builder
- `executeBatch()` - Batch writes
- `runTransaction()` - Transactions with retry
- `observeActiveRides()` - Real-time ride updates
- `observeActiveDDAssignments()` - Real-time DD updates

**React Native Equivalent**:
- `src/services/firestoreService.ts`
- Use Firebase JS SDK
- Similar structure, TypeScript generics

### 3.6 EmergencyService
**File**: `/ios/DDRide/Core/Services/EmergencyService.swift`  
**Lines**: 235 lines  
**Purpose**: Emergency ride handling

**Priority**: Always 9999 (bypasses all other logic)

```swift
func handleEmergencyRequest(
    riderId: String,
    eventId: String,
    location: GeoPoint,
    address: String,
    reason: String
) async throws -> Ride {
    // 1. Fetch user
    let user = try await firestoreService.fetchUser(id: riderId)
    
    // 2. Create ride with priority 9999
    let ride = Ride(
        id: UUID().uuidString,
        riderId: riderId,
        // ... other fields
        priority: 9999.0,  // HARDCODED
        isEmergency: true,
        notes: "EMERGENCY: \(reason)"
    )
    
    // 3. Save ride
    try await firestoreService.createRide(ride)
    
    // 4. Create admin alert
    let alert = AdminAlert(
        type: .emergencyRide,
        message: "🚨 EMERGENCY RIDE REQUESTED\n\nRider: \(user.name)\nReason: \(reason)"
    )
    try await firestoreService.createAdminAlert(alert)
    
    return ride
}
```

### 3.7 ETAService
**File**: `/ios/DDRide/Core/Services/ETAService.swift`  
**Lines**: 259 lines  
**Purpose**: ETA calculation using MapKit

```swift
// Calculate driving ETA between two coordinates
func calculateETA(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) async throws -> Int {
    let request = MKDirections.Request()
    request.source = MKMapItem(placemark: MKPlacemark(coordinate: from))
    request.destination = MKMapItem(placemark: MKPlacemark(coordinate: to))
    request.transportType = .automobile
    
    let directions = MKDirections(request: request)
    let response = try await directions.calculate()
    
    let travelTimeSeconds = response.routes.first!.expectedTravelTime
    return Int(ceil(travelTimeSeconds / 60.0))  // Minutes, rounded up
}
```

**React Native Equivalent**:
- Use Google Maps Directions API
- Or expo-location with distance matrix
- Fallback to 15 minutes on error

### 3.8 NotificationService
**File**: `/ios/DDRide/Core/Services/NotificationService.swift`  
**Purpose**: Push notifications (FCM)

**React Native Equivalent**:
- `src/services/notificationService.ts`
- Use `expo-notifications`

### 3.9 RideRequestService
**File**: `/ios/DDRide/Core/Services/RideRequestService.swift`  
**Purpose**: Ride creation flow

**React Native Equivalent**:
- `src/services/rideRequestService.ts`

### 3.10 YearTransitionService
**File**: `/ios/DDRide/Core/Services/YearTransitionService.swift`  
**Purpose**: Annual class year transitions

Triggered by Cloud Function on August 1st.

### 3.11 DDMonitoringService
**File**: `/ios/DDRide/Core/Services/DDMonitoringService.swift`  
**Purpose**: DD activity monitoring

### 3.12 AdminTransitionService
**File**: `/ios/DDRide/Core/Services/AdminTransitionService.swift`  
**Purpose**: Admin role transfer logging

### 3.13 FirebaseService
**File**: `/ios/DDRide/Core/Services/FirebaseService.swift`  
**Purpose**: Firebase initialization wrapper

### 3.14 ErrorHandler
**File**: `/ios/DDRide/Core/Errors/ErrorHandler.swift`  
**Purpose**: Centralized error handling

---

## 4. View Architecture

### 4.1 App Entry & Navigation

**DDRideApp.swift** - Entry point
```swift
@main
struct DDRideApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authService = AuthService.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(...) -> Bool {
        FirebaseApp.configure()
        #if DEBUG
        configureFirebaseEmulators()
        #endif
        return true
    }
}
```

**ContentView.swift** - Auth router
```swift
struct ContentView: View {
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        if authService.isLoading {
            LoadingView()
        } else if let user = authService.currentUser {
            if !user.isEmailVerified {
                EmailVerificationView()
            } else {
                MainTabView(user: user)
            }
        } else {
            LoginView()
        }
    }
}
```

**MainTabView.swift** - Role-based dashboard
```swift
struct MainTabView: View {
    let user: User
    @StateObject private var viewModel: MainTabViewModel
    
    var body: some View {
        TabView {
            // Dynamic dashboard based on role
            mainDashboard
                .tabItem { Label(viewModel.dashboardTabTitle, systemImage: viewModel.dashboardTabIcon) }
            
            ProfileView(user: user)
                .tabItem { Label("Profile", systemImage: "person.circle.fill") }
        }
    }
    
    @ViewBuilder
    private var mainDashboard: some View {
        NavigationStack {
            switch viewModel.primaryRole {
            case .admin:
                AdminDashboardView()
            case .dd:
                DDDashboardView()
            case .rider:
                RiderDashboardView()
            }
        }
    }
}
```

**Role Determination Logic**:
1. If `user.role == .admin` → Admin Dashboard
2. Else if user is assigned as DD for active event → DD Dashboard
3. Else → Rider Dashboard

### 4.2 Feature Modules

#### Authentication Feature
**Location**: `/ios/DDRide/Features/Authentication/`

**Views**:
- `LoginView.swift` - Email/password login
- `SignUpView.swift` - Account creation with KSU validation
- `EmailVerificationView.swift` - Email verification prompt
- `ForgotPasswordView.swift` - Password reset

**ViewModels**:
- `AuthViewModel.swift` - Login/signup logic
- `EmailVerificationViewModel.swift` - Verification state

#### Admin Feature
**Location**: `/ios/DDRide/Features/Admin/`

**Views** (10 files):
- `AdminDashboardView.swift` - Main admin dashboard
- `AdminAlertsView.swift` - Alert notifications
- `MemberManagementView.swift` - Member CRUD
- `EventCreationView.swift` - Create/edit events
- `DDProfileView.swift` - View DD details
- `RideDetailView.swift` - Ride details modal

**ViewModels**:
- `AdminViewModel.swift` - Dashboard logic
- `MemberManagementViewModel.swift` - Member operations
- `EventCreationViewModel.swift` - Event operations

**Key Features**:
- Real-time ride monitoring
- DD assignment management
- Event creation & activation
- Member role changes
- Alert dashboard
- Admin role transfer

#### DD Feature
**Location**: `/ios/DDRide/Features/DD/`

**Views** (6 files):
- `DDDashboardView.swift` - DD dashboard
- `CurrentRideCard.swift` - Current ride info
- `NextRideCard.swift` - Next queued ride
- `DDStatsCard.swift` - Ride stats
- `DDPhotoUploadView.swift` - Upload DD photo

**ViewModel**:
- `DDViewModel.swift` - DD dashboard logic

**Key Features**:
- Active/inactive toggle
- Current ride management (mark en route, complete)
- Next ride preview
- DD stats (rides completed tonight)
- Photo upload for rider identification

#### Rider Feature
**Location**: `/ios/DDRide/Features/Rider/`

**Views** (5 files):
- `RiderDashboardView.swift` - Rider dashboard
- `RideRequestView.swift` - Request ride form
- `ActiveRideView.swift` - Active ride status
- `EmergencyAlertView.swift` - Emergency button

**ViewModel**:
- `RiderViewModel.swift` - Rider logic

**Key Features**:
- Request ride (capture location)
- Active ride status with ETA
- Queue position display
- Emergency button
- Ride history

#### Profile Feature
**Location**: `/ios/DDRide/Features/Profile/`

**Views**:
- `ProfileView.swift` - User profile & settings

---

## 5. Shared Components (15 Reusable Components)

**Location**: `/ios/DDRide/Shared/Components/`

### UI Components
1. **PrimaryButton** - Main CTA button
2. **CustomButton** - Generic button
3. **LoadingView** - Loading spinner with message
4. **ErrorView** - Error state display
5. **ErrorBanner** - Inline error banner
6. **EmptyStateView** - Empty state placeholder

### Data Display Components
7. **RideCard** - Ride summary card
8. **InfoCard** - Info display card
9. **ActionCard** - Actionable card
10. **StatCard** - Stat display
11. **LocationRow** - Location display row
12. **MemberRow** - Member list row

### Status Components
13. **StatusBadge** - Generic status badge
14. **DDStatusBadge** - DD active/inactive badge
15. **RoleBadge** - User role badge
16. **OfflineIndicator** - Offline mode indicator

**React Native Equivalents**:
- All components need to be rewritten with React Native components
- Similar structure, different implementation
- Use styled-components or StyleSheet

---

## 6. State Management

### Swift: Combine Framework

**Pattern**: ObservableObject + @Published
```swift
@MainActor
class RiderViewModel: ObservableObject {
    @Published var activeRide: Ride?
    @Published var queuePosition: Int?
    @Published var isLoading = false
    
    private var cancellables = Set<AnyCancellable>()
    
    func observeActiveRide() {
        firestoreService.observeActiveRides(eventId: eventId)
            .sink { rides in
                self.activeRide = rides.first
            }
            .store(in: &cancellables)
    }
}
```

### React Native: Redux Toolkit

**Equivalent Pattern**:
```typescript
// Redux slice
const riderSlice = createSlice({
  name: 'rider',
  initialState: {
    activeRide: null,
    queuePosition: null,
    isLoading: false,
  },
  reducers: {
    setActiveRide: (state, action) => {
      state.activeRide = action.payload;
    },
  },
});

// Component
const RiderDashboard = () => {
  const activeRide = useSelector((state) => state.rider.activeRide);
  const dispatch = useDispatch();
  
  useEffect(() => {
    const unsubscribe = observeActiveRides(eventId, (rides) => {
      dispatch(setActiveRide(rides[0]));
    });
    return unsubscribe;
  }, [eventId]);
};
```

---

## 7. Firebase Backend

### 7.1 Firestore Collections

**Collection Structure**:
```
firestore/
├── users/{userId}
├── chapters/{chapterId}
├── events/{eventId}
│   └── ddAssignments/{userId}        # Subcollection
├── rides/{rideId}
├── adminAlerts/{alertId}
├── yearTransitionLogs/{logId}
└── adminTransitionLogs/{logId}
```

**Firestore Rules**: `/firestore.rules`
- User can read own data
- Admin can read/write chapter data
- DD can update assigned rides
- Event-based permissions

### 7.2 Cloud Functions (5 Functions)

All in TypeScript, Firebase Functions v2.

#### 1. autoAssignRide
**File**: `/functions/src/rideAssignment.ts`  
**Trigger**: `onDocumentCreated("rides/{rideId}")`

**Algorithm**:
```typescript
// Find DD with SHORTEST WAIT TIME
async function findBestAvailableDD(eventId: string): Promise<DDWithWaitTime | null> {
  // 1. Fetch all active DDs
  const ddAssignments = await db
    .collection("events").doc(eventId)
    .collection("ddAssignments")
    .where("isActive", "==", true)
    .get();
  
  // 2. Calculate wait time for each DD
  const ddWaitTimes = await Promise.all(
    ddAssignments.docs.map(async (doc) => {
      const waitTime = await calculateDDWaitTime(doc.id, eventId);
      return { userId: doc.id, waitTime, assignment: doc.data() };
    })
  );
  
  // 3. Return DD with minimum wait time
  return ddWaitTimes.reduce((best, current) => 
    current.waitTime < best.waitTime ? current : best
  );
}

// Wait time = number of active rides × 15 minutes
async function calculateDDWaitTime(ddId: string, eventId: string): Promise<number> {
  const activeRides = await db
    .collection("rides")
    .where("eventId", "==", eventId)
    .where("ddId", "==", ddId)
    .where("status", "in", ["assigned", "enroute"])
    .get();
  
  return activeRides.size * 15;  // 15 minutes per ride
}
```

#### 2. notifyDDNewRide
**File**: `/functions/src/smsNotifications.ts`  
**Trigger**: `onDocumentUpdated("rides/{rideId}")` when status changes `queued → assigned`

**SMS Format**:
```
[If emergency: 🚨 EMERGENCY RIDE: ]
New ride: {riderName} at {pickupAddress}
```

#### 3. notifyRiderEnRoute
**File**: `/functions/src/smsNotifications.ts`  
**Trigger**: `onDocumentUpdated("rides/{rideId}")` when status changes `assigned → enroute`

**SMS Format**:
```
{ddName} in {carDescription} is {ETA} mins away
```

#### 4. monitorDDActivity
**File**: `/functions/src/ddMonitoring.ts`  
**Trigger**: `onDocumentUpdated("events/{eventId}/ddAssignments/{ddId}")`

**Checks**:
- Inactive toggles >5 in 30 minutes → Create AdminAlert
- Inactive >15 minutes during shift → Create AdminAlert

#### 5. yearTransition
**File**: `/functions/src/yearTransition.ts`  
**Trigger**: Scheduled function (Cloud Scheduler)  
**Schedule**: August 1st, 12:00 AM Central Time

**Actions**:
1. Fetch all users where `classYear === 4`
2. Delete seniors
3. Increment all other users' `classYear` by 1
4. Create `YearTransitionLog`
5. Notify admins

### 7.3 Twilio SMS Integration

**Setup**: Environment variables in Cloud Functions
```
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

**Utility**: `/functions/src/utils/twilioClient.ts`

---

## 8. Critical Business Logic (MUST PRESERVE)

### 8.1 Priority Algorithm
**Location**: `RideQueueService.calculatePriority()`

```
Emergency rides:
  priority = 9999 (always first)

Same-chapter rides:
  priority = (classYear × 10) + (waitMinutes × 0.5)
  Examples:
    - Senior (4) waiting 5 min: 40 + 2.5 = 42.5
    - Junior (3) waiting 10 min: 30 + 5 = 35
    - Sophomore (2) waiting 20 min: 20 + 10 = 30
    - Freshman (1) waiting 15 min: 10 + 7.5 = 17.5

Cross-chapter rides:
  priority = waitMinutes × 0.5
  (Class year ignored for other chapters)
```

### 8.2 DD Assignment Algorithm
**Location**: `DDAssignmentService.findBestDD()`

```
Algorithm: Assign to DD with SHORTEST WAIT TIME
NOT the DD with lowest ride count!

Wait time calculation:
  1. If DD has 0 active rides → wait time = 0
  2. If DD has N active rides → wait time = N × 15 minutes
  3. Assign to DD with minimum wait time
  4. If tie, pick first one
```

### 8.3 Location Capture Rules
**Location**: `LocationService`

```
Battery-Efficient Design:
  - ONE-TIME capture only (not continuous)
  - Use "When In Use" permission (not "Always")
  - 10-second timeout
  - Stop location manager immediately after capture

Two Captures Per Ride:
  1. Rider's pickup location (when requesting ride)
  2. DD's location (when DD marks "en route" for ETA)

NO background tracking!
```

### 8.4 SMS Triggers
**Location**: Cloud Functions

```
Trigger 1: Ride Assigned
  - When: ride.status changes from "queued" to "assigned"
  - Recipient: DD
  - Message: "New ride: {riderName} at {pickupAddress}"
  - If emergency: Prefix with "🚨 EMERGENCY RIDE: "

Trigger 2: DD En Route
  - When: ride.status changes from "assigned" to "enroute"
  - Recipient: Rider
  - Message: "{ddName} in {carDescription} is {ETA} mins away"
```

### 8.5 Queue Position
**Location**: `RideQueueService.getOverallQueuePosition()`

```
IMPORTANT: Queue position is OVERALL across ALL DDs
NOT per-DD!

Example:
  - DD1 has 2 rides: priority 45.5, 40.0
  - DD2 has 2 rides: priority 42.5, 35.0
  - DD3 has 1 ride: priority 38.0
  
  Overall queue:
    1. Ride with 45.5 (DD1)
    2. Ride with 42.5 (DD2)
    3. Ride with 40.0 (DD1)
    4. Ride with 38.0 (DD3)
    5. Ride with 35.0 (DD2)
```

### 8.6 DD Monitoring
**Location**: Cloud Functions `monitorDDActivity`

```
Alert Threshold 1: Excessive Inactive Toggles
  - Trigger: inactiveToggles > 5 in last 30 minutes
  - Action: Create AdminAlert with type .ddInactiveToggle
  - Reset: After 30 minutes

Alert Threshold 2: Prolonged Inactivity
  - Trigger: isActive == false for > 15 minutes during shift
  - Action: Create AdminAlert with type .ddProlongedInactive
```

---

## 9. Dependencies

### 9.1 Swift/iOS Dependencies

**Swift Package Manager (SPM)**:
- `firebase-ios-sdk` (v12.7.0+)
  - FirebaseAuth
  - FirebaseCore
  - FirebaseFirestore
  - FirebaseFunctions
  - FirebaseInAppMessaging-Beta

**iOS Frameworks**:
- SwiftUI
- Combine
- CoreLocation
- MapKit
- Foundation
- UIKit

**iOS Version**: iOS 17.0+

### 9.2 Cloud Functions Dependencies

**File**: `/functions/package.json`

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "twilio": "^4.19.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 9.3 React Native Dependencies (Target)

**File**: `rally-react-native/package.json`

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
    "expo-image-picker": "~14.x",
    "react-native-maps": "^1.x"
  }
}
```

---

## 10. Migration Mapping

### 10.1 Direct Translations (Keep Same Logic)

| Swift File | React Native File | Complexity | Notes |
|------------|-------------------|------------|-------|
| `User.swift` | `models/User.ts` | Low | Direct translation |
| `Ride.swift` | `models/Ride.ts` | Low | Direct translation |
| `Event.swift` | `models/Event.ts` | Low | Direct translation |
| `DDAssignment.swift` | `models/DDAssignment.ts` | Low | Direct translation |
| `Chapter.swift` | `models/Chapter.ts` | Low | Direct translation |
| `AdminAlert.swift` | `models/AdminAlert.ts` | Low | Direct translation |
| `YearTransitionLog.swift` | `models/YearTransitionLog.ts` | Low | Direct translation |
| `AdminTransitionLog.swift` | `models/AdminTransitionLog.ts` | Low | Direct translation |
| `RideQueueService.swift` | `services/rideQueueService.ts` | High | CRITICAL - Preserve algorithms |
| `DDAssignmentService.swift` | `services/ddAssignmentService.ts` | High | CRITICAL - Preserve algorithms |
| `AuthService.swift` | `services/authService.ts` | Medium | Firebase Auth (similar API) |
| `FirestoreService.swift` | `services/firestoreService.ts` | Medium | Firebase Firestore (similar API) |
| `EmergencyService.swift` | `services/emergencyService.ts` | Medium | Preserve priority 9999 |
| `Constants.swift` | `constants/index.ts` | Low | Direct copy |

### 10.2 Platform-Specific Rewrites

| Swift File | React Native File | Library | Notes |
|------------|-------------------|---------|-------|
| `LocationService.swift` | `services/locationService.ts` | expo-location | Different API, same logic |
| `ETAService.swift` | `services/etaService.ts` | Google Maps API | MapKit → Google Directions |
| `NotificationService.swift` | `services/notificationService.ts` | expo-notifications | FCM similar |
| All SwiftUI Views | React Native screens/components | React Native | Complete rewrite |

### 10.3 State Management Migration

| Swift Pattern | React Native Pattern |
|---------------|----------------------|
| `@StateObject` | `useState` |
| `@Published` | Redux state |
| `@EnvironmentObject` | Redux Provider / Context |
| `Combine Publishers` | Redux subscriptions |
| `.sink()` | `useSelector()` / `useEffect()` |
| `@MainActor` | Main thread (default in RN) |

### 10.4 Navigation Migration

| Swift Navigation | React Native Navigation |
|------------------|-------------------------|
| `NavigationStack` | `Stack.Navigator` (React Navigation) |
| `TabView` | `Tab.Navigator` |
| `.sheet()` | Modal or Stack screen |
| `.alert()` | React Native Alert or Modal |

---

## 11. Testing Strategy

### 11.1 Existing Swift Tests

**Location**: `/ios/DDRide/Tests/`

**Test Files**:
1. **RideQueueServiceTests.swift** - Priority calculation tests
2. **DDAssignmentServiceTests.swift** - DD assignment algorithm tests
3. **YearTransitionServiceTests.swift** - Year transition logic tests
4. **RideFlowIntegrationTests.swift** - End-to-end ride flow
5. **EmergencyFlowTests.swift** - Emergency handling flow
6. **AdminTransitionTests.swift** - Admin role transfer
7. **DDMonitoringTests.swift** - DD activity monitoring
8. **ErrorHandlingTests.swift** - Error handling

**Test Helpers**:
- `TestConfiguration.swift` - Test setup
- `TestDataFactory.swift` - Mock data generation
- `FirestoreTestHelpers.swift` - Firestore mocking

### 11.2 React Native Test Plan

**Framework**: Jest + React Native Testing Library

**Priority Tests**:
1. **Unit Tests** (High Priority)
   - `rideQueueService.test.ts` - Priority algorithm validation
   - `ddAssignmentService.test.ts` - DD assignment algorithm
   - `locationService.test.ts` - Location capture logic
   - `authService.test.ts` - Auth flows

2. **Integration Tests** (Medium Priority)
   - Full ride request flow
   - DD assignment flow
   - Emergency ride flow

3. **Component Tests** (Low Priority)
   - Screen snapshots
   - User interaction flows

---

## 12. Key Risks & Challenges

### 12.1 High-Risk Areas

1. **Priority Algorithm Accuracy** (CRITICAL)
   - Must preserve exact calculation: `(classYear × 10) + (waitMinutes × 0.5)`
   - Same-chapter vs cross-chapter logic
   - Emergency priority 9999
   - **Mitigation**: Port tests from Swift, extensive manual testing

2. **DD Assignment Logic** (CRITICAL)
   - Must assign to DD with SHORTEST WAIT TIME
   - NOT lowest ride count
   - **Mitigation**: Port existing tests, validate with sample data

3. **Location Services** (HIGH)
   - Different APIs: Core Location → expo-location
   - One-time capture behavior
   - Permission handling
   - **Mitigation**: Test on both iOS and Android, battery testing

4. **Real-Time Updates** (MEDIUM)
   - Combine → Redux subscriptions
   - Firestore listeners
   - **Mitigation**: Test with multiple concurrent users

5. **Firebase Emulator Integration** (MEDIUM)
   - Development workflow
   - Testing environment
   - **Mitigation**: Document setup, CI/CD integration

### 12.2 Android-Specific Concerns

1. **Location Permissions** - Different permission model
2. **Background Behavior** - Different lifecycle
3. **Push Notifications** - FCM configuration
4. **Maps Integration** - Google Maps setup

---

## 13. Migration Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Set up React Native project with Expo
- [ ] Configure Firebase (same project as Swift)
- [ ] Set up Firebase emulators
- [ ] Implement all 8 data models
- [ ] Implement AuthService
- [ ] Implement FirestoreService
- [ ] Create basic navigation structure

### Phase 2: Core Services (Week 3-4)
- [ ] Implement RideQueueService (CRITICAL)
- [ ] Implement DDAssignmentService (CRITICAL)
- [ ] Implement LocationService
- [ ] Implement EmergencyService
- [ ] Implement ETAService
- [ ] Write unit tests for all algorithms

### Phase 3: UI Components (Week 5-6)
- [ ] Create shared component library
- [ ] Implement Authentication screens
- [ ] Implement Rider dashboard
- [ ] Implement DD dashboard
- [ ] Implement Admin dashboard

### Phase 4: Integration & Testing (Week 7-8)
- [ ] End-to-end ride flow testing
- [ ] Emergency flow testing
- [ ] Real-time updates testing
- [ ] Android-specific testing
- [ ] Performance testing
- [ ] Battery usage testing

### Phase 5: Polish & Deploy (Week 9-10)
- [ ] UI/UX refinement
- [ ] Error handling
- [ ] Analytics setup
- [ ] Beta deployment (TestFlight + Play Store Internal)
- [ ] User acceptance testing

---

## 14. File-by-File Migration Map

### Data Models (8 files)
```
User.swift                  → models/User.ts
Ride.swift                  → models/Ride.ts
Event.swift                 → models/Event.ts
DDAssignment.swift          → models/DDAssignment.ts
Chapter.swift               → models/Chapter.ts
AdminAlert.swift            → models/AdminAlert.ts
YearTransitionLog.swift     → models/YearTransitionLog.ts
AdminTransitionLog.swift    → models/AdminTransitionLog.ts
```

### Core Services (14 files)
```
RideQueueService.swift      → services/rideQueueService.ts
DDAssignmentService.swift   → services/ddAssignmentService.ts
LocationService.swift       → services/locationService.ts
AuthService.swift           → services/authService.ts
FirestoreService.swift      → services/firestoreService.ts
EmergencyService.swift      → services/emergencyService.ts
ETAService.swift            → services/etaService.ts
NotificationService.swift   → services/notificationService.ts
RideRequestService.swift    → services/rideRequestService.ts
YearTransitionService.swift → services/yearTransitionService.ts
DDMonitoringService.swift   → services/ddMonitoringService.ts
AdminTransitionService.swift → services/adminTransitionService.ts
FirebaseService.swift       → config/firebase.ts
ErrorHandler.swift          → utils/errorHandler.ts
```

### Utilities (3 files)
```
Constants.swift             → constants/index.ts
Helpers.swift               → utils/helpers.ts
Extensions.swift            → utils/extensions.ts
```

### Authentication Views (4 files)
```
LoginView.swift             → screens/Auth/LoginScreen.tsx
SignUpView.swift            → screens/Auth/SignUpScreen.tsx
EmailVerificationView.swift → screens/Auth/EmailVerificationScreen.tsx
ForgotPasswordView.swift    → screens/Auth/ForgotPasswordScreen.tsx
```

### Admin Views (6 files)
```
AdminDashboardView.swift    → screens/Admin/AdminDashboardScreen.tsx
AdminAlertsView.swift       → screens/Admin/AdminAlertsScreen.tsx
MemberManagementView.swift  → screens/Admin/MemberManagementScreen.tsx
EventCreationView.swift     → screens/Admin/EventCreationScreen.tsx
DDProfileView.swift         → screens/Admin/DDProfileScreen.tsx
RideDetailView.swift        → screens/Admin/RideDetailScreen.tsx
```

### DD Views (5 files)
```
DDDashboardView.swift       → screens/DD/DDDashboardScreen.tsx
CurrentRideCard.swift       → components/DD/CurrentRideCard.tsx
NextRideCard.swift          → components/DD/NextRideCard.tsx
DDStatsCard.swift           → components/DD/DDStatsCard.tsx
DDPhotoUploadView.swift     → screens/DD/DDPhotoUploadScreen.tsx
```

### Rider Views (4 files)
```
RiderDashboardView.swift    → screens/Rider/RiderDashboardScreen.tsx
RideRequestView.swift       → screens/Rider/RideRequestScreen.tsx
ActiveRideView.swift        → components/Rider/ActiveRideCard.tsx
EmergencyAlertView.swift    → components/Rider/EmergencyButton.tsx
```

### Shared Components (15 files)
```
PrimaryButton.swift         → components/shared/PrimaryButton.tsx
CustomButton.swift          → components/shared/CustomButton.tsx
LoadingView.swift           → components/shared/LoadingView.tsx
ErrorView.swift             → components/shared/ErrorView.tsx
ErrorBanner.swift           → components/shared/ErrorBanner.tsx
EmptyStateView.swift        → components/shared/EmptyStateView.tsx
RideCard.swift              → components/shared/RideCard.tsx
InfoCard.swift              → components/shared/InfoCard.tsx
ActionCard.swift            → components/shared/ActionCard.tsx
StatCard.swift              → components/shared/StatCard.tsx
LocationRow.swift           → components/shared/LocationRow.tsx
MemberRow.swift             → components/shared/MemberRow.tsx
StatusBadge.swift           → components/shared/StatusBadge.tsx
DDStatusBadge.swift         → components/shared/DDStatusBadge.tsx
RoleBadge.swift             → components/shared/RoleBadge.tsx
```

**Total Files to Migrate**: ~87 Swift files → ~87 TypeScript/TSX files

---

## 15. Firebase Backend (Reuse As-Is)

**No changes needed** - Cloud Functions are already TypeScript!

### Cloud Functions (Reuse)
```
functions/src/index.ts                    ✓ Keep as-is
functions/src/rideAssignment.ts           ✓ Keep as-is
functions/src/smsNotifications.ts         ✓ Keep as-is
functions/src/emergencyHandler.ts         ✓ Keep as-is
functions/src/ddMonitoring.ts             ✓ Keep as-is
functions/src/yearTransition.ts           ✓ Keep as-is
functions/src/utils/twilioClient.ts       ✓ Keep as-is
functions/src/utils/validation.ts         ✓ Keep as-is
```

### Firestore Rules (Reuse)
```
firestore.rules                           ✓ Keep as-is
firestore.indexes.json                    ✓ Keep as-is
```

### Firebase Config (Reuse)
```
firebase.json                             ✓ Keep as-is
.firebaserc                               ✓ Keep as-is
```

---

## 16. Key Architectural Decisions

### 16.1 Why These Patterns Were Chosen

1. **MVVM Architecture**
   - Separation of concerns
   - Testable business logic
   - SwiftUI declarative UI
   - **React Native**: Similar with Redux + components

2. **Service Layer Pattern**
   - Centralized business logic
   - Reusable across views
   - Easy to test
   - **React Native**: Keep same pattern

3. **Combine for Reactive Programming**
   - Real-time updates from Firestore
   - Automatic UI updates
   - **React Native**: Use Redux + Firestore listeners

4. **Firebase Backend**
   - Serverless architecture
   - Real-time database
   - Built-in auth
   - **React Native**: Same backend!

5. **One-Time Location Capture**
   - Battery efficiency
   - Privacy-friendly
   - Sufficient for use case
   - **React Native**: Same strategy

### 16.2 Design Philosophy

**Principles**:
1. **Battery Efficiency** - No background location tracking
2. **Simplicity** - Clear role-based UI
3. **Reliability** - Offline support, error handling
4. **Fairness** - Priority algorithm balances class year + wait time
5. **Safety** - Emergency button with admin alerts
6. **Audit Trail** - Complete ride logs, transition logs

---

## 17. Performance Considerations

### 17.1 Current Performance Metrics (iOS)

- **App Launch**: ~2 seconds (cold start with Firebase)
- **Location Capture**: ~3-5 seconds (dependent on GPS)
- **Ride Assignment**: <1 second (Cloud Function)
- **Real-Time Updates**: <1 second (Firestore listeners)
- **Battery Impact**: Minimal (one-time location only)

### 17.2 React Native Performance Targets

- **App Launch**: ~3 seconds (target)
- **Location Capture**: ~3-5 seconds (same)
- **Navigation**: 60 FPS
- **List Scrolling**: 60 FPS (FlatList optimization)
- **Battery Impact**: Minimal (same strategy)

### 17.3 Optimization Strategies

1. **Redux**: Use RTK Query for caching
2. **FlatList**: Virtualized lists for ride history
3. **Image Optimization**: Compress DD photos
4. **Firestore**: Use pagination for large queries
5. **Code Splitting**: Lazy load screens

---

## 18. Security Considerations

### 18.1 Current Security Measures

1. **Authentication**
   - KSU email verification required
   - Email verification before access
   - Secure password requirements

2. **Firestore Rules**
   - User can read own data only
   - Admin role for chapter management
   - DD can only update assigned rides
   - Event-based permissions

3. **Cloud Functions**
   - Server-side validation
   - Rate limiting
   - SMS cost controls

4. **Data Privacy**
   - Location captured once, not stored long-term
   - Phone numbers E.164 format only
   - No background tracking

### 18.2 React Native Security Checklist

- [ ] Secure Firebase config (environment variables)
- [ ] API key restrictions (iOS/Android bundle IDs)
- [ ] Code obfuscation for production builds
- [ ] Secure storage for tokens (expo-secure-store)
- [ ] SSL pinning (if needed)

---

## 19. Documentation & Knowledge Transfer

### 19.1 Existing Documentation

**In Swift Project**:
- `CLAUDE.md` - Project overview
- `BACKEND_SUMMARY.md` - Backend architecture
- `FIREBASE_SETUP.md` - Firebase configuration
- `LOCATION_SERVICES_IMPLEMENTATION.md` - Location logic
- `ERROR_HANDLING_COMPLETE.md` - Error patterns
- `TESTING_GUIDE.md` - Test strategy

### 19.2 Migration Documentation Needed

1. **Migration Guide** - Step-by-step process
2. **API Documentation** - All services and models
3. **Component Library** - Storybook or similar
4. **Testing Guide** - Jest setup and patterns
5. **Deployment Guide** - EAS Build + App Stores

---

## 20. Next Steps

### Immediate Actions (This Week)
1. ✅ Complete Swift app analysis (this document)
2. [ ] Review with team/stakeholders
3. [ ] Finalize tech stack decisions
4. [ ] Set up React Native project skeleton
5. [ ] Configure Firebase for development

### Short-Term (Next 2 Weeks)
1. [ ] Implement core data models
2. [ ] Implement authentication flow
3. [ ] Set up Firebase emulator workflow
4. [ ] Implement RideQueueService with tests
5. [ ] Implement DDAssignmentService with tests

### Medium-Term (Next 4-6 Weeks)
1. [ ] Complete all services
2. [ ] Build UI component library
3. [ ] Implement all screens
4. [ ] Integration testing
5. [ ] Android-specific testing

### Long-Term (Next 8-10 Weeks)
1. [ ] Beta testing with K-State SAE
2. [ ] Performance optimization
3. [ ] App Store submission
4. [ ] Production launch

---

## Appendix A: Priority Algorithm Examples

### Same-Chapter Rides
```
Senior (classYear=4) waiting 5 minutes:
  priority = (4 × 10) + (5 × 0.5) = 40 + 2.5 = 42.5

Junior (classYear=3) waiting 10 minutes:
  priority = (3 × 10) + (10 × 0.5) = 30 + 5 = 35

Sophomore (classYear=2) waiting 20 minutes:
  priority = (2 × 10) + (20 × 0.5) = 20 + 10 = 30

Freshman (classYear=1) waiting 30 minutes:
  priority = (1 × 10) + (30 × 0.5) = 10 + 15 = 25
```

### Cross-Chapter Rides
```
Any class year waiting 5 minutes:
  priority = 5 × 0.5 = 2.5

Any class year waiting 15 minutes:
  priority = 15 × 0.5 = 7.5
```

### Emergency Rides
```
Any class year, any wait time:
  priority = 9999
```

### Edge Cases
```
Two same-priority rides:
  - Sort by requestedAt (FIFO)
  - First requested gets higher position
```

---

## Appendix B: DD Assignment Examples

### Scenario 1: Fresh Event (No Active Rides)
```
DDs:
  - DD1: 0 active rides → wait time = 0 min
  - DD2: 0 active rides → wait time = 0 min
  - DD3: 0 active rides → wait time = 0 min

New ride requested:
  → Assign to DD1 (first with 0 wait time)
```

### Scenario 2: Mixed Load
```
DDs:
  - DD1: 2 active rides → wait time = 30 min
  - DD2: 1 active ride → wait time = 15 min
  - DD3: 3 active rides → wait time = 45 min

New ride requested:
  → Assign to DD2 (shortest wait: 15 min)
```

### Scenario 3: All Busy
```
DDs:
  - DD1: 4 active rides → wait time = 60 min
  - DD2: 5 active rides → wait time = 75 min
  - DD3: 6 active rides → wait time = 90 min

New ride requested:
  → Assign to DD1 (shortest wait: 60 min)
  → Log warning: "All DDs busy - shortest wait: 60 minutes"
```

---

## Appendix C: Cloud Function Triggers

### Firestore Triggers
```
onCreate rides/{rideId}
  → autoAssignRide
  → If isEmergency: handleEmergencyRide

onUpdate rides/{rideId}
  → If status: queued → assigned: notifyDDNewRide
  → If status: assigned → enroute: notifyRiderEnRoute
  → If status: * → completed: incrementDDRideCount

onUpdate events/{eventId}/ddAssignments/{ddId}
  → monitorDDActivity
```

### Scheduled Triggers
```
schedule: "0 0 1 8 *" (August 1, midnight)
  → yearTransition
```

---

## Appendix D: Firestore Indexes Required

```json
{
  "indexes": [
    {
      "collectionGroup": "rides",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "rides",
      "fields": [
        { "fieldPath": "ddId", "order": "ASCENDING" },
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "ddAssignments",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Analysis**

This comprehensive analysis provides everything needed to migrate the Rally iOS app from Swift to React Native while preserving all critical business logic and algorithms.
