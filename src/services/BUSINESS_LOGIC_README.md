# Business Logic Implementation - Rally React Native

This document details the critical business logic algorithms implemented in the Rally React Native app and how they match the Swift implementation exactly.

## Overview

Three core services implement the critical business logic:

1. **rideQueueService.ts** - Priority calculation and queue management
2. **ddAssignmentService.ts** - DD assignment and activity monitoring
3. **etaService.ts** - ETA calculation using Google Maps API

## 1. Ride Queue Service (`rideQueueService.ts`)

### Priority Algorithm (CRITICAL)

The priority algorithm determines the order in which riders are served. It differentiates between same-chapter and cross-chapter rides.

#### Formula

```typescript
// Emergency rides (always highest priority)
if (isEmergency) return 9999;

// Same-chapter rides (DDs know their chapter's hierarchy)
if (isSameChapter) {
  return (classYear × 10) + (waitMinutes × 0.5);
}

// Cross-chapter rides (class year doesn't matter to other chapters)
if (!isSameChapter) {
  return waitMinutes × 0.5;
}
```

#### Constants

- **EMERGENCY_PRIORITY**: `9999`
- **CLASS_YEAR_WEIGHT**: `10.0`
- **WAIT_TIME_WEIGHT**: `0.5`
- **AVERAGE_RIDE_TIME_MINUTES**: `15.0`

#### Examples

**Same-Chapter Rides:**
- Senior (4) waiting 5 min: `(4 × 10) + (5 × 0.5) = 42.5`
- Junior (3) waiting 10 min: `(3 × 10) + (10 × 0.5) = 35.0`
- Sophomore (2) waiting 20 min: `(2 × 10) + (20 × 0.5) = 30.0`
- Freshman (1) waiting 15 min: `(1 × 10) + (15 × 0.5) = 17.5`

**Cross-Chapter Rides:**
- Senior (4) waiting 5 min: `5 × 0.5 = 2.5` (class year ignored!)
- Freshman (1) waiting 15 min: `15 × 0.5 = 7.5` (class year ignored!)

**Emergency Rides:**
- Any class year, any wait time: `9999`

#### Rationale

**Why differentiate between same-chapter and cross-chapter?**

- **Same-chapter**: DDs know their own chapter's members and understand the social hierarchy. Class year matters.
- **Cross-chapter**: DDs don't know other chapters' hierarchies or members, so only fair criteria is wait time.

### Queue Position Calculation

**Important**: Queue position is calculated **across ALL DDs**, not per-DD.

```typescript
// Get all active rides for the event
const allRides = await fetchActiveRides(eventId);

// Sort by priority (descending - higher priority first)
const sortedRides = allRides.sort((a, b) => b.priority - a.priority);

// Find position (1-indexed)
const position = sortedRides.findIndex(ride => ride.id === rideId) + 1;
```

If there are 10 total active rides across 3 DDs, and your ride has the 4th highest priority, your position is **4** (not "2nd in line for your DD").

### Estimated Wait Time

**For assigned rides:**
```typescript
// Find how many rides ahead in the DD's queue
const ridesAhead = sortedRides.findIndex(ride => ride.id === currentRideId);

// Calculate wait time
const estimatedMinutes = ridesAhead * AVERAGE_RIDE_TIME_MINUTES; // 15 min per ride
```

**For unassigned rides:**
```typescript
// Get overall position and number of active DDs
const position = await getOverallQueuePosition(rideId, eventId);
const activeDDCount = await fetchActiveDDAssignments(eventId).length;

// Estimate based on distribution across DDs
const estimatedRidesAhead = (position - 1) / activeDDCount;
const estimatedMinutes = estimatedRidesAhead * AVERAGE_RIDE_TIME_MINUTES;
```

### Functions

- `calculatePriority(classYear, waitMinutes, isEmergency, isSameChapter): number`
- `isSameChapterRide(ride, event): boolean`
- `calculatePriorityForRide(ride, event, classYear): number`
- `getOverallQueuePosition(rideId, eventId): Promise<number>`
- `getQueuePositions(eventId): Promise<Record<string, number>>`
- `getEstimatedWaitTime(rideId, eventId): Promise<number>`
- `getQueueStats(eventId): Promise<QueueStats>`

## 2. DD Assignment Service (`ddAssignmentService.ts`)

### DD Assignment Algorithm (CRITICAL)

**The algorithm always assigns to the DD with the SHORTEST WAIT TIME.**

This is **NOT** round-robin, **NOT** random, **NOT** based on ride count balance.

#### Algorithm

```typescript
// 1. Fetch all active DDs for the event
const activeDDs = await fetchActiveDDAssignments(eventId);

// 2. Calculate wait time for each DD
for (const dd of activeDDs) {
  const activeRides = rides.filter(r =>
    r.ddId === dd.userId &&
    (r.status === 'queued' || r.status === 'assigned' || r.status === 'enroute')
  );

  // Wait time = number of active rides × 15 minutes
  const waitTimeSeconds = activeRides.length * AVERAGE_RIDE_TIME_MINUTES * 60;
}

// 3. Select DD with MINIMUM wait time
const bestDD = activeDDs.reduce((best, current) => {
  return waitTimes[current.userId] < waitTimes[best.userId] ? current : best;
});
```

#### Examples

**Scenario 1: Empty DDs**
- DD1: 0 rides → wait time = 0 seconds
- DD2: 0 rides → wait time = 0 seconds
- DD3: 0 rides → wait time = 0 seconds
- **Result**: DD1 selected (first with 0 wait)

**Scenario 2: Unbalanced Load**
- DD1: 0 rides → wait time = 0 seconds
- DD2: 2 rides → wait time = 1800 seconds (30 min)
- DD3: 1 ride → wait time = 900 seconds (15 min)
- **Result**: DD1 selected (shortest wait)

**Scenario 3: All Busy**
- DD1: 1 ride → wait time = 900 seconds (15 min)
- DD2: 2 rides → wait time = 1800 seconds (30 min)
- DD3: 3 rides → wait time = 2700 seconds (45 min)
- **Result**: DD1 selected (shortest wait)

### Wait Time Calculation

```typescript
// If DD has no active rides → 0 seconds
if (activeRides.length === 0) {
  return 0;
}

// If DD has rides → sum of estimated time
const totalMinutes = activeRides.length * AVERAGE_RIDE_TIME_MINUTES;
const waitTimeSeconds = totalMinutes * 60;
```

**Active rides include**: `queued`, `assigned`, `enroute`
**Inactive rides exclude**: `completed`, `cancelled`

### DD Activity Monitoring

#### Excessive Inactive Toggles

**Threshold**: >5 inactive toggles in 30 minutes

```typescript
if (ddAssignment.inactiveToggles > 5) {
  const minutesSinceLastToggle =
    (Date.now() - ddAssignment.lastInactiveTimestamp) / (1000 * 60);

  if (minutesSinceLastToggle <= 30) {
    // Create admin alert
    createAdminAlert({
      type: 'ddInactiveToggle',
      message: `DD has toggled inactive ${ddAssignment.inactiveToggles} times in 30 min`
    });
  }
}
```

#### Prolonged Inactivity

**Threshold**: >15 minutes inactive during shift

```typescript
if (!ddAssignment.isActive && ddAssignment.lastInactiveTimestamp) {
  const minutesInactive =
    (Date.now() - ddAssignment.lastInactiveTimestamp) / (1000 * 60);

  if (minutesInactive > 15) {
    // Create admin alert
    createAdminAlert({
      type: 'ddProlongedInactive',
      message: `DD has been inactive for ${minutesInactive} minutes`
    });
  }
}
```

### Functions

- `calculateWaitTime(ddAssignment, rides): Promise<number>`
- `calculateWaitTimes(ddAssignments, rides): Promise<Record<string, number>>`
- `findBestDD(event, rides): Promise<DDAssignment | null>`
- `assignRide(ride, ddAssignment): Promise<void>`
- `checkInactiveToggles(ddAssignment): Promise<AdminAlert | null>`
- `checkProlongedInactivity(ddAssignment): Promise<AdminAlert | null>`
- `monitorDDActivity(ddAssignment): Promise<AdminAlert[]>`
- `toggleDDStatus(ddAssignment, isActive): Promise<AdminAlert[]>`
- `getDDStats(ddId, eventId): Promise<DDStats>`
- `resetInactiveToggles(eventId): Promise<void>`

## 3. ETA Service (`etaService.ts`)

### ETA Calculation

Uses **Google Maps Distance Matrix API** to calculate driving time.

**Called when**: DD marks "en route" (one-time calculation, NOT continuous tracking)

#### Algorithm

```typescript
// 1. Validate coordinates
if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
  throw new ETAError(ETAErrorType.INVALID_COORDINATE);
}

// 2. Call Google Maps Distance Matrix API
const url = `https://maps.googleapis.com/maps/api/distancematrix/json?
  origins=${from.latitude},${from.longitude}&
  destinations=${to.latitude},${to.longitude}&
  mode=driving&
  key=${GOOGLE_MAPS_API_KEY}`;

const response = await fetch(url);
const data = await response.json();

// 3. Extract duration
const durationSeconds = data.rows[0].elements[0].duration.value;

// 4. Convert to minutes (rounded up)
const etaMinutes = Math.ceil(durationSeconds / 60);
```

#### Coordinate Validation

```typescript
function isValidCoordinate(coord: Coordinate): boolean {
  return (
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180 &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude)
  );
}
```

#### Fallback Behavior

**Default fallback ETA**: `15 minutes`

```typescript
// If API key not configured
if (!GOOGLE_MAPS_API_KEY) {
  return DEFAULT_FALLBACK_ETA;
}

// If network error or API failure
try {
  return await calculateETA(from, to);
} catch (error) {
  console.warn('ETA calculation failed, using fallback');
  return DEFAULT_FALLBACK_ETA;
}
```

#### Error Types

- `INVALID_COORDINATE` - Coordinates out of valid range
- `ROUTE_NOT_FOUND` - No driving route available
- `NETWORK_ERROR` - Network request failed
- `INVALID_ADDRESS` - Geocoding failed
- `API_ERROR` - Google Maps API error

### Distance Calculation

**Haversine formula** for straight-line distance (not driving distance):

```typescript
function calculateDistance(from: Coordinate, to: Coordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

### Functions

- `calculateETA(from, to): Promise<number>`
- `calculateETAToAddress(from, toAddress): Promise<number>`
- `calculateETAWithFallback(from, to): Promise<number>`
- `calculateETAToAddressWithFallback(from, toAddress): Promise<number>`
- `calculateDistance(from, to): number`
- `metersToMiles(meters): number`
- `metersToKilometers(meters): number`
- `calculateBatchETAs(from, destinations): Promise<number[]>`

## Testing Strategy

### Unit Tests

Comprehensive unit tests verify that the TypeScript implementation matches the Swift implementation exactly.

**Test files:**
- `__tests__/rideQueueService.test.ts` - Priority algorithm tests
- `__tests__/ddAssignmentService.test.ts` - DD assignment tests
- `__tests__/etaService.test.ts` - ETA calculation tests
- `__tests__/businessLogic.test.ts` - Cross-service integration tests

**To run tests** (once Jest is configured):
```bash
npm test
```

### Test Coverage

**rideQueueService.test.ts**
- Same-chapter priority calculation (all class years)
- Cross-chapter priority calculation (class year ignored)
- Emergency priority (always 9999)
- Wait time priority increases
- Algorithm constants verification
- Edge cases (zero wait, long wait, fractional wait)
- Real-world scenarios

**ddAssignmentService.test.ts**
- Wait time calculation (0 rides, 1 ride, multiple rides)
- Best DD selection (shortest wait time wins)
- Ignore completed/cancelled rides
- DD activity monitoring (toggle alerts, prolonged inactivity)
- Constants verification
- Real-world scenarios (unbalanced load, single DD, all busy)

**etaService.test.ts**
- Coordinate validation (valid, invalid, edge cases)
- ETA calculation (rounding, exact minutes, fractions)
- Fallback behavior (network errors, invalid coords)
- Distance calculation (Haversine formula)
- Batch ETA calculation
- Real-world scenarios (campus rides, short trips, long trips)

## Key Principles

### 1. Correctness First
Get the logic right before optimizing. These algorithms are critical to fair ride distribution.

### 2. Handle Edge Cases
- No DDs available
- All DDs busy (>60 min wait)
- Emergency rides
- Cross-chapter events
- DD going inactive mid-shift

### 3. Atomic Operations
Use Firestore transactions for critical updates to prevent race conditions.

### 4. Clear Logging
Log all important state changes for debugging and audit trails.

### 5. Comprehensive Testing
Write tests for all algorithms to ensure exact match with Swift implementation.

## Matching Swift Implementation

### Verification Checklist

- [ ] Priority formula matches exactly
- [ ] Same constants (9999, 10.0, 0.5, 15.0)
- [ ] Same-chapter vs cross-chapter logic
- [ ] DD assignment uses shortest wait time
- [ ] Wait time calculation accurate
- [ ] Queue position is overall (not per-DD)
- [ ] ETA rounds up to nearest minute
- [ ] Fallback ETA is 15 minutes
- [ ] Activity monitoring thresholds match (5 toggles, 15 min)
- [ ] All edge cases handled

### Swift Reference Files

Refer to these Swift files for exact logic:
- `DDRideApp/ios/DDRide/Core/Services/RideQueueService.swift`
- `DDRideApp/ios/DDRide/Core/Services/DDAssignmentService.swift`
- `DDRideApp/ios/DDRide/Core/Services/ETAService.swift`

## Common Pitfalls

### 1. Round-Robin Assignment (WRONG)
```typescript
// ❌ WRONG - Do NOT do this
let currentDDIndex = 0;
const assignedDD = activeDDs[currentDDIndex++ % activeDDs.length];
```

**Correct approach**: Always assign to DD with shortest wait time.

### 2. Per-DD Queue Position (WRONG)
```typescript
// ❌ WRONG - Queue position should be overall
const ddRides = rides.filter(r => r.ddId === ride.ddId);
const position = ddRides.findIndex(r => r.id === ride.id) + 1;
```

**Correct approach**: Calculate position across ALL active rides.

### 3. Ignoring Cross-Chapter Logic (WRONG)
```typescript
// ❌ WRONG - Always using class year
return (classYear * 10) + (waitMinutes * 0.5);
```

**Correct approach**: Check `isSameChapter` and only use class year for same-chapter rides.

### 4. Not Rounding ETA Up (WRONG)
```typescript
// ❌ WRONG - Truncating to floor
const etaMinutes = Math.floor(durationSeconds / 60);
```

**Correct approach**: Round up with `Math.ceil()`.

## Performance Considerations

### 1. Batch Operations
When updating priorities for all rides, batch the updates:
```typescript
const batch = rides.map(ride => updateRide(ride));
await Promise.all(batch);
```

### 2. Cache Active Rides
Fetch active rides once and reuse:
```typescript
const rides = await fetchActiveRides(eventId);
const bestDD = await findBestDD(event, rides); // Pass cached rides
```

### 3. Limit Real-Time Updates
Don't update priorities on every render. Use periodic updates (e.g., every 30 seconds).

## Future Enhancements

### 1. Machine Learning ETA
Replace static 15-minute average with ML-based predictions using historical data.

### 2. Dynamic Priority Weights
Allow admins to adjust class year and wait time weights per event.

### 3. Advanced DD Load Balancing
Consider DD location, not just active ride count, when assigning rides.

## Support

For questions or issues with business logic:
1. Check this README
2. Review Swift reference files
3. Run unit tests to verify correctness
4. Contact the original iOS developer for clarification
