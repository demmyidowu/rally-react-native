/**
 * LocationService.test.ts
 * Rally - React Native Edition
 *
 * Test suite for battery-efficient location service
 *
 * Tests:
 * - Permission management
 * - One-time location capture
 * - Geocoding (forward and reverse)
 * - Error handling
 * - Validation
 * - Use cases (rider pickup, DD location)
 */

import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';
import {
  locationService,
  LocationServiceError,
  LocationErrorType,
} from '../../src/services/locationService';

// Mock expo-location
jest.mock('expo-location');

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // MARK: - Permission Management Tests

  describe('Permission Management', () => {
    it('should request location permission successfully', async () => {
      // Mock permission request
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
        {
          status: Location.PermissionStatus.GRANTED,
        }
      );

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.status).toBe(Location.PermissionStatus.GRANTED);
      expect(
        Location.requestForegroundPermissionsAsync
      ).toHaveBeenCalledTimes(1);
    });

    it('should handle permission denial', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(
        {
          status: Location.PermissionStatus.DENIED,
        }
      );

      const result = await locationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.status).toBe(Location.PermissionStatus.DENIED);
    });

    it('should check permission status', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });

      const status = await locationService.getLocationPermissionStatus();

      expect(status).toBe(Location.PermissionStatus.GRANTED);
    });

    it('should check if has permission (granted)', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });

      const hasPermission = await locationService.hasLocationPermission();

      expect(hasPermission).toBe(true);
    });

    it('should check if has permission (denied)', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
      });

      const hasPermission = await locationService.hasLocationPermission();

      expect(hasPermission).toBe(false);
    });
  });

  // MARK: - One-Time Location Capture Tests

  describe('One-Time Location Capture', () => {
    const mockPosition = {
      coords: {
        latitude: 39.1836,
        longitude: -96.5717,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    const mockGeocodeResult = [
      {
        street: 'Main St',
        streetNumber: '123',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
        country: 'US',
        name: '123 Main St',
      },
    ];

    it('should capture location successfully with address', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      const result = await locationService.getCurrentLocation();

      expect(result).toHaveProperty('geoPoint');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('address');
      expect(result.latitude).toBe(39.1836);
      expect(result.longitude).toBe(-96.5717);
      expect(result.geoPoint).toBeInstanceOf(GeoPoint);
      expect(result.address).toContain('123 Main St');
    });

    it('should throw error if permission denied', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
      });

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        LocationServiceError
      );
      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        type: LocationErrorType.PERMISSION_DENIED,
      });
    });

    it('should timeout if location takes too long', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      // Mock location that never resolves
      (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        LocationServiceError
      );
      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        type: LocationErrorType.TIMEOUT,
      });
    }, 15000); // Extend timeout for this test

    it('should validate coordinates', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      // Mock invalid coordinates (0, 0)
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 0,
          longitude: 0,
          altitude: 0,
          accuracy: 10,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        LocationServiceError
      );
      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        type: LocationErrorType.INVALID_COORDINATE,
      });
    });

    it('should capture location with custom accuracy', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );

      const result = await locationService.getLocationWithAccuracy(
        Location.Accuracy.Balanced
      );

      expect(result).toHaveProperty('geoPoint');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).not.toHaveProperty('address'); // No address with this method
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });
    });
  });

  // MARK: - Geocoding Tests

  describe('Geocoding', () => {
    const mockGeocodeResult = [
      {
        street: 'Main St',
        streetNumber: '123',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
        country: 'US',
        name: '123 Main St',
      },
    ];

    it('should reverse geocode coordinates to address', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      const address = await locationService.reverseGeocode(39.1836, -96.5717);

      expect(address).toContain('123 Main St');
      expect(address).toContain('Manhattan');
      expect(address).toContain('KS');
      expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith({
        latitude: 39.1836,
        longitude: -96.5717,
      });
    });

    it('should get detailed address components', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      const details = await locationService.getReverseGeocodeDetails(
        39.1836,
        -96.5717
      );

      expect(details).toHaveProperty('street');
      expect(details).toHaveProperty('city');
      expect(details).toHaveProperty('state');
      expect(details).toHaveProperty('zip');
      expect(details).toHaveProperty('fullAddress');
      expect(details.street).toBe('123 Main St');
      expect(details.city).toBe('Manhattan');
      expect(details.state).toBe('KS');
      expect(details.zip).toBe('66502');
    });

    it('should forward geocode address to coordinates', async () => {
      const mockForwardGeocodeResult = [
        {
          latitude: 39.1836,
          longitude: -96.5717,
        },
      ];
      (Location.geocodeAsync as jest.Mock).mockResolvedValue(
        mockForwardGeocodeResult
      );

      const result = await locationService.geocodeAddress(
        '123 Main St, Manhattan, KS 66502'
      );

      expect(result).toHaveProperty('geoPoint');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result.latitude).toBe(39.1836);
      expect(result.longitude).toBe(-96.5717);
      expect(Location.geocodeAsync).toHaveBeenCalledWith(
        '123 Main St, Manhattan, KS 66502'
      );
    });

    it('should throw error for empty address in forward geocoding', async () => {
      await expect(locationService.geocodeAddress('')).rejects.toThrow(
        LocationServiceError
      );
      await expect(locationService.geocodeAddress('')).rejects.toMatchObject({
        type: LocationErrorType.GEOCODING_FAILED,
      });
    });

    it('should throw error if reverse geocoding fails', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

      await expect(
        locationService.reverseGeocode(39.1836, -96.5717)
      ).rejects.toThrow(LocationServiceError);
      await expect(
        locationService.reverseGeocode(39.1836, -96.5717)
      ).rejects.toMatchObject({
        type: LocationErrorType.GEOCODING_FAILED,
      });
    });

    it('should throw error if forward geocoding fails', async () => {
      (Location.geocodeAsync as jest.Mock).mockResolvedValue([]);

      await expect(
        locationService.geocodeAddress('Invalid Address')
      ).rejects.toThrow(LocationServiceError);
      await expect(
        locationService.geocodeAddress('Invalid Address')
      ).rejects.toMatchObject({
        type: LocationErrorType.GEOCODING_FAILED,
      });
    });
  });

  // MARK: - Use Cases Tests

  describe('Use Cases', () => {
    const mockPosition = {
      coords: {
        latitude: 39.1836,
        longitude: -96.5717,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    const mockGeocodeResult = [
      {
        street: 'Main St',
        streetNumber: '123',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
        country: 'US',
        name: '123 Main St',
      },
    ];

    it('should capture rider pickup location', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      const result = await locationService.captureRiderPickupLocation();

      expect(result).toHaveProperty('geoPoint');
      expect(result).toHaveProperty('address');
      expect(result.address).toContain('123 Main St');
    });

    it('should capture DD location', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );

      const result = await locationService.captureDDLocation();

      expect(result).toHaveProperty('geoPoint');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).not.toHaveProperty('address'); // DD capture doesn't include address
    });
  });

  // MARK: - Validation Tests

  describe('Validation', () => {
    it('should validate valid coordinates', () => {
      expect(locationService.validateCoordinates(39.1836, -96.5717)).toBe(true);
      expect(locationService.validateCoordinates(-33.8688, 151.2093)).toBe(
        true
      ); // Sydney
      expect(locationService.validateCoordinates(0, -180)).toBe(true); // Edge case
    });

    it('should invalidate coordinates outside range', () => {
      expect(locationService.validateCoordinates(91, 0)).toBe(false); // Lat > 90
      expect(locationService.validateCoordinates(-91, 0)).toBe(false); // Lat < -90
      expect(locationService.validateCoordinates(0, 181)).toBe(false); // Lon > 180
      expect(locationService.validateCoordinates(0, -181)).toBe(false); // Lon < -180
    });

    it('should invalidate zero coordinates', () => {
      expect(locationService.validateCoordinates(0, 0)).toBe(false);
    });

    it('should check if location is in Manhattan, KS', () => {
      // Inside Manhattan bounds
      expect(locationService.isInManhattanKS(39.1836, -96.5717)).toBe(true);

      // Outside Manhattan bounds (New York City)
      expect(locationService.isInManhattanKS(40.7128, -74.006)).toBe(false);

      // Outside Manhattan bounds (Los Angeles)
      expect(locationService.isInManhattanKS(34.0522, -118.2437)).toBe(false);
    });
  });

  // MARK: - Debugging Helpers Tests

  describe('Debugging Helpers', () => {
    const mockPosition = {
      coords: {
        latitude: 39.1836,
        longitude: -96.5717,
        altitude: 0,
        accuracy: 10,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    };

    const mockGeocodeResult = [
      {
        street: 'Main St',
        streetNumber: '123',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
        country: 'US',
        name: '123 Main St',
      },
    ];

    it('should cache last captured location', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      await locationService.getCurrentLocation();

      const lastLocation = locationService.getLastCapturedLocation();
      expect(lastLocation).toBeDefined();
      expect(lastLocation?.latitude).toBe(39.1836);
      expect(lastLocation?.longitude).toBe(-96.5717);
    });

    it('should cache last captured address', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
        mockPosition
      );
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockGeocodeResult
      );

      await locationService.getCurrentLocation();

      const lastAddress = locationService.getLastCapturedAddress();
      expect(lastAddress).toBeDefined();
      expect(lastAddress).toContain('123 Main St');
    });

    it('should format coordinates as string', () => {
      const formatted = locationService.formatCoordinate(39.1836, -96.5717);
      expect(formatted).toBe('39.183600, -96.571700');
    });
  });

  // MARK: - Error Handling Tests

  describe('Error Handling', () => {
    it('should handle permission denied gracefully', () => {
      // This method just logs a warning
      expect(() => locationService.handlePermissionDenied()).not.toThrow();
    });

    it('should throw LocationServiceError with correct type for invalid coordinates', async () => {
      try {
        await locationService.reverseGeocode(200, 200);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(LocationServiceError);
        expect((error as LocationServiceError).type).toBe(
          LocationErrorType.INVALID_COORDINATE
        );
      }
    });

    it('should handle expo-location errors gracefully', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Location services disabled')
      );

      await expect(locationService.getCurrentLocation()).rejects.toThrow(
        LocationServiceError
      );
      await expect(locationService.getCurrentLocation()).rejects.toMatchObject({
        type: LocationErrorType.LOCATION_UNAVAILABLE,
      });
    });
  });
});
