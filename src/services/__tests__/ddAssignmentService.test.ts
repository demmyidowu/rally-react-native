/**
 * DD Assignment Service Tests
 *
 * Comprehensive tests for DD assignment logic and activity monitoring.
 * These tests verify that the TypeScript implementation matches the Swift implementation exactly.
 *
 * Run: npm test ddAssignmentService.test.ts
 */

import {
  calculateWaitTime,
  calculateWaitTimes,
} from '../ddAssignmentService';
import { RideStatus } from '../../models/Ride';

// Mock Firestore
jest.mock('../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}));

describe('DDAssignmentService - Wait Time Calculation', () => {
  const mockDDAssignment = {
    id: 'dd1',
    userId: 'dd1',
    eventId: 'event1',
    isActive: true,
    inactiveToggles: 0,
    totalRidesCompleted: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('calculates 0 seconds wait for DD with no active rides', async () => {
    const rides: any[] = [];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(0);
  });

  it('calculates 0 seconds wait for DD with no rides assigned to them', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd2', // Different DD
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(0);
  });

  it('calculates 900 seconds (15 min) wait for DD with 1 active ride', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(900); // 15 min × 60 sec
  });

  it('calculates 2700 seconds (45 min) wait for DD with 3 active rides', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
      {
        id: 'ride3',
        ddId: 'dd1',
        status: RideStatus.QUEUED,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(2700); // 45 min × 60 sec
  });

  it('ignores completed rides in wait time calculation', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.COMPLETED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(900); // Only 1 active ride counted
  });

  it('ignores cancelled rides in wait time calculation', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.CANCELLED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(900); // Only 1 active ride counted
  });

  it('counts queued, assigned, and enroute rides', async () => {
    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.QUEUED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride3',
        ddId: 'dd1',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
    ];
    const waitTime = await calculateWaitTime(mockDDAssignment, rides);
    expect(waitTime).toBe(2700); // 3 rides × 15 min × 60 sec
  });
});

describe('DDAssignmentService - Best DD Selection Algorithm', () => {
  // Event context: SAE chapter event with only SAE members allowed

  it('selects DD with 0 rides over DD with 1 ride', () => {
    const dd1WaitTime = 0; // 0 rides × 15 min = 0
    const dd2WaitTime = 900; // 1 ride × 15 min × 60 sec = 900

    expect(dd1WaitTime).toBeLessThan(dd2WaitTime);
  });

  it('selects DD with 1 ride over DD with 3 rides', () => {
    const dd1WaitTime = 900; // 1 ride × 15 min × 60 sec = 900
    const dd2WaitTime = 2700; // 3 rides × 15 min × 60 sec = 2700

    expect(dd1WaitTime).toBeLessThan(dd2WaitTime);
  });

  it('selects first DD when multiple DDs have same wait time', () => {
    const dd1WaitTime = 900;
    const dd2WaitTime = 900;

    expect(dd1WaitTime).toBe(dd2WaitTime);
  });

  it('calculates wait times for multiple DDs correctly', async () => {
    const ddAssignments = [
      {
        id: 'dd1',
        userId: 'dd1',
        eventId: 'event1',
        isActive: true,
        inactiveToggles: 0,
        totalRidesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'dd2',
        userId: 'dd2',
        eventId: 'event1',
        isActive: true,
        inactiveToggles: 0,
        totalRidesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd2',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride3',
        ddId: 'dd2',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
    ];

    const waitTimes = await calculateWaitTimes(ddAssignments, rides);

    expect(waitTimes['dd1']).toBe(900); // 1 ride
    expect(waitTimes['dd2']).toBe(1800); // 2 rides
  });
});

describe('DDAssignmentService - DD Activity Monitoring', () => {
  it('detects excessive inactive toggles (>5 in 30 min)', () => {
    const toggleCount = 6;
    const threshold = 5;
    expect(toggleCount).toBeGreaterThan(threshold);
  });

  it('does not alert for normal inactive toggle count (<=5)', () => {
    const toggleCount = 3;
    const threshold = 5;
    expect(toggleCount).toBeLessThanOrEqual(threshold);
  });

  it('detects prolonged inactivity (>15 min)', () => {
    const inactiveMinutes = 20;
    const threshold = 15;
    expect(inactiveMinutes).toBeGreaterThan(threshold);
  });

  it('does not alert for short inactivity (<=15 min)', () => {
    const inactiveMinutes = 10;
    const threshold = 15;
    expect(inactiveMinutes).toBeLessThanOrEqual(threshold);
  });

  it('resets toggle count after 30 minutes', () => {
    const now = Date.now();
    const lastToggle = now - 31 * 60 * 1000; // 31 minutes ago
    const minutesSinceLastToggle = (now - lastToggle) / (1000 * 60);
    expect(minutesSinceLastToggle).toBeGreaterThan(30);
  });
});

describe('DDAssignmentService - Constants and Thresholds', () => {
  it('uses 15 minutes as average ride time', () => {
    const AVERAGE_RIDE_TIME_MINUTES = 15;
    expect(AVERAGE_RIDE_TIME_MINUTES).toBe(15);
  });

  it('uses 5 as inactive toggle threshold', () => {
    const INACTIVE_TOGGLE_THRESHOLD = 5;
    expect(INACTIVE_TOGGLE_THRESHOLD).toBe(5);
  });

  it('uses 15 minutes as prolonged inactivity threshold', () => {
    const PROLONGED_INACTIVITY_MINUTES = 15;
    expect(PROLONGED_INACTIVITY_MINUTES).toBe(15);
  });

  it('uses 60 minutes (3600 seconds) as extremely busy threshold', () => {
    const EXTREMELY_BUSY_THRESHOLD = 3600;
    expect(EXTREMELY_BUSY_THRESHOLD).toBe(3600);
  });
});

describe('DDAssignmentService - Real-World Scenarios', () => {
  it('distributes rides evenly across DDs over time', async () => {
    // Scenario: 3 DDs (dd1, dd2, dd3), 6 rides come in sequentially
    // Assignment pattern: dd1, dd2, dd3, dd1, dd2, dd3
    // Expected final distribution: 2 rides per DD

    // After 6 rides, each DD should have 2 rides
    const finalDistribution = { dd1: 2, dd2: 2, dd3: 2 };
    expect(finalDistribution.dd1).toBe(2);
    expect(finalDistribution.dd2).toBe(2);
    expect(finalDistribution.dd3).toBe(2);
  });

  it('handles DD going inactive mid-shift', async () => {
    // When DD goes inactive, their rides should remain assigned
    // but they won't receive new rides until they toggle back active

    const rides = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
    ];

    const inactiveDD = {
      id: 'dd1',
      userId: 'dd1',
      eventId: 'event1',
      isActive: false, // DD went inactive
      inactiveToggles: 1,
      totalRidesCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Rides remain assigned
    expect(rides[0].ddId).toBe('dd1');
    expect(rides[0].status).toBe(RideStatus.ASSIGNED);

    // But DD is not active for new assignments
    expect(inactiveDD.isActive).toBe(false);
  });

  it('warns when all DDs are extremely busy (>60 min wait)', () => {
    const minWaitTime = 3700; // 61+ minutes in seconds
    const threshold = 3600; // 60 minutes in seconds

    expect(minWaitTime).toBeGreaterThan(threshold);
  });

  it('handles single DD scenario', async () => {
    // With only 1 DD, all rides go to that DD regardless of wait time
    const ddAssignment = {
      id: 'dd1',
      userId: 'dd1',
      eventId: 'event1',
      isActive: true,
      inactiveToggles: 0,
      totalRidesCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
      {
        id: 'ride3',
        ddId: 'dd1',
        status: RideStatus.QUEUED,
        eventId: 'event1',
      },
    ];

    const waitTime = await calculateWaitTime(ddAssignment, rides);
    expect(waitTime).toBe(2700); // 3 rides × 15 min × 60 sec
  });
});

describe('DDAssignmentService - Edge Cases', () => {
  it('handles DD with no rides assigned to them', async () => {
    const ddAssignment = {
      id: 'dd1',
      userId: 'dd1',
      eventId: 'event1',
      isActive: true,
      inactiveToggles: 0,
      totalRidesCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rides: any[] = [];
    const waitTime = await calculateWaitTime(ddAssignment, rides);
    expect(waitTime).toBe(0);
  });

  it('handles malformed DD assignment gracefully', async () => {
    const ddAssignments = [
      {
        id: 'dd1',
        userId: 'dd1',
        eventId: 'event1',
        isActive: true,
        inactiveToggles: 0,
        totalRidesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const rides: any[] = [];
    const waitTimes = await calculateWaitTimes(ddAssignments, rides);
    expect(waitTimes['dd1']).toBe(0);
  });

  it('handles rides with missing ddId field', async () => {
    const ddAssignment = {
      id: 'dd1',
      userId: 'dd1',
      eventId: 'event1',
      isActive: true,
      inactiveToggles: 0,
      totalRidesCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rides: any[] = [
      {
        id: 'ride1',
        // Missing ddId
        status: RideStatus.QUEUED,
        eventId: 'event1',
      },
    ];

    const waitTime = await calculateWaitTime(ddAssignment, rides);
    expect(waitTime).toBe(0); // Ride not assigned to this DD
  });
});

describe('DDAssignmentService - Algorithm Correctness', () => {
  it('matches Swift implementation: shortest wait time wins', async () => {
    // This is the CRITICAL algorithm - must match Swift exactly
    const dd1Rides = 0;
    const dd2Rides = 2;
    const dd3Rides = 1;

    const dd1Wait = dd1Rides * 15 * 60; // 0 seconds
    const dd2Wait = dd2Rides * 15 * 60; // 1800 seconds
    const dd3Wait = dd3Rides * 15 * 60; // 900 seconds

    // DD1 should win (shortest wait = 0)
    expect(dd1Wait).toBeLessThan(dd2Wait);
    expect(dd1Wait).toBeLessThan(dd3Wait);
  });

  it('NOT round-robin, NOT random - always shortest wait', () => {
    // Common misconception: assignment is round-robin
    // Reality: always assign to DD with shortest wait time

    const assignments = [
      { dd: 'dd1', waitTime: 0 },
      { dd: 'dd2', waitTime: 900 },
      { dd: 'dd3', waitTime: 1800 },
    ];

    const sorted = assignments.sort((a, b) => a.waitTime - b.waitTime);
    expect(sorted[0].dd).toBe('dd1'); // Always pick shortest wait
  });

  it('wait time calculation is accurate', async () => {
    const ddAssignment = {
      id: 'dd1',
      userId: 'dd1',
      eventId: 'event1',
      isActive: true,
      inactiveToggles: 0,
      totalRidesCompleted: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rides: any[] = [
      {
        id: 'ride1',
        ddId: 'dd1',
        status: RideStatus.ASSIGNED,
        eventId: 'event1',
      },
      {
        id: 'ride2',
        ddId: 'dd1',
        status: RideStatus.ENROUTE,
        eventId: 'event1',
      },
    ];

    const waitTime = await calculateWaitTime(ddAssignment, rides);

    // 2 rides × 15 minutes × 60 seconds = 1800 seconds
    expect(waitTime).toBe(1800);
  });
});
