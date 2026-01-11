# Rally Business Logic Services

This directory contains the critical business logic algorithms for the Rally DD Ride app. These services have been migrated from Swift to TypeScript while maintaining **exact algorithmic parity** with the iOS implementation.

## Services Overview

### 1. rideQueueService.ts

Manages ride queue operations and priority calculations.

#### Key Algorithms

**Priority Calculation (Same-Chapter)**
```
priority = (classYear × 10) + (waitMinutes × 0.5)
```

**Priority Calculation (Cross-Chapter)**
```
priority = waitMinutes × 0.5  // Class year ignored for cross-chapter
```

**Emergency Priority**
```
priority = 9999  // Always highest, regardless of chapter
```

#### Rationale

- **Same-chapter rides**: DDs know their own chapter's members and respect class year hierarchy (seniors get priority over freshmen)
- **Cross-chapter rides**: DDs don't know other chapters' hierarchies, so only wait time matters
- **Emergency rides**: Always top priority

#### Examples

```typescript
// Same chapter - Senior waiting 5 min
calculatePriority(4, 5, false, true) // = 42.5

// Same chapter - Freshman waiting 15 min
calculatePriority(1, 15, false, true) // = 17.5

// Cross chapter - Senior waiting 5 min
calculatePriority(4, 5, false, false) // = 2.5 (class year ignored!)

// Emergency
calculatePriority(1, 0, true, true) // = 9999
```

#### Queue Position

Returns **overall** queue position across ALL DDs, not per-DD.

Example: If there are 10 active rides across 3 DDs, and this ride has the 4th highest priority, it returns `4`.

### 2. ddAssignmentService.ts

Handles DD assignment logic and activity monitoring.

#### Critical: Assignment Algorithm

**Always assigns to the DD with the SHORTEST WAIT TIME**, not the lowest ride count.

```typescript
waitTime = numberOfActiveRides × 15 minutes
```

**Algorithm Steps:**
1. Fetch all active DD assignments for the event
2. For each DD, calculate wait time (active rides × 15 min)
3. Select DD with MINIMUM wait time
4. If multiple DDs have same wait time, pick first one
5. Return null if no active DDs available

#### DD Activity Monitoring

**Inactive Toggle Threshold**
- Alert if >5 inactive toggles in 30 minutes
- Prevents DD abuse (repeatedly toggling inactive to avoid rides)

**Prolonged Inactivity Threshold**
- Alert if >15 minutes inactive during shift
- Reminds DD to toggle active or end shift

#### Why Wait Time, Not Ride Count?

Wait time is more fair than ride count because:
- DD A with 3 queued rides (45 min wait) should get new rides before...
- DD B with 5 completed + 2 active rides (30 min wait)

This ensures riders are assigned to the DD who can pick them up **soonest**.

### 3. etaService.ts

Calculates ETAs using Google Maps Distance Matrix API.

#### Features

- **One-time calculation** when DD goes en route (not continuous tracking)
- Fallback to 15 minutes if API call fails
- Batch ETA calculation for efficiency
- Straight-line distance calculation (no API needed)

#### API Choice

Uses Google Maps Distance Matrix API instead of Apple MapKit because:
- Cross-platform (works on Android)
- More reliable for React Native
- Better route quality in Kansas

#### Error Handling

All ETA functions have fallback versions that never throw:

```typescript
// Throws ETAError on failure
const eta = await calculateETA(from, to);

// Returns 15 minutes on failure
const eta = await calculateETAWithFallback(from, to);
```

## Migration Notes

### What Changed from Swift

| Swift | TypeScript |
|-------|------------|
| `TimeInterval` (seconds) | `number` (seconds or minutes depending on context) |
| `CLLocationCoordinate2D` | `{ latitude: number; longitude: number }` |
| `Combine` publishers | Direct async/await |
| MapKit Directions | Google Maps Distance Matrix API |
| `@MainActor` | Not needed (JS is single-threaded) |

### What Stayed the Same

- **All algorithm constants** (10, 0.5, 9999, 15 minutes)
- **Business logic flow** (same step-by-step processes)
- **Edge case handling** (same validations and error checks)
- **Monitoring thresholds** (5 toggles, 15 min inactive)

## Testing Strategy

### Unit Tests

Each service should have unit tests covering:

1. **Priority Calculation**
   - Same-chapter with different class years
   - Cross-chapter (class year ignored)
   - Emergency priority
   - Wait time increases over time

2. **DD Assignment**
   - Assigns to DD with shortest wait time
   - Handles no active DDs
   - Handles all DDs busy
   - Wait time calculation accuracy

3. **ETA Calculation**
   - Valid coordinates
   - Invalid coordinates
   - API failures (fallback behavior)
   - Batch calculations

### Integration Tests

Full flow tests:

```typescript
// Test full ride assignment flow
1. Create ride (priority = 42.5)
2. Find best DD (shortest wait time)
3. Assign ride
4. Calculate ETA
5. Verify ride state updated correctly
```

## Usage Examples

### Request a Ride and Get Queue Position

```typescript
import {
  calculatePriority,
  getOverallQueuePosition,
  getEstimatedWaitTime
} from '../services';

// Calculate initial priority
const priority = calculatePriority(
  user.classYear,
  0, // just requested
  false, // not emergency
  true // same chapter
);

// Create ride with priority
const ride = await createRide({
  riderId: user.id,
  priority,
  // ... other fields
});

// Get queue position
const position = await getOverallQueuePosition(ride.id, event.id);
// Result: 3 (3rd in line overall)

// Get estimated wait time
const waitMinutes = await getEstimatedWaitTime(ride.id, event.id);
// Result: 12 (estimated 12 minutes)
```

### Auto-Assign Next Ride

```typescript
import { assignNextRide, calculateETA } from '../services';

// Auto-assign highest priority ride to best DD
const assignedRide = await assignNextRide(event.id);

if (assignedRide) {
  // Calculate ETA
  const eta = await calculateETAWithFallback(
    ddLocation,
    assignedRide.pickupLocation
  );

  console.log(`Ride assigned! ETA: ${eta} minutes`);
} else {
  console.log('No rides to assign or no DDs available');
}
```

### Monitor DD Activity

```typescript
import { toggleDDStatus, monitorDDActivity } from '../services';

// DD toggles inactive
const alerts = await toggleDDStatus(ddAssignment, false);

if (alerts.length > 0) {
  // Admin alerts generated
  alerts.forEach(alert => {
    console.log(`⚠️ ${alert.message}`);
    // Send push notification to admin
  });
}
```

### Get Queue Statistics

```typescript
import { getQueueStats } from '../services';

const stats = await getQueueStats(event.id);

console.log(`
  Total active rides: ${stats.totalActive}
  Queued: ${stats.queued}
  Assigned: ${stats.assigned}
  En route: ${stats.enroute}
  Emergencies: ${stats.emergency}
  Active DDs: ${stats.activeDDs}
  Avg wait: ${stats.averageWaitMinutes} min
`);
```

## Performance Considerations

### Firestore Query Optimization

- Use composite indexes for multi-field queries
- Cache active rides to reduce repeated fetches
- Batch operations when possible

### ETA Calculation

- Use `calculateBatchETAs` for multiple destinations
- Cache ETAs (they don't change much in 1-2 minutes)
- Use straight-line distance for quick "nearby" checks

### Real-time Updates

Consider using Firestore snapshots for real-time queue updates:

```typescript
import { onSnapshot, collection, query, where } from 'firebase/firestore';

const q = query(
  collection(db, 'rides'),
  where('eventId', '==', eventId),
  where('status', 'in', ['queued', 'assigned', 'enroute'])
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  const rides = snapshot.docs.map(/* ... */);
  // Update UI with new queue state
});
```

## Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `EMERGENCY_PRIORITY` | 9999 | Emergency ride priority |
| `CLASS_YEAR_WEIGHT` | 10 | Weight for class year in priority |
| `WAIT_TIME_WEIGHT` | 0.5 | Weight for wait time in priority |
| `AVERAGE_RIDE_TIME_MINUTES` | 15 | Average time per ride for wait calculation |
| `INACTIVE_TOGGLE_THRESHOLD` | 5 | Max toggles before alert |
| `PROLONGED_INACTIVITY_MINUTES` | 15 | Max inactive time before alert |
| `DEFAULT_FALLBACK_ETA` | 15 | Default ETA when API fails |

## Error Handling

All services follow consistent error patterns:

```typescript
// Validation errors - thrown immediately
if (!isValidCoordinate(from)) {
  throw new ETAError(ETAErrorType.INVALID_COORDINATE, 'Invalid source coordinate');
}

// Operation errors - descriptive messages
if (activeDDs.length === 0) {
  throw new Error('No DDs available');
}

// Network errors - wrapped with context
catch (error) {
  throw new ETAError(ETAErrorType.NETWORK_ERROR, 'Network error calculating route', error);
}
```

## Future Enhancements

Potential improvements (not in current scope):

1. **Machine Learning ETA**: Use historical data to improve ETA accuracy
2. **Dynamic Priority Weights**: Adjust weights based on event type
3. **Predictive DD Assignment**: Pre-assign rides before DD finishes current ride
4. **Ride Clustering**: Group nearby pickups for same DD
5. **DD Rating System**: Factor in DD performance for assignment

## Support

For questions about business logic implementation:
- Reference Swift implementation in `/Users/didowu/DDRideApp/ios/DDRide/Core/Services/`
- Review CLAUDE.md for project context
- Check business-logic-expert agent documentation in `.claude/agents/`
