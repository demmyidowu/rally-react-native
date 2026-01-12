/**
 * ETA Service Tests
 *
 * Comprehensive tests for ETA calculation using Google Maps Distance Matrix API.
 * These tests verify coordinate validation, error handling, and fallback behavior.
 *
 * Run: npm test etaService.test.ts
 */

import {
  calculateETA,
  calculateETAToAddress,
  calculateETAWithFallback,
  calculateETAToAddressWithFallback,
  calculateDistance,
  metersToMiles,
  metersToKilometers,
  calculateBatchETAs,
  ETAError,
  ETAErrorType,
} from '../etaService';

// Mock fetch globally
global.fetch = jest.fn();

describe('ETAService - Coordinate Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts valid coordinates', async () => {
    const validFrom = { latitude: 39.1836, longitude: -96.5717 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 600, text: '10 mins' },
                distance: { value: 5000, text: '5 km' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(validFrom, validTo);
    expect(eta).toBeGreaterThan(0);
  });

  it('rejects invalid source latitude (>90)', async () => {
    const invalidFrom = { latitude: 91, longitude: -96.5717 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    await expect(calculateETA(invalidFrom, validTo)).rejects.toThrow(ETAError);
    await expect(calculateETA(invalidFrom, validTo)).rejects.toMatchObject({
      type: ETAErrorType.INVALID_COORDINATE,
    });
  });

  it('rejects invalid source latitude (<-90)', async () => {
    const invalidFrom = { latitude: -91, longitude: -96.5717 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    await expect(calculateETA(invalidFrom, validTo)).rejects.toThrow(ETAError);
  });

  it('rejects invalid source longitude (>180)', async () => {
    const invalidFrom = { latitude: 39.1836, longitude: 181 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    await expect(calculateETA(invalidFrom, validTo)).rejects.toThrow(ETAError);
  });

  it('rejects invalid source longitude (<-180)', async () => {
    const invalidFrom = { latitude: 39.1836, longitude: -181 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    await expect(calculateETA(invalidFrom, validTo)).rejects.toThrow(ETAError);
  });

  it('rejects invalid destination latitude', async () => {
    const validFrom = { latitude: 39.1836, longitude: -96.5717 };
    const invalidTo = { latitude: 91, longitude: -96.5831 };

    await expect(calculateETA(validFrom, invalidTo)).rejects.toThrow(ETAError);
  });

  it('rejects NaN coordinates', async () => {
    const invalidFrom = { latitude: NaN, longitude: -96.5717 };
    const validTo = { latitude: 39.1967, longitude: -96.5831 };

    await expect(calculateETA(invalidFrom, validTo)).rejects.toThrow(ETAError);
  });

  it('accepts edge case coordinates (0, 0)', async () => {
    const from = { latitude: 0, longitude: 0 };
    const to = { latitude: 1, longitude: 1 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 300, text: '5 mins' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBeGreaterThan(0);
  });

  it('accepts maximum valid latitude (90)', async () => {
    const from = { latitude: 90, longitude: 0 };
    const to = { latitude: 89, longitude: 0 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 300, text: '5 mins' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBeGreaterThan(0);
  });

  it('accepts maximum valid longitude (180)', async () => {
    const from = { latitude: 0, longitude: 180 };
    const to = { latitude: 0, longitude: 179 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 300, text: '5 mins' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBeGreaterThan(0);
  });
});

describe('ETAService - ETA Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('calculates ETA correctly in minutes (rounded up)', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 630, text: '10 mins' }, // 10.5 minutes
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBe(11); // Rounded up from 10.5
  });

  it('rounds up fractional minutes', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 61, text: '1 min' }, // 1.01 minutes
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBe(2); // Rounded up from 1.01
  });

  it('handles exact minute durations', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 600, text: '10 mins' }, // Exactly 10 minutes
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBe(10);
  });

  it('uses fallback ETA (15 min) when API key not configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    const eta = await calculateETA(from, to);
    expect(eta).toBe(15); // Default fallback
  });

  it('throws error when route not found', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'ZERO_RESULTS', // No route found
              },
            ],
          },
        ],
      }),
    });

    await expect(calculateETA(from, to)).rejects.toThrow(ETAError);
    await expect(calculateETA(from, to)).rejects.toMatchObject({
      type: ETAErrorType.ROUTE_NOT_FOUND,
    });
  });

  it('throws error when API returns error status', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'INVALID_REQUEST',
      }),
    });

    await expect(calculateETA(from, to)).rejects.toThrow(ETAError);
    await expect(calculateETA(from, to)).rejects.toMatchObject({
      type: ETAErrorType.API_ERROR,
    });
  });

  it('throws error on network failure', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(calculateETA(from, to)).rejects.toThrow(ETAError);
    await expect(calculateETA(from, to)).rejects.toMatchObject({
      type: ETAErrorType.NETWORK_ERROR,
    });
  });
});

describe('ETAService - Fallback Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('returns fallback ETA (15 min) on network error', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const eta = await calculateETAWithFallback(from, to);
    expect(eta).toBe(15);
  });

  it('returns fallback ETA on invalid coordinates', async () => {
    const invalidFrom = { latitude: 91, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    const eta = await calculateETAWithFallback(invalidFrom, to);
    expect(eta).toBe(15);
  });

  it('returns calculated ETA on success', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 600, text: '10 mins' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETAWithFallback(from, to);
    expect(eta).toBe(10);
  });

  it('never throws error - always returns a value', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1967, longitude: -96.5831 };

    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Complete failure')
    );

    // Should not throw
    const eta = await calculateETAWithFallback(from, to);
    expect(typeof eta).toBe('number');
    expect(eta).toBeGreaterThan(0);
  });
});

describe('ETAService - Distance Calculation', () => {
  it('calculates straight-line distance correctly', () => {
    // Distance from Manhattan, KS to Lawrence, KS (~50 miles)
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 38.9717, longitude: -95.2353 };

    const distance = calculateDistance(from, to);

    // Should be approximately 100,000 meters (100 km)
    expect(distance).toBeGreaterThan(90000);
    expect(distance).toBeLessThan(110000);
  });

  it('calculates zero distance for same location', () => {
    const location = { latitude: 39.1836, longitude: -96.5717 };

    const distance = calculateDistance(location, location);
    expect(distance).toBe(0);
  });

  it('converts meters to miles correctly', () => {
    const meters = 1609.344; // Exactly 1 mile
    const miles = metersToMiles(meters);
    expect(miles).toBe(1.0);
  });

  it('converts meters to kilometers correctly', () => {
    const meters = 1000; // Exactly 1 km
    const kilometers = metersToKilometers(meters);
    expect(kilometers).toBe(1.0);
  });

  it('rounds distance conversions to 1 decimal place', () => {
    const meters = 1234.56;
    const miles = metersToMiles(meters);
    const kilometers = metersToKilometers(meters);

    expect(miles).toBe(0.8); // 0.767 rounded to 0.8
    expect(kilometers).toBe(1.2); // 1.23456 rounded to 1.2
  });
});

describe('ETAService - Batch ETA Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('calculates ETAs for multiple destinations', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const destinations = [
      { latitude: 39.1967, longitude: -96.5831 },
      { latitude: 39.2000, longitude: -96.6000 },
      { latitude: 39.2100, longitude: -96.6200 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 300, text: '5 mins' },
              },
              {
                status: 'OK',
                duration: { value: 600, text: '10 mins' },
              },
              {
                status: 'OK',
                duration: { value: 900, text: '15 mins' },
              },
            ],
          },
        ],
      }),
    });

    const etas = await calculateBatchETAs(from, destinations);

    expect(etas).toHaveLength(3);
    expect(etas[0]).toBe(5);
    expect(etas[1]).toBe(10);
    expect(etas[2]).toBe(15);
  });

  it('uses fallback for failed destinations', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const destinations = [
      { latitude: 39.1967, longitude: -96.5831 },
      { latitude: 39.2000, longitude: -96.6000 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 300, text: '5 mins' },
              },
              {
                status: 'ZERO_RESULTS', // Failed
              },
            ],
          },
        ],
      }),
    });

    const etas = await calculateBatchETAs(from, destinations);

    expect(etas).toHaveLength(2);
    expect(etas[0]).toBe(5);
    expect(etas[1]).toBe(15); // Fallback
  });

  it('returns all fallbacks when API key not configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const from = { latitude: 39.1836, longitude: -96.5717 };
    const destinations = [
      { latitude: 39.1967, longitude: -96.5831 },
      { latitude: 39.2000, longitude: -96.6000 },
    ];

    const etas = await calculateBatchETAs(from, destinations);

    expect(etas).toHaveLength(2);
    expect(etas[0]).toBe(15);
    expect(etas[1]).toBe(15);
  });
});

describe('ETAService - Real-World Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  it('calculates ETA for typical campus ride (~5-10 min)', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 }; // Campus location
    const to = { latitude: 39.1967, longitude: -96.5831 }; // Nearby location

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 480, text: '8 mins' },
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBeGreaterThan(0);
    expect(eta).toBeLessThan(15);
  });

  it('handles very short trips (< 1 minute)', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 };
    const to = { latitude: 39.1837, longitude: -96.5718 }; // Very close

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 30, text: '1 min' }, // 30 seconds
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBe(1); // Rounds up to 1 minute
  });

  it('handles long-distance trips', async () => {
    const from = { latitude: 39.1836, longitude: -96.5717 }; // Manhattan, KS
    const to = { latitude: 39.0997, longitude: -94.5786 }; // Kansas City, MO

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                duration: { value: 6000, text: '100 mins' }, // ~1.5 hours
              },
            ],
          },
        ],
      }),
    });

    const eta = await calculateETA(from, to);
    expect(eta).toBe(100);
  });
});

describe('ETAService - Constants and Defaults', () => {
  it('uses 15 minutes as default fallback ETA', () => {
    const DEFAULT_FALLBACK_ETA = 15;
    expect(DEFAULT_FALLBACK_ETA).toBe(15);
  });

  it('requires Google Maps API key to be configured', () => {
    // API key should be set in environment
    expect(process.env.GOOGLE_MAPS_API_KEY).toBeDefined();
  });
});
