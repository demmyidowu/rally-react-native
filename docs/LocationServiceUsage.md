# Location Service Usage Guide

## Overview

The `locationService` is a battery-efficient, singleton service that provides one-time location capture for the Rally React Native app. It uses expo-location with high accuracy and implements strict timeout controls.

## Key Features

- **One-time capture**: No continuous tracking (battery efficient)
- **High accuracy**: Uses GPS for precise location (~10m accuracy)
- **10-second timeout**: Prevents battery drain from stuck requests
- **Geocoding**: Converts coordinates to human-readable addresses
- **Firebase integration**: Returns GeoPoint objects for Firestore
- **Error handling**: Comprehensive error types with user-friendly messages

## Installation

The service is already configured in the project. Ensure `expo-location` is installed:

```bash
npm install expo-location
```

## Permission Configuration

### iOS (Info.plist)

Add to your `app.json` or `Info.plist`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to connect you with a designated driver"
      }
    }
  }
}
```

### Android (AndroidManifest.xml)

Add to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": ["ACCESS_FINE_LOCATION"]
    }
  }
}
```

## Basic Usage

### 1. Import the Service

```typescript
import { locationService, LocationServiceError, LocationErrorType } from '@/services/locationService';
```

### 2. Request Permission

```typescript
// Request permission before capturing location
const { granted, status } = await locationService.requestLocationPermission();

if (!granted) {
  // Show error to user
  Alert.alert(
    'Location Permission Required',
    'Please enable location access in Settings to request a ride.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  );
  return;
}
```

### 3. Check Permission Status

```typescript
// Check if permission is already granted
const hasPermission = await locationService.hasLocationPermission();

if (!hasPermission) {
  // Request permission
  await locationService.requestLocationPermission();
}
```

### 4. Capture Location Once

```typescript
try {
  // Capture location with address (high accuracy)
  const result = await locationService.getCurrentLocation();

  console.log('Location:', result);
  // {
  //   geoPoint: GeoPoint { latitude: 39.1836, longitude: -96.5717 },
  //   latitude: 39.1836,
  //   longitude: -96.5717,
  //   address: '123 Main St, Manhattan, KS 66502'
  // }

  // Use the GeoPoint to save to Firestore
  await firestore().collection('rides').add({
    pickupLocation: result.geoPoint,
    pickupAddress: result.address,
    // ...other fields
  });

} catch (error) {
  if (error instanceof LocationServiceError) {
    switch (error.type) {
      case LocationErrorType.PERMISSION_DENIED:
        Alert.alert('Permission Denied', 'Please enable location access in Settings.');
        break;
      case LocationErrorType.TIMEOUT:
        Alert.alert('Timeout', 'Could not get your location. Please try again.');
        break;
      case LocationErrorType.LOCATION_UNAVAILABLE:
        Alert.alert('Unavailable', 'Location services are currently unavailable.');
        break;
      default:
        Alert.alert('Error', error.message);
    }
  }
}
```

## Use Cases

### Rider Requests Ride

```typescript
// In RideRequestScreen.tsx or similar
import { locationService } from '@/services/locationService';

const handleRequestRide = async () => {
  setLoading(true);

  try {
    // 1. Check/request permission
    const hasPermission = await locationService.hasLocationPermission();
    if (!hasPermission) {
      const { granted } = await locationService.requestLocationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Location access is needed to request a ride.');
        return;
      }
    }

    // 2. Capture pickup location
    const { geoPoint, address } = await locationService.captureRiderPickupLocation();

    // 3. Create ride request
    const ride = await createRideRequest({
      riderId: currentUser.id,
      eventId: currentEvent.id,
      pickupLocation: geoPoint,
      pickupAddress: address,
      // ...other fields
    });

    // 4. Navigate to ride tracking screen
    navigation.navigate('RideTracking', { rideId: ride.id });

  } catch (error) {
    if (error instanceof LocationServiceError) {
      Alert.alert('Location Error', error.message);
    } else {
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

### DD Marks "En Route"

```typescript
// In DDDashboard.tsx or similar
import { locationService } from '@/services/locationService';

const handleMarkEnRoute = async (rideId: string) => {
  try {
    // 1. Capture DD's current location (no address needed)
    const { geoPoint, latitude, longitude } = await locationService.captureDDLocation();

    // 2. Calculate ETA using a separate service (not shown here)
    const eta = await etaService.calculateETA(
      { latitude, longitude },
      ride.pickupLocation
    );

    // 3. Update ride status
    await updateRide(rideId, {
      status: 'enroute',
      ddLocation: geoPoint,
      estimatedETA: eta,
      enrouteAt: new Date(),
    });

    // 4. Send SMS notification to rider (Cloud Function handles this)

    Alert.alert('Success', `En route! ETA: ${eta} minutes`);

  } catch (error) {
    Alert.alert('Error', 'Failed to update location. Please try again.');
  }
};
```

## Advanced Usage

### Geocoding

#### Reverse Geocoding (Coordinates → Address)

```typescript
// Convert coordinates to address
const address = await locationService.reverseGeocode(39.1836, -96.5717);
console.log(address); // "123 Main St, Manhattan, KS 66502"

// Get detailed address components
const details = await locationService.getReverseGeocodeDetails(39.1836, -96.5717);
console.log(details);
// {
//   street: '123 Main St',
//   city: 'Manhattan',
//   state: 'KS',
//   zip: '66502',
//   fullAddress: '123 Main St, Manhattan, KS 66502'
// }
```

#### Forward Geocoding (Address → Coordinates)

```typescript
// Convert address to coordinates
const result = await locationService.geocodeAddress('123 Main St, Manhattan, KS 66502');
console.log(result);
// {
//   geoPoint: GeoPoint { latitude: 39.1836, longitude: -96.5717 },
//   latitude: 39.1836,
//   longitude: -96.5717
// }
```

### Custom Accuracy

```typescript
import { Accuracy } from 'expo-location';

// Use balanced accuracy (faster, less battery)
const result = await locationService.getLocationWithAccuracy(Accuracy.Balanced);

// Available accuracy levels:
// - Accuracy.Lowest: ~3000m accuracy (fastest, least battery)
// - Accuracy.Low: ~1000m accuracy
// - Accuracy.Balanced: ~100m accuracy
// - Accuracy.High: ~10m accuracy (default for ride requests)
// - Accuracy.Highest: Best possible (~1m on some devices)
// - Accuracy.BestForNavigation: Best for navigation apps
```

### Validation

```typescript
// Validate coordinates
const isValid = locationService.validateCoordinates(39.1836, -96.5717);
console.log(isValid); // true

// Check if location is in Manhattan, KS
const isInManhattan = locationService.isInManhattanKS(39.1836, -96.5717);
console.log(isInManhattan); // true

// This can be used to warn users if they're outside service area
if (!isInManhattan) {
  Alert.alert(
    'Outside Service Area',
    'Rally is currently only available in Manhattan, KS. Your ride request may not be fulfilled.'
  );
}
```

## Error Handling

### Error Types

```typescript
export enum LocationErrorType {
  PERMISSION_DENIED = 'permission-denied',
  PERMISSION_RESTRICTED = 'permission-restricted',
  LOCATION_UNAVAILABLE = 'location-unavailable',
  TIMEOUT = 'timeout',
  GEOCODING_FAILED = 'geocoding-failed',
  INVALID_COORDINATE = 'invalid-coordinate',
}
```

### Handling Errors

```typescript
try {
  const location = await locationService.getCurrentLocation();
} catch (error) {
  if (error instanceof LocationServiceError) {
    switch (error.type) {
      case LocationErrorType.PERMISSION_DENIED:
        // User denied permission or hasn't granted it
        // Show UI to request permission or direct to Settings
        break;

      case LocationErrorType.PERMISSION_RESTRICTED:
        // Location services are restricted (parental controls, etc.)
        Alert.alert('Restricted', 'Location services are restricted on this device.');
        break;

      case LocationErrorType.TIMEOUT:
        // Location request timed out after 10 seconds
        // Suggest user check GPS settings or try again
        break;

      case LocationErrorType.LOCATION_UNAVAILABLE:
        // Location services are disabled or unavailable
        // Direct user to enable location services in device settings
        break;

      case LocationErrorType.GEOCODING_FAILED:
        // Could not convert coordinates to address (or vice versa)
        // This is usually not critical - can still use coordinates
        console.warn('Geocoding failed, using coordinates only');
        break;

      case LocationErrorType.INVALID_COORDINATE:
        // Received invalid coordinates (out of range or 0,0)
        // This indicates a serious issue - retry or show error
        break;
    }
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## React Component Example

### Location Permission Screen

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, Linking, StyleSheet } from 'react-native';
import { locationService } from '@/services/locationService';

const LocationPermissionScreen = ({ onGranted }: { onGranted: () => void }) => {
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const hasPermission = await locationService.hasLocationPermission();
    setPermissionStatus(hasPermission ? 'granted' : 'denied');
    if (hasPermission) {
      onGranted();
    }
  };

  const handleRequestPermission = async () => {
    const { granted } = await locationService.requestLocationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (granted) {
      onGranted();
    } else {
      Alert.alert(
        'Permission Denied',
        'Location access is required to use Rally. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  if (permissionStatus === 'checking') {
    return (
      <View style={styles.container}>
        <Text>Checking location permissions...</Text>
      </View>
    );
  }

  if (permissionStatus === 'granted') {
    return null; // onGranted() will navigate away
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.title}>Location Permission</Text>
      <Text style={styles.description}>
        We need your location to connect you with a designated driver.
        Your location is only captured when you request a ride.
      </Text>
      <Button title="Enable Location" onPress={handleRequestPermission} />
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
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
});

export default LocationPermissionScreen;
```

## Testing

### Unit Tests

```typescript
import { locationService } from '@/services/locationService';

describe('LocationService', () => {
  it('should capture location successfully', async () => {
    // Mock expo-location
    jest.mock('expo-location');

    const result = await locationService.getCurrentLocation();
    expect(result).toHaveProperty('geoPoint');
    expect(result).toHaveProperty('address');
  });
});
```

### Simulator Testing

#### iOS Simulator

1. Run app in iOS Simulator
2. Go to **Features > Location** in Simulator menu
3. Select a location:
   - Custom Location: 39.1836, -96.5717 (Manhattan, KS)
   - Apple: Cupertino, CA
   - City Run: Simulated route

#### Android Emulator

1. Run app in Android Emulator
2. Click **Extended Controls** (three dots) in emulator toolbar
3. Go to **Location** tab
4. Enter coordinates: 39.1836, -96.5717
5. Click **Send**

## Best Practices

### 1. Battery Efficiency

```typescript
// ✅ GOOD: One-time capture
const location = await locationService.getCurrentLocation();

// ❌ BAD: Don't call repeatedly in a loop
setInterval(async () => {
  const location = await locationService.getCurrentLocation();
}, 5000);
```

### 2. Permission Handling

```typescript
// ✅ GOOD: Check permission before capturing
const hasPermission = await locationService.hasLocationPermission();
if (hasPermission) {
  const location = await locationService.getCurrentLocation();
}

// ❌ BAD: Don't assume permission is granted
const location = await locationService.getCurrentLocation(); // May throw
```

### 3. Error Handling

```typescript
// ✅ GOOD: Handle specific error types
try {
  const location = await locationService.getCurrentLocation();
} catch (error) {
  if (error instanceof LocationServiceError) {
    // Handle specific error type
  }
}

// ❌ BAD: Ignore errors
const location = await locationService.getCurrentLocation().catch(() => null);
```

### 4. Geocoding

```typescript
// ✅ GOOD: Geocode only when needed
const { geoPoint, address } = await locationService.getCurrentLocation();

// ❌ BAD: Don't geocode separately if getCurrentLocation() already does it
const { geoPoint, latitude, longitude } = await locationService.captureDDLocation();
const address = await locationService.reverseGeocode(latitude, longitude); // Redundant
```

## Troubleshooting

### Location Permission Denied

**Solution**: Direct user to Settings

```typescript
Alert.alert(
  'Location Permission Required',
  'Please enable location access in Settings.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() }
  ]
);
```

### Location Timeout

**Possible causes**:
- GPS signal is weak (indoors, tall buildings)
- Location services disabled on device
- Network issues (for network-based location)

**Solution**: Suggest user try again or move to open area

```typescript
Alert.alert(
  'Location Timeout',
  'Could not get your location. Please ensure GPS is enabled and try again outdoors.',
  [
    { text: 'Try Again', onPress: handleRequestRide },
    { text: 'Cancel', style: 'cancel' }
  ]
);
```

### Geocoding Failed

**Possible causes**:
- Network issues
- Invalid coordinates
- No address data for location

**Solution**: Fall back to coordinates

```typescript
try {
  const { geoPoint, address } = await locationService.getCurrentLocation();
} catch (error) {
  if (error.type === LocationErrorType.GEOCODING_FAILED) {
    // Use coordinates only
    const { geoPoint, latitude, longitude } = await locationService.captureDDLocation();
    const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}
```

## API Reference

See [locationService.ts](../src/services/locationService.ts) for complete API documentation.

### Main Methods

- `requestLocationPermission()`: Request location permission
- `hasLocationPermission()`: Check if permission is granted
- `getCurrentLocation()`: Capture location with address (high accuracy)
- `getLocationWithAccuracy(accuracy)`: Capture location with custom accuracy
- `reverseGeocode(lat, lon)`: Convert coordinates to address
- `geocodeAddress(address)`: Convert address to coordinates
- `captureRiderPickupLocation()`: Convenience method for rider pickup
- `captureDDLocation()`: Convenience method for DD location
- `validateCoordinates(lat, lon)`: Validate coordinate range
- `isInManhattanKS(lat, lon)`: Check if location is in service area

## Battery Impact

The location service is designed for minimal battery impact:

- **One-time captures**: No continuous tracking
- **High accuracy**: Only when needed (ride requests)
- **10-second timeout**: Prevents stuck requests
- **No background location**: Only "When In Use" permission

Estimated battery impact: **< 1% per ride request**

## Privacy

- **No tracking**: Location is only captured when user initiates action
- **When In Use only**: No background location tracking
- **User consent**: Permission requested with clear explanation
- **Minimal data**: Only coordinates and address are stored
- **Firestore**: Location data is stored securely in Firebase

## Related Services

- **ETA Service**: Calculates driving time between locations (to be implemented)
- **Ride Service**: Creates and manages ride requests
- **Notification Service**: Sends SMS notifications with location updates
