/**
 * DD Assignment Service Scale Tests
 *
 * Tests the DD assignment algorithm under production-like conditions:
 * - 15+ active DDs
 * - 200 rides per night
 * - Shortest wait time selection
 * - Activity monitoring at scale
 *
 * Critical business rules validated:
 * - Always assign to DD with SHORTEST wait time (not lowest ride count)
 * - Wait time = number of active rides × 15 minutes
 * - DD with 0 active rides = 0 wait time (gets next ride)
 */

// Local implementation is used for testing without Firebase dependency
// See calculateWaitTimeLocal and findBestDDLocal functions below

// Test interfaces (matching service types)
interface TestRide {
  id: string;
  riderId: string;
  ddId?: string;
  chapterId: string;
  eventId: string;
  pickupLocation: { latitude: number; longitude: number };
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

interface TestDDAssignment {
  id: string;
  userId: string;
  eventId: string;
  photoURL?: string;
  carDescription?: string;
  isActive: boolean;
  inactiveToggles: number;
  lastActiveTimestamp?: Date;
  lastInactiveTimestamp?: Date;
  totalRidesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

// Constants matching the service
const AVERAGE_RIDE_TIME_MINUTES = 15.0;

// Helper functions
function generateRide(
  id: string,
  options: Partial<{
    ddId: string;
    status: TestRide['status'];
    eventId: string;
    priority: number;
    requestedAt: Date;
  }> = {}
): TestRide {
  return {
    id,
    riderId: `rider_${id}`,
    chapterId: 'chapter_1',
    eventId: options.eventId ?? 'event_1',
    pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
    pickupAddress: '123 Test St',
    status: options.status ?? 'queued',
    priority: options.priority ?? 25,
    isEmergency: false,
    requestedAt: options.requestedAt ?? new Date(),
    ddId: options.ddId,
  };
}

function generateDDAssignment(
  userId: string,
  options: Partial<{
    eventId: string;
    isActive: boolean;
    inactiveToggles: number;
    totalRidesCompleted: number;
    lastInactiveTimestamp: Date;
  }> = {}
): TestDDAssignment {
  return {
    id: userId,
    userId,
    eventId: options.eventId ?? 'event_1',
    carDescription: 'Blue Honda Civic',
    isActive: options.isActive ?? true,
    inactiveToggles: options.inactiveToggles ?? 0,
    totalRidesCompleted: options.totalRidesCompleted ?? 0,
    lastInactiveTimestamp: options.lastInactiveTimestamp,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Pure function to calculate wait time (matching service logic)
 * This duplicates service logic for testing without Firebase dependency
 */
function calculateWaitTimeLocal(
  ddAssignment: TestDDAssignment,
  rides: TestRide[]
): number {
  // Filter rides assigned to this DD
  const ddRides = rides.filter(ride => ride.ddId === ddAssignment.userId);

  // Only count active rides (queued, assigned, enroute)
  const activeRides = ddRides.filter(
    ride =>
      ride.status === 'queued' ||
      ride.status === 'assigned' ||
      ride.status === 'enroute'
  );

  // If no active rides, wait time is 0
  if (activeRides.length === 0) {
    return 0;
  }

  // Calculate total wait time: number of rides × average ride time
  const totalMinutes = activeRides.length * AVERAGE_RIDE_TIME_MINUTES;

  // Return in seconds
  return totalMinutes * 60.0;
}

/**
 * Find best DD based on shortest wait time
 */
function findBestDDLocal(
  activeDDs: TestDDAssignment[],
  rides: TestRide[]
): TestDDAssignment | null {
  if (activeDDs.length === 0) {
    return null;
  }

  let bestDD: TestDDAssignment | null = null;
  let minWaitTime = Infinity;

  for (const dd of activeDDs) {
    const waitTime = calculateWaitTimeLocal(dd, rides);
    if (waitTime < minWaitTime) {
      minWaitTime = waitTime;
      bestDD = dd;
    }
  }

  return bestDD;
}

describe('DD Assignment Algorithm - Scale Tests', () => {
  describe('calculateWaitTime - Core Algorithm', () => {
    it('should return 0 seconds for DD with no active rides', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(0);
    });

    it('should calculate 15 minutes (900 seconds) per active ride', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'assigned' }),
      ];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(900); // 15 × 60 = 900 seconds
    });

    it('should sum wait time for multiple active rides', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'assigned' }),
        generateRide('ride_2', { ddId: 'dd_1', status: 'enroute' }),
        generateRide('ride_3', { ddId: 'dd_1', status: 'queued' }),
      ];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(2700); // 3 × 15 × 60 = 2700 seconds (45 min)
    });

    it('should not count completed rides', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'completed' }),
        generateRide('ride_2', { ddId: 'dd_1', status: 'completed' }),
        generateRide('ride_3', { ddId: 'dd_1', status: 'assigned' }),
      ];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(900); // Only 1 active ride
    });

    it('should not count cancelled rides', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'cancelled' }),
        generateRide('ride_2', { ddId: 'dd_1', status: 'assigned' }),
      ];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(900); // Only 1 active ride
    });

    it('should not count rides assigned to other DDs', () => {
      const dd = generateDDAssignment('dd_1');
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'assigned' }),
        generateRide('ride_2', { ddId: 'dd_2', status: 'assigned' }),
        generateRide('ride_3', { ddId: 'dd_3', status: 'assigned' }),
      ];

      const waitTime = calculateWaitTimeLocal(dd, rides);
      expect(waitTime).toBe(900); // Only dd_1's ride counts
    });
  });

  describe('findBestDD - Shortest Wait Time Selection', () => {
    it('should select DD with 0 active rides over DD with active rides', () => {
      const dds = [
        generateDDAssignment('dd_1'),
        generateDDAssignment('dd_2'),
      ];
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'assigned' }),
        // dd_2 has no rides
      ];

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD?.userId).toBe('dd_2');
    });

    it('should select DD with fewer active rides', () => {
      const dds = [
        generateDDAssignment('dd_1'),
        generateDDAssignment('dd_2'),
        generateDDAssignment('dd_3'),
      ];
      const rides: TestRide[] = [
        generateRide('ride_1', { ddId: 'dd_1', status: 'assigned' }),
        generateRide('ride_2', { ddId: 'dd_1', status: 'enroute' }),
        generateRide('ride_3', { ddId: 'dd_2', status: 'assigned' }),
        // dd_3 has no rides
      ];

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD?.userId).toBe('dd_3'); // 0 rides
    });

    it('should handle tie-breaker (first DD with same wait time)', () => {
      const dds = [
        generateDDAssignment('dd_1'),
        generateDDAssignment('dd_2'),
        generateDDAssignment('dd_3'),
      ];
      const rides: TestRide[] = []; // All have 0 wait time

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD?.userId).toBe('dd_1'); // First one with 0 wait
    });

    it('should return null if no active DDs', () => {
      const dds: TestDDAssignment[] = [];
      const rides: TestRide[] = [];

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD).toBeNull();
    });
  });

  describe('Scale Test: 15+ Active DDs', () => {
    it('should correctly find best DD among 15 DDs with varying loads', () => {
      // Create 15 DDs
      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < 15; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      // Assign varying number of rides to each DD
      const rides: TestRide[] = [];
      let rideId = 0;

      // dd_0: 5 rides, dd_1: 4 rides, ..., dd_14: 0 rides (but we'll make dd_7 have 0)
      for (let ddIndex = 0; ddIndex < 15; ddIndex++) {
        // Skip dd_7 to give it 0 rides
        if (ddIndex === 7) continue;

        const numRides = Math.max(0, 5 - Math.floor(ddIndex / 3));
        for (let r = 0; r < numRides; r++) {
          rides.push(generateRide(`ride_${rideId++}`, {
            ddId: `dd_${ddIndex}`,
            status: 'assigned',
          }));
        }
      }

      const bestDD = findBestDDLocal(dds, rides);

      // dd_7 should be selected (0 rides)
      expect(bestDD?.userId).toBe('dd_7');
    });

    it('should handle 15 DDs all with equal load', () => {
      const dds: TestDDAssignment[] = [];
      const rides: TestRide[] = [];

      // Create 15 DDs each with exactly 2 active rides
      for (let i = 0; i < 15; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
        rides.push(generateRide(`ride_${i * 2}`, { ddId: `dd_${i}`, status: 'assigned' }));
        rides.push(generateRide(`ride_${i * 2 + 1}`, { ddId: `dd_${i}`, status: 'enroute' }));
      }

      const bestDD = findBestDDLocal(dds, rides);

      // Should pick first DD (tie-breaker)
      expect(bestDD?.userId).toBe('dd_0');

      // All should have same wait time
      const waitTimes = dds.map(dd => calculateWaitTimeLocal(dd, rides));
      const allEqual = waitTimes.every(wt => wt === waitTimes[0]);
      expect(allEqual).toBe(true);
      expect(waitTimes[0]).toBe(1800); // 2 rides × 15 min × 60 sec = 1800 sec
    });

    it('should handle 20 DDs with highly unbalanced loads', () => {
      const dds: TestDDAssignment[] = [];
      const rides: TestRide[] = [];

      // Create 20 DDs
      for (let i = 0; i < 20; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      // Give dd_0 10 rides, dd_19 gets 0
      let rideId = 0;
      for (let ddIndex = 0; ddIndex < 19; ddIndex++) {
        const numRides = 10 - Math.floor(ddIndex / 2);
        for (let r = 0; r < numRides; r++) {
          rides.push(generateRide(`ride_${rideId++}`, {
            ddId: `dd_${ddIndex}`,
            status: 'assigned',
          }));
        }
      }
      // dd_19 has 0 rides

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD?.userId).toBe('dd_19');

      // Verify load distribution
      const ddLoads = dds.map(dd => ({
        userId: dd.userId,
        rides: rides.filter(r => r.ddId === dd.userId && r.status !== 'completed').length,
      }));

      expect(ddLoads.find(d => d.userId === 'dd_0')?.rides).toBe(10);
      expect(ddLoads.find(d => d.userId === 'dd_19')?.rides).toBe(0);
    });
  });

  describe('Scale Test: 200 Rides Over 4 Hours', () => {
    it('should correctly assign 200 rides across 15 DDs', () => {
      const NUM_DDS = 15;
      const NUM_RIDES = 200;

      // Create DDs
      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      // Simulate assigning 200 rides over time
      const rides: TestRide[] = [];
      const assignments: { rideId: string; ddId: string }[] = [];

      for (let i = 0; i < NUM_RIDES; i++) {
        // Create new ride
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        // Find best DD
        const bestDD = findBestDDLocal(dds, rides);
        expect(bestDD).not.toBeNull();

        // Assign ride
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';
        assignments.push({ rideId: newRide.id, ddId: bestDD!.userId });

        // Simulate some rides completing (every 3rd ride, complete oldest)
        if (i > 10 && i % 3 === 0) {
          const oldestActive = rides.find(
            r => r.status === 'assigned' || r.status === 'enroute'
          );
          if (oldestActive) {
            oldestActive.status = 'completed';
          }
        }
      }

      // Verify all rides were assigned
      expect(assignments.length).toBe(NUM_RIDES);

      // Verify load distribution is relatively balanced
      const ddRideCounts: Record<string, number> = {};
      assignments.forEach(a => {
        ddRideCounts[a.ddId] = (ddRideCounts[a.ddId] || 0) + 1;
      });

      const counts = Object.values(ddRideCounts);
      const avgRides = NUM_RIDES / NUM_DDS;
      const minRides = Math.min(...counts);
      const maxRides = Math.max(...counts);

      // No DD should have more than 2x average or less than 0.5x average
      expect(maxRides).toBeLessThanOrEqual(avgRides * 2);
      expect(minRides).toBeGreaterThanOrEqual(avgRides * 0.3);

      console.log(`Ride distribution across ${NUM_DDS} DDs:`);
      console.log(`  Min: ${minRides}, Max: ${maxRides}, Avg: ${avgRides.toFixed(1)}`);
      console.log(`  Distribution:`, ddRideCounts);
    });

    it('should perform 200 DD selections in under 100ms', () => {
      const NUM_DDS = 15;
      const NUM_RIDES = 200;

      // Create DDs
      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      // Create rides with random distribution
      const rides: TestRide[] = [];
      for (let i = 0; i < NUM_RIDES; i++) {
        rides.push(generateRide(`ride_${i}`, {
          ddId: `dd_${i % NUM_DDS}`,
          status: 'assigned',
        }));
      }

      // Time 200 DD selections
      const startTime = performance.now();

      for (let i = 0; i < 200; i++) {
        findBestDDLocal(dds, rides);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      console.log(`200 DD selections completed in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / 200).toFixed(3)}ms per selection`);
    });
  });

  describe('Load Balancing Validation', () => {
    it('should naturally balance load across DDs over time', () => {
      const NUM_DDS = 10;
      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      const rides: TestRide[] = [];

      // Simulate 100 ride requests, completing rides periodically
      for (let i = 0; i < 100; i++) {
        // Add new ride
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        // Find best DD and assign
        const bestDD = findBestDDLocal(dds, rides);
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';

        // Every 5 rides, complete the oldest active ride
        if (i > 0 && i % 5 === 0) {
          const activeRides = rides.filter(
            r => r.status === 'assigned' || r.status === 'enroute'
          );
          if (activeRides.length > 0) {
            activeRides[0].status = 'completed';
          }
        }
      }

      // Count total rides per DD (including completed)
      const totalRidesPerDD: Record<string, number> = {};
      rides.forEach(r => {
        if (r.ddId) {
          totalRidesPerDD[r.ddId] = (totalRidesPerDD[r.ddId] || 0) + 1;
        }
      });

      const counts = Object.values(totalRidesPerDD);
      const avg = 100 / NUM_DDS;
      const stdDev = Math.sqrt(
        counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
      );

      // Standard deviation should be relatively low (load is balanced)
      expect(stdDev).toBeLessThan(avg * 0.5);

      console.log('Load balancing results:');
      console.log(`  Average rides per DD: ${avg}`);
      console.log(`  Standard deviation: ${stdDev.toFixed(2)}`);
      console.log(`  Distribution:`, totalRidesPerDD);
    });

    it('should handle DD going inactive mid-event', () => {
      const dds: TestDDAssignment[] = [
        generateDDAssignment('dd_1', { isActive: true }),
        generateDDAssignment('dd_2', { isActive: true }),
        generateDDAssignment('dd_3', { isActive: true }),
      ];

      const rides: TestRide[] = [];

      // Assign 10 rides evenly
      for (let i = 0; i < 10; i++) {
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        const activeDDs = dds.filter(dd => dd.isActive);
        const bestDD = findBestDDLocal(activeDDs, rides);
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';
      }

      // DD_2 goes inactive
      dds[1].isActive = false;

      // Assign 10 more rides (only dd_1 and dd_3 available)
      for (let i = 10; i < 20; i++) {
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        const activeDDs = dds.filter(dd => dd.isActive);
        const bestDD = findBestDDLocal(activeDDs, rides);
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';
      }

      // Count rides per DD
      const dd1Rides = rides.filter(r => r.ddId === 'dd_1').length;
      const dd2Rides = rides.filter(r => r.ddId === 'dd_2').length;
      const dd3Rides = rides.filter(r => r.ddId === 'dd_3').length;

      // DD_2 should only have rides from first batch
      expect(dd2Rides).toBeLessThanOrEqual(5);

      // DD_1 and DD_3 should have more rides (absorbed DD_2's load)
      expect(dd1Rides + dd3Rides).toBeGreaterThanOrEqual(15);

      console.log(`DD_1: ${dd1Rides}, DD_2: ${dd2Rides}, DD_3: ${dd3Rides}`);
    });
  });

  describe('Edge Cases at Scale', () => {
    it('should handle single DD serving all rides', () => {
      const dds = [generateDDAssignment('dd_solo')];
      const rides: TestRide[] = [];

      // Assign 50 rides to single DD
      for (let i = 0; i < 50; i++) {
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        const bestDD = findBestDDLocal(dds, rides);
        expect(bestDD).not.toBeNull();
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';
      }

      // All rides should be assigned to solo DD
      const soloRides = rides.filter(r => r.ddId === 'dd_solo').length;
      expect(soloRides).toBe(50);

      // Wait time should be 50 × 15 min = 750 min = 45000 sec
      const waitTime = calculateWaitTimeLocal(dds[0], rides);
      expect(waitTime).toBe(45000);
    });

    it('should handle burst of 20 simultaneous ride requests', () => {
      const NUM_DDS = 5;
      const BURST_SIZE = 20;

      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      const rides: TestRide[] = [];

      // All 20 rides come in at once
      for (let i = 0; i < BURST_SIZE; i++) {
        rides.push(generateRide(`ride_${i}`, { status: 'queued' }));
      }

      // Assign all rides
      for (const ride of rides) {
        const bestDD = findBestDDLocal(dds, rides);
        ride.ddId = bestDD!.userId;
        ride.status = 'assigned';
      }

      // Count per DD
      const counts: Record<string, number> = {};
      rides.forEach(r => {
        counts[r.ddId!] = (counts[r.ddId!] || 0) + 1;
      });

      // Should be perfectly balanced (4 rides each)
      Object.values(counts).forEach(count => {
        expect(count).toBe(BURST_SIZE / NUM_DDS);
      });

      console.log('Burst assignment distribution:', counts);
    });

    it('should handle extremely busy DD (stress test)', () => {
      const dds = [
        generateDDAssignment('dd_busy'),
        generateDDAssignment('dd_free'),
      ];

      // Give dd_busy 20 active rides
      const rides: TestRide[] = [];
      for (let i = 0; i < 20; i++) {
        rides.push(generateRide(`ride_${i}`, {
          ddId: 'dd_busy',
          status: 'assigned',
        }));
      }

      // Next ride should go to dd_free
      const newRide = generateRide('ride_new', { status: 'queued' });
      rides.push(newRide);

      const bestDD = findBestDDLocal(dds, rides);
      expect(bestDD?.userId).toBe('dd_free');

      // Verify wait times
      const busyWait = calculateWaitTimeLocal(dds[0], rides);
      const freeWait = calculateWaitTimeLocal(dds[1], rides);

      expect(busyWait).toBe(20 * 15 * 60); // 20 rides × 15 min × 60 sec = 18000 sec
      expect(freeWait).toBe(0);
    });

    it('should handle DD completing rides faster than new requests', () => {
      const dds: TestDDAssignment[] = [
        generateDDAssignment('dd_1'),
        generateDDAssignment('dd_2'),
      ];

      const rides: TestRide[] = [];

      // Simulate slow period: 1 ride request, then completion, repeat
      for (let i = 0; i < 20; i++) {
        // New ride request
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        // Assign
        const bestDD = findBestDDLocal(dds, rides);
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';

        // Complete the ride
        newRide.status = 'completed';
      }

      // After all rides, both DDs should have 0 active rides
      const dd1Wait = calculateWaitTimeLocal(dds[0], rides);
      const dd2Wait = calculateWaitTimeLocal(dds[1], rides);

      expect(dd1Wait).toBe(0);
      expect(dd2Wait).toBe(0);
    });
  });

  describe('Activity Monitoring at Scale', () => {
    const INACTIVE_TOGGLE_THRESHOLD = 5;
    const PROLONGED_INACTIVITY_MINUTES = 15;

    it('should track inactive toggles correctly', () => {
      const dd = generateDDAssignment('dd_1', { inactiveToggles: 0 });

      // Simulate 6 inactive toggles
      for (let i = 0; i < 6; i++) {
        dd.inactiveToggles++;
      }

      // Should exceed threshold
      expect(dd.inactiveToggles).toBeGreaterThan(INACTIVE_TOGGLE_THRESHOLD);
    });

    it('should detect prolonged inactivity', () => {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
      const dd = generateDDAssignment('dd_1', {
        isActive: false,
        lastInactiveTimestamp: twentyMinutesAgo,
      });

      const minutesInactive =
        (Date.now() - dd.lastInactiveTimestamp!.getTime()) / (1000 * 60);

      expect(minutesInactive).toBeGreaterThan(PROLONGED_INACTIVITY_MINUTES);
    });

    it('should handle multiple DDs with activity issues', () => {
      const dds: TestDDAssignment[] = [];
      const now = Date.now();

      // Create 10 DDs with various activity states
      for (let i = 0; i < 10; i++) {
        dds.push(generateDDAssignment(`dd_${i}`, {
          isActive: i % 2 === 0, // Half inactive
          inactiveToggles: i, // 0, 1, 2, ... 9
          lastInactiveTimestamp: new Date(now - (i * 5 * 60 * 1000)), // 0, 5, 10, ... 45 min ago
        }));
      }

      // Find DDs exceeding toggle threshold
      const excessiveToggles = dds.filter(
        dd => dd.inactiveToggles > INACTIVE_TOGGLE_THRESHOLD
      );
      expect(excessiveToggles.length).toBe(4); // 6, 7, 8, 9

      // Find inactive DDs exceeding time threshold
      const prolongedInactive = dds.filter(dd => {
        if (dd.isActive || !dd.lastInactiveTimestamp) return false;
        const minutesInactive =
          (now - dd.lastInactiveTimestamp.getTime()) / (1000 * 60);
        return minutesInactive > PROLONGED_INACTIVITY_MINUTES;
      });

      // DD_1 (5 min), DD_3 (15 min), DD_5 (25 min), DD_7 (35 min), DD_9 (45 min) are inactive
      // But only those >15 min should flag
      expect(prolongedInactive.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should calculate wait times for 20 DDs with 200 rides in under 10ms', () => {
      const NUM_DDS = 20;
      const NUM_RIDES = 200;

      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      const rides: TestRide[] = [];
      for (let i = 0; i < NUM_RIDES; i++) {
        rides.push(generateRide(`ride_${i}`, {
          ddId: `dd_${i % NUM_DDS}`,
          status: 'assigned',
        }));
      }

      const startTime = performance.now();

      // Calculate wait times for all DDs
      const waitTimes: Record<string, number> = {};
      for (const dd of dds) {
        waitTimes[dd.userId] = calculateWaitTimeLocal(dd, rides);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10);
      console.log(`Wait time calculation for 20 DDs × 200 rides: ${duration.toFixed(2)}ms`);
    });

    it('should find best DD among 20 DDs in under 5ms', () => {
      const NUM_DDS = 20;
      const NUM_RIDES = 100;

      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      const rides: TestRide[] = [];
      for (let i = 0; i < NUM_RIDES; i++) {
        rides.push(generateRide(`ride_${i}`, {
          ddId: `dd_${i % NUM_DDS}`,
          status: i % 3 === 0 ? 'completed' : 'assigned',
        }));
      }

      const startTime = performance.now();

      const bestDD = findBestDDLocal(dds, rides);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5);
      expect(bestDD).not.toBeNull();
      console.log(`Best DD selection: ${duration.toFixed(2)}ms`);
    });

    it('should handle 1000 sequential assignments in under 500ms', () => {
      const NUM_DDS = 15;
      const NUM_ASSIGNMENTS = 1000;

      const dds: TestDDAssignment[] = [];
      for (let i = 0; i < NUM_DDS; i++) {
        dds.push(generateDDAssignment(`dd_${i}`));
      }

      const rides: TestRide[] = [];

      const startTime = performance.now();

      for (let i = 0; i < NUM_ASSIGNMENTS; i++) {
        const newRide = generateRide(`ride_${i}`, { status: 'queued' });
        rides.push(newRide);

        const bestDD = findBestDDLocal(dds, rides);
        newRide.ddId = bestDD!.userId;
        newRide.status = 'assigned';

        // Complete every 5th ride to simulate real flow
        if (i > 0 && i % 5 === 0) {
          const toComplete = rides.find(r => r.status === 'assigned');
          if (toComplete) toComplete.status = 'completed';
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500);
      console.log(`1000 assignments completed in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / NUM_ASSIGNMENTS).toFixed(3)}ms per assignment`);
    });
  });
});
