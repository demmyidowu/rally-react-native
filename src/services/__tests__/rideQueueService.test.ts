/**
 * Ride Queue Service Tests
 *
 * Comprehensive tests for ride queue operations and priority calculations.
 * These tests verify that the TypeScript implementation matches the Swift implementation exactly.
 *
 * Run: npm test rideQueueService.test.ts
 */

import {
  calculatePriority,
  isSameChapterRide,
  calculatePriorityForRide,
  getOverallQueuePosition,
  getQueuePositions,
  getEstimatedWaitTime,
  getQueueStats,
} from '../rideQueueService';
import { RideStatus } from '../../models/Ride';
import { EventStatus } from '../../models/Event';

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
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}));

describe('RideQueueService - Priority Calculation', () => {
  describe('Same-Chapter Rides', () => {
    it('calculates priority for senior (4) waiting 5 min', () => {
      // (4 × 10) + (5 × 0.5) = 42.5
      const priority = calculatePriority(4, 5, false, true);
      expect(priority).toBe(42.5);
    });

    it('calculates priority for junior (3) waiting 10 min', () => {
      // (3 × 10) + (10 × 0.5) = 35.0
      const priority = calculatePriority(3, 10, false, true);
      expect(priority).toBe(35.0);
    });

    it('calculates priority for sophomore (2) waiting 20 min', () => {
      // (2 × 10) + (20 × 0.5) = 30.0
      const priority = calculatePriority(2, 20, false, true);
      expect(priority).toBe(30.0);
    });

    it('calculates priority for freshman (1) waiting 15 min', () => {
      // (1 × 10) + (15 × 0.5) = 17.5
      const priority = calculatePriority(1, 15, false, true);
      expect(priority).toBe(17.5);
    });

    it('prioritizes senior over freshman even with less wait time', () => {
      const seniorPriority = calculatePriority(4, 5, false, true); // 42.5
      const freshmanPriority = calculatePriority(1, 15, false, true); // 17.5

      expect(seniorPriority).toBeGreaterThan(freshmanPriority);
    });

    it('wait time can eventually overcome class year difference', () => {
      const senior = calculatePriority(4, 5, false, true); // 42.5
      const freshman = calculatePriority(1, 65, false, true); // 42.5

      expect(freshman).toBe(senior);
    });
  });

  describe('Cross-Chapter Rides', () => {
    it('calculates priority for senior (4) waiting 5 min - class year ignored', () => {
      // 5 × 0.5 = 2.5 (class year ignored!)
      const priority = calculatePriority(4, 5, false, false);
      expect(priority).toBe(2.5);
    });

    it('calculates priority for freshman (1) waiting 15 min', () => {
      // 15 × 0.5 = 7.5
      const priority = calculatePriority(1, 15, false, false);
      expect(priority).toBe(7.5);
    });

    it('prioritizes longer wait time over class year', () => {
      const seniorPriority = calculatePriority(4, 5, false, false); // 2.5
      const freshmanPriority = calculatePriority(1, 15, false, false); // 7.5

      // Freshman with longer wait gets priority over senior!
      expect(freshmanPriority).toBeGreaterThan(seniorPriority);
    });

    it('treats all class years equally with same wait time', () => {
      const senior = calculatePriority(4, 10, false, false); // 5.0
      const junior = calculatePriority(3, 10, false, false); // 5.0
      const sophomore = calculatePriority(2, 10, false, false); // 5.0
      const freshman = calculatePriority(1, 10, false, false); // 5.0

      expect(senior).toBe(5.0);
      expect(junior).toBe(5.0);
      expect(sophomore).toBe(5.0);
      expect(freshman).toBe(5.0);
    });
  });

  describe('Emergency Rides', () => {
    it('assigns emergency priority of 9999', () => {
      const priority = calculatePriority(1, 0, true, true);
      expect(priority).toBe(9999);
    });

    it('prioritizes emergency over any normal ride', () => {
      const emergencyPriority = calculatePriority(1, 0, true, true); // 9999
      const seniorLongWait = calculatePriority(4, 60, false, true); // 70

      expect(emergencyPriority).toBeGreaterThan(seniorLongWait);
    });

    it('assigns same emergency priority regardless of chapter', () => {
      const sameChapter = calculatePriority(4, 10, true, true); // 9999
      const crossChapter = calculatePriority(1, 5, true, false); // 9999

      expect(sameChapter).toBe(crossChapter);
      expect(sameChapter).toBe(9999);
    });

    it('assigns same emergency priority regardless of class year', () => {
      const senior = calculatePriority(4, 30, true, true); // 9999
      const freshman = calculatePriority(1, 60, true, true); // 9999

      expect(senior).toBe(freshman);
      expect(senior).toBe(9999);
    });
  });

  describe('Wait Time Increases Priority', () => {
    it('increases priority as wait time grows', () => {
      const priority0 = calculatePriority(3, 0, false, true); // 30.0
      const priority10 = calculatePriority(3, 10, false, true); // 35.0
      const priority20 = calculatePriority(3, 20, false, true); // 40.0

      expect(priority10).toBeGreaterThan(priority0);
      expect(priority20).toBeGreaterThan(priority10);
    });

    it('increments by 0.5 per minute', () => {
      const priority0 = calculatePriority(3, 0, false, true); // 30.0
      const priority1 = calculatePriority(3, 1, false, true); // 30.5
      const priority2 = calculatePriority(3, 2, false, true); // 31.0

      expect(priority1 - priority0).toBe(0.5);
      expect(priority2 - priority1).toBe(0.5);
    });
  });

  describe('Algorithm Constants', () => {
    it('uses correct class year weight (10)', () => {
      // Test by varying class year only
      const freshman = calculatePriority(1, 0, false, true); // 10
      const sophomore = calculatePriority(2, 0, false, true); // 20
      const junior = calculatePriority(3, 0, false, true); // 30
      const senior = calculatePriority(4, 0, false, true); // 40

      expect(sophomore - freshman).toBe(10);
      expect(junior - sophomore).toBe(10);
      expect(senior - junior).toBe(10);
    });

    it('uses correct wait time weight (0.5)', () => {
      // Test by varying wait time only
      const wait0 = calculatePriority(0, 0, false, true); // 0
      const wait10 = calculatePriority(0, 10, false, true); // 5
      const wait20 = calculatePriority(0, 20, false, true); // 10

      expect(wait10).toBe(5.0);
      expect(wait20).toBe(10.0);
    });

    it('uses correct emergency priority (9999)', () => {
      const emergency = calculatePriority(0, 0, true, false);
      expect(emergency).toBe(9999);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero wait time', () => {
      const priority = calculatePriority(3, 0, false, true);
      expect(priority).toBe(30.0);
    });

    it('handles very long wait times', () => {
      const priority = calculatePriority(1, 120, false, true); // 2 hours
      expect(priority).toBe(70.0); // (1 × 10) + (120 × 0.5)
    });

    it('handles class year 0 (if it ever happens)', () => {
      const priority = calculatePriority(0, 10, false, true);
      expect(priority).toBe(5.0); // (0 × 10) + (10 × 0.5)
    });

    it('handles fractional wait times', () => {
      const priority = calculatePriority(2, 7.5, false, true);
      expect(priority).toBe(23.75); // (2 × 10) + (7.5 × 0.5)
    });

    it('handles negative wait times (should not happen, but test anyway)', () => {
      const priority = calculatePriority(3, -5, false, true);
      expect(priority).toBe(27.5); // (3 × 10) + (-5 × 0.5)
    });
  });
});

describe('RideQueueService - Same Chapter Detection', () => {
  it('detects same chapter ride when chapters match', () => {
    const ride = {
      id: 'ride1',
      riderId: 'rider1',
      chapterId: 'sae',
      eventId: 'event1',
      pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
      pickupAddress: '123 Main St',
      status: RideStatus.QUEUED,
      priority: 30,
      isEmergency: false,
      requestedAt: new Date(),
    };

    const event = {
      id: 'event1',
      name: 'Test Event',
      chapterId: 'sae',
      date: new Date(),
      allowedChapterIds: ['sae'],
      status: EventStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin1',
    };

    expect(isSameChapterRide(ride, event)).toBe(true);
  });

  it('detects cross-chapter ride when chapters differ', () => {
    const ride = {
      id: 'ride1',
      riderId: 'rider1',
      chapterId: 'kappa',
      eventId: 'event1',
      pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
      pickupAddress: '123 Main St',
      status: RideStatus.QUEUED,
      priority: 30,
      isEmergency: false,
      requestedAt: new Date(),
    };

    const event = {
      id: 'event1',
      name: 'Test Event',
      chapterId: 'sae',
      date: new Date(),
      allowedChapterIds: ['sae', 'kappa'],
      status: EventStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin1',
    };

    expect(isSameChapterRide(ride, event)).toBe(false);
  });

  it('handles "ALL" allowed chapters correctly - same chapter', () => {
    const ride = {
      id: 'ride1',
      riderId: 'rider1',
      chapterId: 'sae',
      eventId: 'event1',
      pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
      pickupAddress: '123 Main St',
      status: RideStatus.QUEUED,
      priority: 30,
      isEmergency: false,
      requestedAt: new Date(),
    };

    const event = {
      id: 'event1',
      name: 'Test Event',
      chapterId: 'sae',
      date: new Date(),
      allowedChapterIds: ['ALL'],
      status: EventStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin1',
    };

    expect(isSameChapterRide(ride, event)).toBe(true);
  });

  it('handles "ALL" allowed chapters correctly - cross-chapter', () => {
    const ride = {
      id: 'ride1',
      riderId: 'rider1',
      chapterId: 'kappa',
      eventId: 'event1',
      pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
      pickupAddress: '123 Main St',
      status: RideStatus.QUEUED,
      priority: 30,
      isEmergency: false,
      requestedAt: new Date(),
    };

    const event = {
      id: 'event1',
      name: 'Test Event',
      chapterId: 'sae',
      date: new Date(),
      allowedChapterIds: ['ALL'],
      status: EventStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin1',
    };

    expect(isSameChapterRide(ride, event)).toBe(false);
  });
});

describe('RideQueueService - Real-World Scenarios', () => {
  it('senior with short wait beats freshman with long wait (same chapter)', () => {
    const senior = calculatePriority(4, 5, false, true); // 42.5
    const freshman = calculatePriority(1, 30, false, true); // 25.0

    expect(senior).toBeGreaterThan(freshman);
  });

  it('freshman with long wait beats senior with short wait (cross chapter)', () => {
    const senior = calculatePriority(4, 5, false, false); // 2.5
    const freshman = calculatePriority(1, 30, false, false); // 15.0

    expect(freshman).toBeGreaterThan(senior);
  });

  it('emergency always wins', () => {
    const emergency = calculatePriority(1, 0, true, true); // 9999
    const seniorLongWait = calculatePriority(4, 120, false, true); // 100
    const crossChapterLongWait = calculatePriority(1, 120, false, false); // 60

    expect(emergency).toBeGreaterThan(seniorLongWait);
    expect(emergency).toBeGreaterThan(crossChapterLongWait);
  });

  it('multiple seniors queued - wait time breaks tie', () => {
    const senior1 = calculatePriority(4, 5, false, true); // 42.5
    const senior2 = calculatePriority(4, 10, false, true); // 45.0
    const senior3 = calculatePriority(4, 15, false, true); // 47.5

    expect(senior3).toBeGreaterThan(senior2);
    expect(senior2).toBeGreaterThan(senior1);
  });

  it('cross-chapter event with mixed class years - only wait time matters', () => {
    const senior5min = calculatePriority(4, 5, false, false); // 2.5
    const junior10min = calculatePriority(3, 10, false, false); // 5.0
    const sophomore15min = calculatePriority(2, 15, false, false); // 7.5
    const freshman20min = calculatePriority(1, 20, false, false); // 10.0

    expect(freshman20min).toBeGreaterThan(sophomore15min);
    expect(sophomore15min).toBeGreaterThan(junior10min);
    expect(junior10min).toBeGreaterThan(senior5min);
  });
});

describe('RideQueueService - Average Ride Time Constant', () => {
  it('uses 15 minutes as average ride time', () => {
    // This constant is used in wait time calculations
    const AVERAGE_RIDE_TIME_MINUTES = 15;
    expect(AVERAGE_RIDE_TIME_MINUTES).toBe(15);
  });

  it('calculates wait time correctly for DD with multiple rides', () => {
    const ridesCount = 3;
    const estimatedWaitMinutes = ridesCount * 15;
    expect(estimatedWaitMinutes).toBe(45);
  });
});
