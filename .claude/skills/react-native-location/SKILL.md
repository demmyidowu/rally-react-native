---
name: react-native-location
description: expo-location integration patterns for React Native. Use when implementing location capture, permission handling, geocoding, or battery-efficient one-time location reads.
---

# React Native Location with expo-location

## When to Use This Skill
Implementing location features in React Native with expo-location:
- One-time location capture
- Location permissions
- Address geocoding and reverse geocoding
- Battery-efficient location patterns
- Error handling for location services

## Installation

```bash
npx expo install expo-location
```

## Permission Handling

### iOS Configuration (app.json)
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Rally needs your location to estimate ride times and provide accurate pickup locations."
      }
    }
  }
}
```

### Android Configuration (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### Permission Request Pattern
```typescript
// src/services/locationService.ts
import * as Location from 'expo-location';

export class LocationService {
  // Request location permission
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  // Check if permission is already granted
  static async hasLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  // Check if location services are enabled
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }
}
```

## One-Time Location Capture

### Basic Location Capture
```typescript
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export class LocationService {
  // Get current location (one-time)
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // Check permission first
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      // Check if location services are enabled
      const isEnabled = await this.isLocationEnabled();
      if (!isEnabled) {
        throw new Error('Location services are disabled');
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // High accuracy location (for critical captures)
  static async getHighAccuracyLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting high accuracy location:', error);
      throw error;
    }
  }

  // Low power location (for non-critical captures)
  static async getLowPowerLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error) {
      console.error('Error getting low power location:', error);
      return null;
    }
  }
}
```

### Accuracy Levels
```typescript
// Available accuracy levels from expo-location
import { Accuracy } from 'expo-location';

const accuracyLevels = {
  // iOS: kCLLocationAccuracyThreeKilometers
  // Android: PRIORITY_LOW_POWER
  lowest: Accuracy.Lowest,

  // iOS: kCLLocationAccuracyKilometer
  // Android: PRIORITY_BALANCED_POWER_ACCURACY
  low: Accuracy.Low,

  // iOS: kCLLocationAccuracyHundredMeters
  // Android: PRIORITY_BALANCED_POWER_ACCURACY
  balanced: Accuracy.Balanced,

  // iOS: kCLLocationAccuracyNearestTenMeters
  // Android: PRIORITY_HIGH_ACCURACY
  high: Accuracy.High,

  // iOS: kCLLocationAccuracyBest
  // Android: PRIORITY_HIGH_ACCURACY
  highest: Accuracy.Highest,

  // iOS: kCLLocationAccuracyBestForNavigation
  // Android: PRIORITY_HIGH_ACCURACY
  bestForNavigation: Accuracy.BestForNavigation,
};

// Recommended for Rally use cases:
// - Ride request (pickup location): Accuracy.Balanced
// - DD en route: Accuracy.High
```

## Geocoding (Address <-> Coordinates)

### Reverse Geocoding (Coordinates to Address)
```typescript
import * as Location from 'expo-location';

interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
}

export class LocationService {
  // Convert coordinates to address
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Address | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length === 0) {
        return null;
      }

      const address = addresses[0];

      return {
        street: address.street || '',
        city: address.city || '',
        region: address.region || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        formattedAddress: this.formatAddress(address),
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Format address for display
  private static formatAddress(address: Location.LocationGeocodedAddress): string {
    const parts = [
      address.street,
      address.city,
      address.region,
      address.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
  }
}
```

### Forward Geocoding (Address to Coordinates)
```typescript
export class LocationService {
  // Convert address to coordinates
  static async geocodeAddress(address: string): Promise<LocationData | null> {
    try {
      const locations = await Location.geocodeAsync(address);

      if (locations.length === 0) {
        return null;
      }

      const location = locations[0];

      return {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: 0, // Geocoding doesn't provide accuracy
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }
}
```

## Rally-Specific Patterns

### Ride Request Location Capture
```typescript
// src/services/rideLocationService.ts
import { LocationService } from './locationService';
import { FirestoreService } from './firestoreService';

interface RideLocation {
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
  capturedAt: number;
}

export class RideLocationService {
  // Capture pickup location when rider requests ride
  static async capturePickupLocation(): Promise<RideLocation> {
    try {
      // Get current location (one-time, balanced accuracy)
      const location = await LocationService.getCurrentLocation();
      if (!location) {
        throw new Error('Could not get current location');
      }

      // Reverse geocode to get address
      const address = await LocationService.reverseGeocode(
        location.latitude,
        location.longitude
      );

      return {
        latitude: location.latitude,
        longitude: location.longitude,
        address: address?.formattedAddress || 'Unknown location',
        accuracy: location.accuracy,
        capturedAt: location.timestamp,
      };
    } catch (error) {
      console.error('Error capturing pickup location:', error);
      throw error;
    }
  }

  // Capture DD location when marking "en route"
  static async captureDDLocation(rideId: string): Promise<RideLocation> {
    try {
      // Get high accuracy location for DD
      const location = await LocationService.getHighAccuracyLocation();
      if (!location) {
        throw new Error('Could not get DD location');
      }

      // Get address (optional, for display)
      const address = await LocationService.reverseGeocode(
        location.latitude,
        location.longitude
      );

      const rideLocation: RideLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: address?.formattedAddress || '',
        accuracy: location.accuracy,
        capturedAt: location.timestamp,
      };

      // Save to Firestore
      await FirestoreService.updateDocument('rides', rideId, {
        ddLocation: rideLocation,
        ddLocationCapturedAt: location.timestamp,
      });

      return rideLocation;
    } catch (error) {
      console.error('Error capturing DD location:', error);
      throw error;
    }
  }
}
```

## Hook Pattern

### useLocation Hook
```typescript
// src/hooks/useLocation.ts
import { useState, useEffect } from 'react';
import { LocationService } from '../services/locationService';

interface UseLocationResult {
  location: LocationData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useLocation = (autoFetch = false): UseLocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      const loc = await LocationService.getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch]);

  return {
    location,
    loading,
    error,
    refetch: fetchLocation,
  };
};
```

### useLocationPermission Hook
```typescript
// src/hooks/useLocationPermission.ts
import { useState, useEffect } from 'react';
import { LocationService } from '../services/locationService';

interface UseLocationPermissionResult {
  hasPermission: boolean;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
}

export const useLocationPermission = (): UseLocationPermissionResult => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      setLoading(true);
      const granted = await LocationService.hasLocationPermission();
      setHasPermission(granted);
    } catch (error) {
      console.error('Error checking permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await LocationService.requestLocationPermission();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  return {
    hasPermission,
    loading,
    requestPermission,
  };
};
```

## Component Examples

### Request Location Button
```typescript
import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { RideLocationService } from '../services/rideLocationService';

export const RequestRideButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<RideLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestRide = async () => {
    try {
      setLoading(true);
      setError(null);

      // Capture pickup location (one-time)
      const pickupLocation = await RideLocationService.capturePickupLocation();
      setLocation(pickupLocation);

      // Create ride with location
      // await createRide({ pickupLocation, ... });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Button
        title="Request Ride"
        onPress={handleRequestRide}
        disabled={loading}
      />

      {loading && <ActivityIndicator />}

      {location && (
        <Text>Pickup: {location.address}</Text>
      )}

      {error && (
        <Text style={{ color: 'red' }}>{error}</Text>
      )}
    </View>
  );
};
```

### Permission Request Screen
```typescript
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useLocationPermission } from '../hooks/useLocationPermission';

export const LocationPermissionScreen: React.FC = () => {
  const { hasPermission, loading, requestPermission } = useLocationPermission();

  if (loading) {
    return <ActivityIndicator />;
  }

  if (hasPermission) {
    return (
      <View style={styles.container}>
        <Text>Location permission granted!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Permission Required</Text>
      <Text style={styles.description}>
        Rally needs your location to provide accurate pickup locations and
        estimate ride times.
      </Text>
      <Button title="Grant Permission" onPress={requestPermission} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
  },
});
```

## Error Handling

### Location Error Types
```typescript
export enum LocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SERVICES_DISABLED = 'SERVICES_DISABLED',
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

export class LocationError extends Error {
  type: LocationErrorType;

  constructor(type: LocationErrorType, message: string) {
    super(message);
    this.type = type;
    this.name = 'LocationError';
  }
}

export class LocationService {
  static async getCurrentLocation(): Promise<LocationData> {
    try {
      const hasPermission = await this.hasLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new LocationError(
            LocationErrorType.PERMISSION_DENIED,
            'Location permission was denied'
          );
        }
      }

      const isEnabled = await this.isLocationEnabled();
      if (!isEnabled) {
        throw new LocationError(
          LocationErrorType.SERVICES_DISABLED,
          'Location services are disabled. Please enable them in Settings.'
        );
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };
    } catch (error: any) {
      if (error instanceof LocationError) {
        throw error;
      }

      // Handle expo-location specific errors
      if (error.code === 'E_LOCATION_TIMEOUT') {
        throw new LocationError(
          LocationErrorType.TIMEOUT,
          'Location request timed out'
        );
      }

      if (error.code === 'E_LOCATION_UNAVAILABLE') {
        throw new LocationError(
          LocationErrorType.UNAVAILABLE,
          'Location is temporarily unavailable'
        );
      }

      throw new LocationError(
        LocationErrorType.UNKNOWN,
        error.message || 'Unknown location error'
      );
    }
  }
}
```

## Battery-Efficient Patterns

### One-Time Capture (Rally Pattern)
```typescript
// GOOD - Only capture when needed
// Ride request: capture once
const pickupLocation = await LocationService.getCurrentLocation();

// DD marks en route: capture once
const ddLocation = await LocationService.getCurrentLocation();

// NO background tracking
// NO continuous updates
// NO watchers
```

### What NOT to Do (Battery Drain)
```typescript
// BAD - Continuous watching drains battery
Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
  },
  (location) => {
    // Don't do this for Rally!
  }
);

// BAD - Background location updates
Location.startLocationUpdatesAsync('background-location', {
  accuracy: Location.Accuracy.High,
});
```

## Common Pitfalls to Avoid

### 1. Not Checking Permissions
```typescript
// BAD - Assuming permission is granted
const location = await Location.getCurrentPositionAsync();

// GOOD - Check and request permission first
const hasPermission = await LocationService.hasLocationPermission();
if (!hasPermission) {
  await LocationService.requestLocationPermission();
}
const location = await Location.getCurrentPositionAsync();
```

### 2. Using Wrong Accuracy Level
```typescript
// BAD - High accuracy for non-critical use
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.BestForNavigation, // Drains battery
});

// GOOD - Use appropriate accuracy
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced, // Good enough for most use cases
});
```

### 3. Not Handling Errors
```typescript
// BAD - No error handling
const location = await Location.getCurrentPositionAsync();

// GOOD - Proper error handling
try {
  const location = await Location.getCurrentPositionAsync();
} catch (error) {
  if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
    // Show message to enable location services
  }
}
```

### 4. Background Location Updates
```typescript
// BAD - Don't use background location for Rally
// Rally only needs one-time captures, not continuous tracking

// GOOD - One-time capture when needed
const location = await LocationService.getCurrentLocation();
```

## Best Practices

1. **Request permission before accessing location**
2. **Use appropriate accuracy level** (Balanced for most cases)
3. **One-time capture only** (no background tracking)
4. **Handle all error cases** (permission denied, services disabled, etc.)
5. **Show permission rationale** before requesting
6. **Cache location** if needed within same session
7. **Don't track continuously** (battery drain)
8. **Test on real devices** (emulators have different behavior)
9. **Provide fallback** for permission denial
10. **Reverse geocode for addresses** when displaying to users

## Testing

### Testing Location Services
```typescript
// Mock expo-location for testing
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// Test
import * as Location from 'expo-location';

describe('LocationService', () => {
  it('should get current location', async () => {
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 39.1836, longitude: -96.5717 },
      timestamp: Date.now(),
    });

    const location = await LocationService.getCurrentLocation();
    expect(location?.latitude).toBe(39.1836);
  });
});
```

## References

- expo-location docs: https://docs.expo.dev/versions/latest/sdk/location/
- iOS Location Best Practices: https://developer.apple.com/documentation/corelocation
- Android Location Best Practices: https://developer.android.com/training/location
