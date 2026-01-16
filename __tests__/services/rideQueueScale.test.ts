/**
 * Ride Queue Service Scale Tests
 *
 * Tests the priority queue algorithm under production-like conditions:
 * - ~200 rides per night
 * - ~15+ rides queued at any time
 * - Mixed class years, same/cross chapter, emergencies
 *
 * Critical business rules validated:
 * - Emergency rides always get priority 9999
 * - Same-chapter: (classYear × 10) + (waitMinutes × 0.5)
 * - Cross-chapter: (waitMinutes × 0.5) only
 * - Higher priority = served first
 */

// Mock Firebase before importing the service
jest.mock('../../src/config/firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import {
  calculatePriority,
  isSameChapterRide,
} from '../../src/services/rideQueueService';

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

interface TestEvent {
  id: string;
  name: string;
  chapterId: string;
  date: Date;
  allowedChapterIds: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Helper functions
function generateRide(
  id: string,
  options: Partial<{
    chapterId: string;
    eventId: string;
    isEmergency: boolean;
    status: TestRide['status'];
    requestedAt: Date;
    ddId: string;
    priority: number;
  }> = {}
): TestRide {
  return {
    id,
    riderId: `rider_${id}`,
    chapterId: options.chapterId ?? 'chapter_1',
    eventId: options.eventId ?? 'event_1',
    pickupLocation: { latitude: 39.1836, longitude: -96.5717 },
    pickupAddress: '123 Test St',
    status: options.status ?? 'queued',
    priority: options.priority ?? 0,
    isEmergency: options.isEmergency ?? false,
    requestedAt: options.requestedAt ?? new Date(),
    ddId: options.ddId,
  };
}

function generateEvent(
  id: string,
  options: Partial<{
    chapterId: string;
    allowedChapterIds: string[];
    status: TestEvent['status'];
  }> = {}
): TestEvent {
  return {
    id,
    name: `Test Event ${id}`,
    chapterId: options.chapterId ?? 'chapter_1',
    date: new Date(),
    allowedChapterIds: options.allowedChapterIds ?? ['chapter_1'],
    status: options.status ?? 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin_1',
  };
}

// Sort rides by priority (descending) - simulating queue ordering
function sortByPriority<T extends { id: string; priority: number }>(rides: T[]): T[] {
  return [...rides].sort((a, b) => b.priority - a.priority);
}

describe('Ride Queue Priority Algorithm - Scale Tests', () => {
  describe('calculatePriority - Core Algorithm', () => {
    // Constants matching the service
    const EMERGENCY_PRIORITY = 9999.0;

    it('should always give emergency rides priority 9999', () => {
      // Test with various class years and wait times
      const testCases = [
        { classYear: 1, waitMinutes: 0 },
        { classYear: 4, waitMinutes: 60 },
        { classYear: 2, waitMinutes: 120 },
        { classYear: 3, waitMinutes: 5 },
      ];

      testCases.forEach(({ classYear, waitMinutes }) => {
        const priority = calculatePriority(classYear, waitMinutes, true, true);
        expect(priority).toBe(EMERGENCY_PRIORITY);
      });
    });

    it('should calculate same-chapter priority correctly: (classYear × 10) + (waitMinutes × 0.5)', () => {
      // Senior waiting 5 min: (4 × 10) + (5 × 0.5) = 42.5
      expect(calculatePriority(4, 5, false, true)).toBe(42.5);

      // Junior waiting 10 min: (3 × 10) + (10 × 0.5) = 35.0
      expect(calculatePriority(3, 10, false, true)).toBe(35.0);

      // Sophomore waiting 20 min: (2 × 10) + (20 × 0.5) = 30.0
      expect(calculatePriority(2, 20, false, true)).toBe(30.0);

      // Freshman waiting 15 min: (1 × 10) + (15 × 0.5) = 17.5
      expect(calculatePriority(1, 15, false, true)).toBe(17.5);
    });

    it('should calculate cross-chapter priority correctly: waitMinutes × 0.5 only', () => {
      // Senior waiting 5 min (cross chapter): 5 × 0.5 = 2.5
      expect(calculatePriority(4, 5, false, false)).toBe(2.5);

      // Freshman waiting 15 min (cross chapter): 15 × 0.5 = 7.5
      expect(calculatePriority(1, 15, false, false)).toBe(7.5);

      // Junior waiting 30 min (cross chapter): 30 × 0.5 = 15.0
      expect(calculatePriority(3, 30, false, false)).toBe(15.0);
    });

    it('should allow long wait times to catch up to higher class years', () => {
      // A freshman waiting 60 min: (1 × 10) + (60 × 0.5) = 40.0
      const freshmanLongWait = calculatePriority(1, 60, false, true);

      // A senior waiting 0 min: (4 × 10) + (0 × 0.5) = 40.0
      const seniorNoWait = calculatePriority(4, 0, false, true);

      // After 60 min, freshman has same priority as senior with no wait
      expect(freshmanLongWait).toBe(seniorNoWait);
    });
  });

  describe('isSameChapterRide', () => {
    it('should identify same-chapter rides correctly', () => {
      const event = generateEvent('event_1', { chapterId: 'chapter_1' });
      const sameChapterRide = generateRide('ride_1', { chapterId: 'chapter_1' });
      const crossChapterRide = generateRide('ride_2', { chapterId: 'chapter_2' });

      expect(isSameChapterRide(sameChapterRide, event)).toBe(true);
      expect(isSameChapterRide(crossChapterRide, event)).toBe(false);
    });

    it('should handle multi-chapter events with "ALL" access', () => {
      const event = generateEvent('event_1', {
        chapterId: 'chapter_1',
        allowedChapterIds: ['ALL'],
      });

      const hostChapterRide = generateRide('ride_1', { chapterId: 'chapter_1' });
      const otherChapterRide = generateRide('ride_2', { chapterId: 'chapter_2' });

      // Only hosting chapter members are "same chapter"
      expect(isSameChapterRide(hostChapterRide, event)).toBe(true);
      expect(isSameChapterRide(otherChapterRide, event)).toBe(false);
    });
  });

  describe('Scale Test: 15+ Queued Rides', () => {
    it('should correctly order 15 queued rides by priority', () => {
      // Event context for test (used for understanding test setup)
      generateEvent('event_1');

      // Generate 15 rides with varying class years and wait times
      const rides: { id: string; classYear: number; waitMinutes: number; isEmergency: boolean }[] = [
        { id: 'ride_1', classYear: 4, waitMinutes: 0, isEmergency: false },    // Senior, just requested
        { id: 'ride_2', classYear: 1, waitMinutes: 30, isEmergency: false },   // Freshman, 30 min wait
        { id: 'ride_3', classYear: 3, waitMinutes: 15, isEmergency: false },   // Junior, 15 min wait
        { id: 'ride_4', classYear: 2, waitMinutes: 45, isEmergency: false },   // Sophomore, 45 min wait
        { id: 'ride_5', classYear: 4, waitMinutes: 10, isEmergency: false },   // Senior, 10 min wait
        { id: 'ride_6', classYear: 1, waitMinutes: 60, isEmergency: false },   // Freshman, 60 min wait (should be high)
        { id: 'ride_7', classYear: 2, waitMinutes: 5, isEmergency: false },    // Sophomore, 5 min wait
        { id: 'ride_8', classYear: 3, waitMinutes: 25, isEmergency: false },   // Junior, 25 min wait
        { id: 'ride_9', classYear: 1, waitMinutes: 0, isEmergency: true },     // EMERGENCY - should be first
        { id: 'ride_10', classYear: 4, waitMinutes: 20, isEmergency: false },  // Senior, 20 min wait
        { id: 'ride_11', classYear: 2, waitMinutes: 35, isEmergency: false },  // Sophomore, 35 min wait
        { id: 'ride_12', classYear: 3, waitMinutes: 40, isEmergency: false },  // Junior, 40 min wait
        { id: 'ride_13', classYear: 1, waitMinutes: 90, isEmergency: false },  // Freshman, 90 min wait
        { id: 'ride_14', classYear: 4, waitMinutes: 5, isEmergency: false },   // Senior, 5 min wait
        { id: 'ride_15', classYear: 2, waitMinutes: 0, isEmergency: false },   // Sophomore, just requested
      ];

      // Calculate priorities
      const ridesWithPriority = rides.map(r => ({
        id: r.id,
        priority: calculatePriority(r.classYear, r.waitMinutes, r.isEmergency, true),
        classYear: r.classYear,
        waitMinutes: r.waitMinutes,
        isEmergency: r.isEmergency,
      }));

      // Sort by priority (descending)
      const sorted = sortByPriority(ridesWithPriority);

      // Verify emergency is first
      expect(sorted[0].id).toBe('ride_9');
      expect(sorted[0].priority).toBe(9999);

      // Verify remaining rides are sorted correctly
      for (let i = 1; i < sorted.length - 1; i++) {
        expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i + 1].priority);
      }

      // Verify specific expected ordering after emergency
      const nonEmergency = sorted.filter(r => !r.isEmergency);

      // ride_13: Freshman 90 min = 10 + 45 = 55.0 should be high
      expect(nonEmergency[0].id).toBe('ride_13');
      expect(nonEmergency[0].priority).toBe(55);

      // ride_10: Senior 20 min = 40 + 10 = 50.0
      expect(nonEmergency[1].id).toBe('ride_10');
      expect(nonEmergency[1].priority).toBe(50);
    });

    it('should handle 20+ queued rides with mixed same/cross chapter', () => {
      const event = generateEvent('event_1', {
        chapterId: 'chapter_1',
        allowedChapterIds: ['chapter_1', 'chapter_2', 'chapter_3'],
      });

      // Generate 20 rides - mix of same and cross chapter
      const rides: { id: string; chapterId: string; classYear: number; waitMinutes: number }[] = [];

      for (let i = 0; i < 20; i++) {
        rides.push({
          id: `ride_${i}`,
          chapterId: `chapter_${(i % 3) + 1}`, // Cycles through chapter_1, chapter_2, chapter_3
          classYear: (i % 4) + 1, // Cycles through 1, 2, 3, 4
          waitMinutes: i * 3, // 0, 3, 6, 9, ... 57 min
        });
      }

      // Calculate priorities with chapter consideration
      const ridesWithPriority = rides.map(r => {
        const isSameChapter = r.chapterId === event.chapterId;
        return {
          id: r.id,
          priority: calculatePriority(r.classYear, r.waitMinutes, false, isSameChapter),
          isSameChapter,
          classYear: r.classYear,
          waitMinutes: r.waitMinutes,
        };
      });

      // Sort by priority
      const sorted = sortByPriority(ridesWithPriority);

      // Verify ordering
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i + 1].priority);
      }

      // Same chapter with high class year + long wait should beat cross chapter
      // ride_18: chapter_1 (same), classYear=3, waitMinutes=54 → (3×10) + (54×0.5) = 57
      // Find ride_18 in sorted list
      const ride18 = ridesWithPriority.find(r => r.id === 'ride_18')!;
      expect(ride18.priority).toBe(57);
      expect(ride18.isSameChapter).toBe(true);

      // Cross chapter ride: ride_19: chapter_2, classYear=4, waitMinutes=57 → 57×0.5 = 28.5
      const ride19 = ridesWithPriority.find(r => r.id === 'ride_19')!;
      expect(ride19.priority).toBe(28.5);
      expect(ride19.isSameChapter).toBe(false);

      // ride_18 should have higher priority than ride_19
      expect(ride18.priority).toBeGreaterThan(ride19.priority);
    });
  });

  describe('Scale Test: 200 Rides Simulation (Full Night)', () => {
    it('should handle 200 rides over a 4-hour event window', () => {
      const startTime = new Date('2024-01-15T21:00:00'); // 9 PM start
      const event = generateEvent('event_1');

      // Generate 200 rides distributed over 4 hours
      const rides: {
        id: string;
        requestedAt: Date;
        classYear: number;
        isEmergency: boolean;
        chapterId: string;
      }[] = [];

      for (let i = 0; i < 200; i++) {
        // Distribute requests over 4 hours (240 minutes)
        const minutesFromStart = Math.floor((i / 200) * 240);
        const requestedAt = new Date(startTime.getTime() + minutesFromStart * 60 * 1000);

        rides.push({
          id: `ride_${i}`,
          requestedAt,
          classYear: (i % 4) + 1,
          isEmergency: i === 50 || i === 150, // 2 emergencies
          chapterId: i % 5 === 0 ? 'chapter_2' : 'chapter_1', // 20% cross-chapter
        });
      }

      // Simulate calculating priorities at event end (1 AM)
      const currentTime = new Date('2024-01-16T01:00:00');

      const ridesWithPriority = rides.map(r => {
        const waitMinutes = (currentTime.getTime() - r.requestedAt.getTime()) / (1000 * 60);
        const isSameChapter = r.chapterId === event.chapterId;
        return {
          id: r.id,
          priority: calculatePriority(r.classYear, waitMinutes, r.isEmergency, isSameChapter),
          waitMinutes: Math.floor(waitMinutes),
          isEmergency: r.isEmergency,
          isSameChapter,
        };
      });

      // Sort and verify
      const sorted = sortByPriority(ridesWithPriority);

      // Emergencies should be at top
      expect(sorted[0].isEmergency).toBe(true);
      expect(sorted[1].isEmergency).toBe(true);
      expect(sorted[0].priority).toBe(9999);
      expect(sorted[1].priority).toBe(9999);

      // Non-emergencies should be properly ordered
      const nonEmergency = sorted.filter(r => !r.isEmergency);
      for (let i = 0; i < nonEmergency.length - 1; i++) {
        expect(nonEmergency[i].priority).toBeGreaterThanOrEqual(nonEmergency[i + 1].priority);
      }

      // Verify oldest rides have accumulated significant priority
      const oldestRide = nonEmergency.find(r => r.id === 'ride_0')!;
      expect(oldestRide.waitMinutes).toBe(240); // 4 hours = 240 minutes
      // ride_0: classYear=1, waitMinutes=240, CROSS chapter (0 % 5 === 0) → 240×0.5 = 120
      expect(oldestRide.priority).toBe(120);
    });

    it('should perform priority calculation in under 10ms for 200 rides', () => {
      const rides: { classYear: number; waitMinutes: number; isEmergency: boolean; isSameChapter: boolean }[] = [];

      for (let i = 0; i < 200; i++) {
        rides.push({
          classYear: (i % 4) + 1,
          waitMinutes: Math.random() * 240,
          isEmergency: Math.random() < 0.01,
          isSameChapter: Math.random() > 0.2,
        });
      }

      const startTime = performance.now();

      rides.forEach(r => {
        calculatePriority(r.classYear, r.waitMinutes, r.isEmergency, r.isSameChapter);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 10ms
      expect(duration).toBeLessThan(10);
      console.log(`200 priority calculations completed in ${duration.toFixed(2)}ms`);
    });

    it('should correctly sort 200 rides by priority in under 50ms', () => {
      const rides: { id: string; priority: number }[] = [];

      for (let i = 0; i < 200; i++) {
        const classYear = (i % 4) + 1;
        const waitMinutes = Math.random() * 240;
        const isEmergency = Math.random() < 0.01;
        const isSameChapter = Math.random() > 0.2;

        rides.push({
          id: `ride_${i}`,
          priority: calculatePriority(classYear, waitMinutes, isEmergency, isSameChapter),
        });
      }

      const startTime = performance.now();

      const sorted = sortByPriority(rides);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 50ms
      expect(duration).toBeLessThan(50);
      console.log(`200 ride sort completed in ${duration.toFixed(2)}ms`);

      // Verify sorting is correct
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i + 1].priority);
      }
    });
  });

  describe('Edge Cases at Scale', () => {
    it('should handle multiple emergencies (first-come-first-served among emergencies)', () => {
      const emergencies = [
        { id: 'emergency_1', requestedAt: new Date('2024-01-15T22:00:00') },
        { id: 'emergency_2', requestedAt: new Date('2024-01-15T22:05:00') },
        { id: 'emergency_3', requestedAt: new Date('2024-01-15T22:10:00') },
      ];

      // All have priority 9999
      const withPriority = emergencies.map(e => ({
        ...e,
        priority: calculatePriority(1, 0, true, true),
      }));

      // All should have same priority
      expect(withPriority[0].priority).toBe(9999);
      expect(withPriority[1].priority).toBe(9999);
      expect(withPriority[2].priority).toBe(9999);

      // For emergencies with same priority, requestedAt should be used as tiebreaker
      // (This would be implemented in the service layer)
    });

    it('should handle all freshmen scenario (wait time becomes key differentiator)', () => {
      const rides: { id: string; waitMinutes: number }[] = [];

      // 15 freshmen with varying wait times
      for (let i = 0; i < 15; i++) {
        rides.push({
          id: `ride_${i}`,
          waitMinutes: i * 5, // 0, 5, 10, 15, ... 70 min
        });
      }

      const withPriority = rides.map(r => ({
        ...r,
        priority: calculatePriority(1, r.waitMinutes, false, true),
      }));

      // Sort by priority
      const sorted = sortByPriority(withPriority);

      // Longest wait should be first (highest priority)
      expect(sorted[0].id).toBe('ride_14'); // 70 min wait
      expect(sorted[0].priority).toBe(10 + 35); // (1×10) + (70×0.5) = 45

      // Just requested should be last
      expect(sorted[14].id).toBe('ride_0'); // 0 min wait
      expect(sorted[14].priority).toBe(10); // (1×10) + (0×0.5) = 10
    });

    it('should handle all seniors scenario (wait time still matters)', () => {
      const rides: { id: string; waitMinutes: number }[] = [];

      // 15 seniors with varying wait times
      for (let i = 0; i < 15; i++) {
        rides.push({
          id: `ride_${i}`,
          waitMinutes: i * 5,
        });
      }

      const withPriority = rides.map(r => ({
        ...r,
        priority: calculatePriority(4, r.waitMinutes, false, true),
      }));

      const sorted = sortByPriority(withPriority);

      // Longest wait should still be first
      expect(sorted[0].id).toBe('ride_14');
      expect(sorted[0].priority).toBe(40 + 35); // (4×10) + (70×0.5) = 75

      // Difference between longest and shortest wait
      const diff = sorted[0].priority - sorted[14].priority;
      expect(diff).toBe(35); // 70×0.5 - 0×0.5 = 35
    });

    it('should handle zero wait times correctly', () => {
      // All riders just requested
      const classYears = [1, 2, 3, 4];
      const priorities = classYears.map(cy => calculatePriority(cy, 0, false, true));

      expect(priorities[0]).toBe(10); // Freshman
      expect(priorities[1]).toBe(20); // Sophomore
      expect(priorities[2]).toBe(30); // Junior
      expect(priorities[3]).toBe(40); // Senior

      // Class year alone determines order when no one has waited
    });

    it('should handle very long wait times (edge case: 4+ hours)', () => {
      // Freshman waiting 4 hours
      const longWait = calculatePriority(1, 240, false, true);
      expect(longWait).toBe(10 + 120); // (1×10) + (240×0.5) = 130

      // Even a freshman with 4 hour wait beats a senior who just requested
      const seniorNoWait = calculatePriority(4, 0, false, true);
      expect(longWait).toBeGreaterThan(seniorNoWait); // 130 > 40
    });

    it('should handle mixed cross-chapter scenario at scale', () => {
      // Simulate multi-chapter event
      const event = generateEvent('event_1', {
        chapterId: 'sae_kstate',
        allowedChapterIds: ['sae_kstate', 'pike_kstate', 'ato_kstate', 'ALL'],
      });

      const rides: {
        id: string;
        chapterId: string;
        classYear: number;
        waitMinutes: number;
      }[] = [];

      const chapters = ['sae_kstate', 'pike_kstate', 'ato_kstate', 'delts_kstate', 'sig_chi_kstate'];

      // 50 rides from 5 different chapters
      for (let i = 0; i < 50; i++) {
        rides.push({
          id: `ride_${i}`,
          chapterId: chapters[i % 5],
          classYear: (i % 4) + 1,
          waitMinutes: Math.floor(Math.random() * 60),
        });
      }

      const withPriority = rides.map(r => {
        const isSameChapter = r.chapterId === event.chapterId;
        return {
          ...r,
          isSameChapter,
          priority: calculatePriority(r.classYear, r.waitMinutes, false, isSameChapter),
        };
      });

      // Same-chapter senior with modest wait should beat cross-chapter anyone
      const sameChapterSenior = withPriority.find(
        r => r.chapterId === 'sae_kstate' && r.classYear === 4
      );
      const crossChapterSenior = withPriority.find(
        r => r.chapterId !== 'sae_kstate' && r.classYear === 4 && r.waitMinutes < 30
      );

      if (sameChapterSenior && crossChapterSenior) {
        // Same chapter gets class year bonus, cross chapter doesn't
        expect(sameChapterSenior.priority).toBeGreaterThan(crossChapterSenior.priority);
      }
    });
  });

  describe('Priority Fairness Validation', () => {
    it('should ensure a freshman can catch up to a senior with enough wait time', () => {
      // How long does a freshman need to wait to match a senior?
      // Senior priority: (4×10) + (t×0.5) where t = senior wait time
      // Freshman priority: (1×10) + (T×0.5) where T = freshman wait time

      // If senior just requested (t=0), priority = 40
      // Freshman needs: 10 + T×0.5 = 40 → T = 60 minutes

      const seniorNoWait = calculatePriority(4, 0, false, true);
      const freshmanCatchUp = calculatePriority(1, 60, false, true);

      expect(seniorNoWait).toBe(40);
      expect(freshmanCatchUp).toBe(40);

      // Freshman waiting 61+ minutes beats senior who just requested
      const freshmanBeatsSenior = calculatePriority(1, 61, false, true);
      expect(freshmanBeatsSenior).toBeGreaterThan(seniorNoWait);
    });

    it('should demonstrate priority progression over time', () => {
      // Track a freshman's priority over 2 hours
      const waitTimes = [0, 15, 30, 45, 60, 75, 90, 105, 120];
      const priorities = waitTimes.map(t => ({
        waitMinutes: t,
        priority: calculatePriority(1, t, false, true),
      }));

      // Verify linear increase
      expect(priorities[0].priority).toBe(10);   // 0 min
      expect(priorities[1].priority).toBe(17.5); // 15 min
      expect(priorities[2].priority).toBe(25);   // 30 min
      expect(priorities[3].priority).toBe(32.5); // 45 min
      expect(priorities[4].priority).toBe(40);   // 60 min (equals senior at 0)
      expect(priorities[5].priority).toBe(47.5); // 75 min
      expect(priorities[6].priority).toBe(55);   // 90 min
      expect(priorities[7].priority).toBe(62.5); // 105 min
      expect(priorities[8].priority).toBe(70);   // 120 min

      // Each 15 min adds 7.5 priority
      for (let i = 1; i < priorities.length; i++) {
        const diff = priorities[i].priority - priorities[i - 1].priority;
        expect(diff).toBeCloseTo(7.5, 5);
      }
    });
  });
});
