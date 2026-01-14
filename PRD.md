# Rally Ride - Product Requirements Document

## Purpose
AI coding agent context document for understanding Rally Ride app architecture, user flows, and core functionality.

---

## Product Overview

**Rally Ride** is a designated driver (DD) coordination app for university organizations (fraternities/sororities). It matches riders who need safe transportation with DDs during events.

---

## Core User Roles

### 1. Rider
- Request pickup via location or manual address
- View queue position and estimated wait
- See DD info when assigned
- Receive notifications (DD en route, arrived)

### 2. Designated Driver (DD)
- Toggle active/inactive status
- **Must enter car info before going active** (color, make, model)
- View assigned rides queue
- Accept ride → automatically en route (single action)
- Mark "arrived" → navigate → mark "complete"
- See ride priority and notes

### 3. Admin
- Manage chapter members
- Approve/reject join requests
- Create/manage events
- View analytics (rides completed, active DDs)
- Transfer admin status

---

## Key User Flows

### Rider Requests Ride
1. Tap "Request Ride" from home
2. Location auto-captured (or manual entry if fails)
3. Add optional notes
4. Submit → enters queue
5. Receives priority score: `(classYear × 10) + (waitMinutes × 0.5)`
6. Emergency = priority 9999

### DD Accepts Ride (Merged Flow)
1. DD toggles "Active" (car info required)
2. System auto-assigns highest priority ride
3. DD notified: "Pick up {Name} from '{Address}'"
4. DD taps "Accept" → status = enroute, rider notified with ETA
5. *(No separate "en route" step)*
6. Navigates to pickup (address opens in maps)
7. Taps "I'm Here" → rider notified
8. Completes ride (after dropoff)

### Admin Onboarding
1. Receives admin code from University setup
2. Signs up with .edu email + admin code
3. Becomes chapter admin automatically
4. Can approve member join requests

---

## Data Models

### User
```typescript
{
  id, email, name, phoneNumber?,
  role: 'rider' | 'dd' | 'admin',
  chapterId?, universityId?,
  classYear: 1-4, // Freshman to Senior
  isActive: boolean, // For DDs
  totalRidesCompleted: number
}
```

### Ride
```typescript
{
  id, riderId, ddId?,
  pickupLocation: GeoPoint,
  pickupAddress: string,
  status: 'queued' | 'assigned' | 'enroute' | 'completed' | 'cancelled',
  priority: number,
  isEmergency: boolean,
  requestedAt, assignedAt?, completedAt?
}
```

### Chapter
```typescript
{
  id, name, universityId,
  adminUserId, // Single admin per chapter
  memberCount, isActive
}
```

---

## Firebase Collections

| Collection | Purpose |
|------------|---------|
| `users` | All user profiles |
| `universities` | University records with admin codes |
| `chapters` | Organization chapters |
| `rides` | Ride requests and history |
| `events` | Scheduled DD events |
| `joinRequests` | Pending member approvals |
| `notifications` | Push notification records |

---

## Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `autoAssignRide` | Ride created | Assign to best available DD |
| `notifyDDNewRide` | Ride assigned | Push to DD |
| `notifyRiderEnRoute` | Status → enroute | Push to rider |
| `searchPlaces` | Callable | Proxy Google Places API |
| `getPlaceDetails` | Callable | Get coordinates from place ID |
| `validateAdminCode` | Callable | Verify admin code on signup |

---

## Priority Algorithm

```
Same-chapter ride:
  priority = (classYear × 10) + (waitMinutes × 0.5)

Cross-chapter ride:
  priority = waitMinutes × 0.5  // Class year ignored

Emergency:
  priority = 9999  // Always first
```

**Example**: Senior (year 4) waiting 10 min = `40 + 5 = 45`

---

## Security Model

- **.edu email required** for signup
- **Admin codes** are university-specific secrets
- **RLS rules** restrict data access by role
- **Cloud Function proxy** for third-party APIs (Places)

---

## File Structure Summary

```
src/
├── screens/Auth/     # SignUp, SignIn, Onboarding
├── screens/Rider/    # RequestRide, RideStatus, History
├── screens/DD/       # DDQueue, DDNavigation, EnRoute
├── screens/Admin/    # Dashboard, Members, Events
├── services/         # Firebase API wrappers
├── store/slices/     # Redux state management
functions/src/        # Cloud Functions
```
