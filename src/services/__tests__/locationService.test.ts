/**
 * locationService.test.ts
 * Rally React Native
 *
 * Unit tests for LocationService
 * Created: 2026-01-11
 */

import locationService, {
  LocationError,
  LocationErrorCode,
  PermissionStatus,
  Coordinate,
} from '../locationService';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location');

describe('LocationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Permission Management', () => {
    it('should request location permission successfully', async () => {
      // Mock successful permission grant
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED,
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.GRANTED,
      });

      const granted = await locationService.requestLocationPermission();

      expect(granted).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false if permission denied', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.UNDETERMINED,
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: Location.PermissionStatus.DENIED,
      });

      const granted = await locationService.requestLocationPermission();

      expect(granted).toBe(false);
    });

    it('should return false if location services disabled', async () => {
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

      const granted = await locationService.requestLocationPermission();

      expect(granted).toBe(false);
    });
  });

  describe('Location Capture', () => {
    it('should capture location successfully', async () => {
      const mockCoordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: mockCoordinate,
        timestamp: Date.now(),
      });

      // Mock permission granted
      locationService['permissionStatus'] = PermissionStatus.GRANTED;
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      const result = await locationService.captureLocationOnce();

      expect(result.coordinate.latitude).toBe(mockCoordinate.latitude);
      expect(result.coordinate.longitude).toBe(mockCoordinate.longitude);
      expect(result.geoPoint).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw UNAUTHORIZED error if permission not granted', async () => {
      locationService['permissionStatus'] = PermissionStatus.DENIED;

      await expect(locationService.captureLocationOnce()).rejects.toThrow(
        LocationError
      );
    });

    it('should throw TIMEOUT error after 10 seconds', async () => {
      // Mock timeout
      (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ coords: {} }), 15000);
          })
      );

      locationService['permissionStatus'] = PermissionStatus.GRANTED;
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      await expect(locationService.captureLocationOnce()).rejects.toThrow(
        LocationError
      );
    }, 15000);

    it('should throw INVALID_COORDINATE error for invalid coordinates', async () => {
      const invalidCoordinate = {
        latitude: 999,
        longitude: 999,
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: invalidCoordinate,
      });

      locationService['permissionStatus'] = PermissionStatus.GRANTED;
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      await expect(locationService.captureLocationOnce()).rejects.toThrow(
        LocationError
      );
    });
  });

  describe('Geocoding', () => {
    it('should geocode coordinate to address successfully', async () => {
      const mockGeocodedAddress = {
        streetNumber: '123',
        street: 'Main St',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
        name: 'Test Location',
      };

      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        mockGeocodedAddress,
      ]);

      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const address = await locationService.geocodeAddress(coordinate);

      expect(address).toBe('123 Main St, Manhattan, KS, 66502');
    });

    it('should throw GEOCODING_FAILED if no results', async () => {
      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([]);

      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      await expect(
        locationService.geocodeAddress(coordinate)
      ).rejects.toThrow(LocationError);
    });

    it('should throw INVALID_COORDINATE for invalid coordinates', async () => {
      const invalidCoordinate: Coordinate = {
        latitude: 999,
        longitude: 999,
      };

      await expect(
        locationService.geocodeAddress(invalidCoordinate)
      ).rejects.toThrow(LocationError);
    });

    it('should format address correctly with partial data', async () => {
      const mockGeocodedAddress = {
        street: 'Main St',
        city: 'Manhattan',
      };

      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        mockGeocodedAddress,
      ]);

      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const address = await locationService.geocodeAddress(coordinate);

      expect(address).toBe('Main St, Manhattan');
    });

    it('should return "Unknown location" if no address components', async () => {
      const mockGeocodedAddress = {};

      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        mockGeocodedAddress,
      ]);

      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const address = await locationService.geocodeAddress(coordinate);

      expect(address).toBe('Unknown location');
    });
  });

  describe('Convenience Methods', () => {
    it('should capture location and address in one call', async () => {
      const mockCoordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const mockGeocodedAddress = {
        streetNumber: '123',
        street: 'Main St',
        city: 'Manhattan',
        region: 'KS',
        postalCode: '66502',
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: mockCoordinate,
      });

      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        mockGeocodedAddress,
      ]);

      locationService['permissionStatus'] = PermissionStatus.GRANTED;
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      const result = await locationService.captureLocationAndAddress();

      expect(result.coordinate).toEqual(mockCoordinate);
      expect(result.address).toBe('123 Main St, Manhattan, KS, 66502');
      expect(result.geoPoint).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should cache last captured location', async () => {
      const mockCoordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: mockCoordinate,
      });

      locationService['permissionStatus'] = PermissionStatus.GRANTED;
      (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);

      await locationService.captureLocationOnce();

      const cached = locationService.getLastCapturedLocation();
      expect(cached).toEqual(mockCoordinate);
    });

    it('should cache last geocoded address', async () => {
      const mockGeocodedAddress = {
        street: 'Main St',
        city: 'Manhattan',
      };

      (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
        mockGeocodedAddress,
      ]);

      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      await locationService.geocodeAddress(coordinate);

      const cached = locationService.getLastCapturedAddress();
      expect(cached).toBe('Main St, Manhattan');
    });

    it('should clear cache', () => {
      locationService.clearCache();

      expect(locationService.getLastCapturedLocation()).toBeNull();
      expect(locationService.getLastCapturedAddress()).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('should validate valid coordinates', () => {
      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      // Access private method for testing
      const isValid = locationService['isValidCoordinate'](coordinate);
      expect(isValid).toBe(true);
    });

    it('should invalidate out-of-range coordinates', () => {
      const invalidCoordinates = [
        { latitude: 91, longitude: 0 },
        { latitude: -91, longitude: 0 },
        { latitude: 0, longitude: 181 },
        { latitude: 0, longitude: -181 },
        { latitude: NaN, longitude: 0 },
      ];

      invalidCoordinates.forEach((coord) => {
        const isValid = locationService['isValidCoordinate'](coord);
        expect(isValid).toBe(false);
      });
    });

    it('should format coordinate correctly', () => {
      const coordinate: Coordinate = {
        latitude: 39.183612,
        longitude: -96.571743,
      };

      const formatted = locationService.formatCoordinate(coordinate);
      expect(formatted).toBe('39.183612, -96.571743');
    });

    it('should calculate distance between coordinates', () => {
      const coord1: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const coord2: Coordinate = {
        latitude: 39.1965,
        longitude: -96.5853,
      };

      const distance = locationService.calculateDistance(coord1, coord2);

      // Distance should be approximately 1.8 km
      expect(distance).toBeGreaterThan(1.5);
      expect(distance).toBeLessThan(2.5);
    });

    it('should convert coordinate to GeoPoint', () => {
      const coordinate: Coordinate = {
        latitude: 39.1836,
        longitude: -96.5717,
      };

      const geoPoint = locationService['coordinateToGeoPoint'](coordinate);

      expect(geoPoint.latitude).toBe(coordinate.latitude);
      expect(geoPoint.longitude).toBe(coordinate.longitude);
    });

    it('should convert GeoPoint to coordinate', () => {
      const geoPoint = {
        latitude: 39.1836,
        longitude: -96.5717,
      } as any;

      const coordinate = locationService.geoPointToCoordinate(geoPoint);

      expect(coordinate.latitude).toBe(geoPoint.latitude);
      expect(coordinate.longitude).toBe(geoPoint.longitude);
    });
  });

  describe('Error Messages', () => {
    it('should return correct error message for UNAUTHORIZED', () => {
      const error = new LocationError(
        'Test',
        LocationErrorCode.UNAUTHORIZED
      );

      expect(error.message).toBeDefined();
      expect(error.code).toBe(LocationErrorCode.UNAUTHORIZED);
    });

    it('should return correct error message for TIMEOUT', () => {
      const error = new LocationError('Test', LocationErrorCode.TIMEOUT);

      expect(error.code).toBe(LocationErrorCode.TIMEOUT);
    });
  });
});
