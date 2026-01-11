# Location Service Documentation

## Overview

Battery-efficient location service for Rally React Native app. Implements **one-time location capture only** (no background tracking) for requesting rides and calculating ETAs.

**Migrated from:** `DDRideApp/ios/DDRide/Core/Services/LocationService.swift`

## Key Features

- ✅ One-time location capture (battery efficient)
- ✅ Foreground permission only (no background tracking)
- ✅ 10-second timeout to prevent battery drain
- ✅ Reverse geocoding (coordinate → address)
- ✅ Firebase GeoPoint integration
- ✅ iOS and Android support via expo-location
- ✅ Comprehensive error handling
- ✅ TypeScript support with full type safety

## Installation

The location service requires `expo-location`:

```bash
npx expo install expo-location
```

### iOS Configuration

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "We need your location to connect you with a designated driver."
        }
      ]
    ]
  }
}
```

### Android Configuration

Permissions are automatically added by expo-location plugin.

## Usage

### Import

```typescript
import locationService from '@/services/locationService';
// or
import { locationService } from '@/services/locationService';
```

### Request Permission

```typescript
const hasPermission = await locationService.requestLocationPermission();

if (!hasPermission) {
  // Handle permission denied
  Alert.alert('Permission Required', 'Please enable location access');
}
```

### Capture Location (Coordinate Only)

```typescript
try {
  const { coordinate, geoPoint, timestamp } = await locationService.captureLocationOnce();

  console.log('Latitude:', coordinate.latitude);
  console.log('Longitude:', coordinate.longitude);
  console.log('GeoPoint for Firestore:', geoPoint);
} catch (error) {
  if (error instanceof LocationError) {
    console.error('Location error:', error.message);
  }
}
```

### Capture Location with Address

```typescript
try {
  const { coordinate, geoPoint, address, timestamp } =
    await locationService.captureLocationAndAddress();

  console.log('Address:', address);
  console.log('Coordinate:', coordinate);
} catch (error) {
  console.error('Error:', error);
}
```

### Geocode a Coordinate

```typescript
const coordinate = { latitude: 39.1836, longitude: -96.5717 };
const address = await locationService.geocodeAddress(coordinate);
console.log('Address:', address); // "123 Main St, Manhattan, KS 66502"
```

### Check Permission Status

```typescript
const isAuthorized = locationService.isAuthorized;
const status = locationService.currentPermissionStatus;

if (status === PermissionStatus.DENIED) {
  // Show "Open Settings" button
}
```

## React Hook Usage

### useLocation Hook

```typescript
import { useLocation } from '@/hooks/useLocation';

function RideRequestScreen() {
  const {
    location,
    address,
    isLoading,
    error,
    captureLocationWithAddress,
  } = useLocation();

  const handleRequestRide = async () => {
    try {
      await captureLocationWithAddress();
      // location and address are now available
      console.log('Pickup:', address);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <View>
      <Button onPress={handleRequestRide} disabled={isLoading}>
        Request Ride
      </Button>
      {address && <Text>{address}</Text>}
      {error && <Text>{error}</Text>}
    </View>
  );
}
```

### useLocationPermission Hook

```typescript
import { useLocationPermission } from '@/hooks/useLocation';

function PermissionPrompt() {
  const { status, isGranted, requestPermission } = useLocationPermission();

  if (isGranted) {
    return <MainContent />;
  }

  return (
    <View>
      <Text>Location permission required</Text>
      <Button onPress={requestPermission}>Enable Location</Button>
    </View>
  );
}
```

## Two Location Captures Per Ride

### 1. Rider Requests Ride

**When:** Rider taps "Request Ride" button

**Purpose:** Capture pickup location

**Flow:**
```typescript
// Rider requests ride
const { coordinate, geoPoint, address } =
  await locationService.captureLocationAndAddress();

// Save to Firestore
await addDoc(collection(db, 'rides'), {
  riderId: userId,
  pickupAddress: address,
  pickupLocation: geoPoint, // Firebase GeoPoint
  status: 'queued',
  requestTime: new Date(),
});
```

### 2. DD Marks En Route

**When:** DD taps "Mark En Route" button

**Purpose:** Capture DD location for ETA calculation

**Flow:**
```typescript
// DD marks en route
const { coordinate, geoPoint } =
  await locationService.captureLocationOnce();

// Update ride in Firestore
await updateDoc(doc(db, 'rides', rideId), {
  status: 'enroute',
  ddLocation: geoPoint, // DD's current location
  enrouteTime: new Date(),
});

// Cloud Function will:
// 1. Calculate ETA using Google Maps API
// 2. Send SMS to rider with ETA
```

## Error Handling

### Error Types

```typescript
enum LocationErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',      // Permission denied
  RESTRICTED = 'RESTRICTED',          // Parental controls
  TIMEOUT = 'TIMEOUT',                // Location timeout (10s)
  UNAVAILABLE = 'UNAVAILABLE',        // Services disabled
  GEOCODING_FAILED = 'GEOCODING_FAILED',
  INVALID_COORDINATE = 'INVALID_COORDINATE',
}
```

### Handle Errors

```typescript
try {
  await locationService.captureLocationOnce();
} catch (error) {
  if (error instanceof LocationError) {
    switch (error.code) {
      case LocationErrorCode.UNAUTHORIZED:
        // Show permission settings
        break;
      case LocationErrorCode.TIMEOUT:
        // Retry or show error
        break;
      case LocationErrorCode.GEOCODING_FAILED:
        // Use coordinate without address
        break;
    }
  }
}
```

### User-Friendly Error Messages

```typescript
import { getLocationErrorMessage, LocationErrorCode } from '@/services/locationService';

const message = getLocationErrorMessage(LocationErrorCode.UNAUTHORIZED);
// "Location permission is required to request a ride. Please enable location access in Settings."
```

## Battery Optimization

### Why Battery Efficient?

1. **One-Time Capture**: Uses `getCurrentPositionAsync()` not continuous monitoring
2. **No Background Tracking**: Only "When In Use" permission
3. **10-Second Timeout**: Prevents indefinite battery drain
4. **High Accuracy Only**: Only used during the brief capture moment
5. **Immediate Stop**: No lingering location services

### Battery Usage

| Method | Battery Impact |
|--------|----------------|
| Continuous Tracking | High (constant GPS) |
| Background Location | Very High (always on) |
| **One-Time Capture** | **Minimal (2-10 seconds)** |

## Testing

### Test on Simulator

```typescript
// iOS Simulator: Features > Location > Custom Location
// Android Emulator: Extended Controls > Location

// Test different scenarios
const testCoordinate = { latitude: 39.1836, longitude: -96.5717 };
```

### Test Permission States

```typescript
// Test scenarios:
// 1. Fresh install (undetermined)
// 2. Permission granted
// 3. Permission denied
// 4. Location services disabled
// 5. Restricted (parental controls)
```

### Test Timeout

```typescript
// Simulate timeout by:
// - Turning off location services
// - Using "None" location in simulator
// - Should timeout after 10 seconds
```

### Test Geocoding

```typescript
// Valid addresses
const manhattanKS = { latitude: 39.1836, longitude: -96.5717 };
await locationService.geocodeAddress(manhattanKS);
// Expected: "Manhattan, KS"

// Invalid coordinates
const invalid = { latitude: 999, longitude: 999 };
// Expected: LocationError with INVALID_COORDINATE
```

## API Reference

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `requestLocationPermission()` | - | `Promise<boolean>` | Request foreground permission |
| `captureLocationOnce()` | - | `Promise<LocationResult>` | Capture location once |
| `captureLocationAndAddress()` | - | `Promise<LocationWithAddress>` | Capture with address |
| `geocodeAddress()` | `coordinate: Coordinate` | `Promise<string>` | Convert coordinate to address |
| `getLastCapturedLocation()` | - | `Coordinate \| null` | Get cached location |
| `clearCache()` | - | `void` | Clear cached data |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAuthorized` | `boolean` | True if permission granted |
| `currentPermissionStatus` | `PermissionStatus` | Current permission state |

### Types

```typescript
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LocationResult {
  coordinate: Coordinate;
  geoPoint: GeoPoint; // Firebase GeoPoint
  timestamp: Date;
}

interface LocationWithAddress extends LocationResult {
  address: string;
}

enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
  GRANTED = 'granted',
  RESTRICTED = 'restricted',
}
```

## Example Components

See example implementations:

1. **LocationPermissionPrompt.tsx** - Permission UI component
2. **RideRequestExample.tsx** - Rider requesting ride with location
3. **DDEnRouteExample.tsx** - DD marking en route with location

## Firestore Integration

### Save Location to Firestore

```typescript
import { GeoPoint } from 'firebase/firestore';

const { coordinate, geoPoint, address } =
  await locationService.captureLocationAndAddress();

await addDoc(collection(db, 'rides'), {
  pickupAddress: address,
  pickupLocation: geoPoint, // GeoPoint type
  // ...
});
```

### Query by Location (Geohashing)

For location-based queries, use a geohashing library like `geofire-common`:

```typescript
import { geohashQueryBounds } from 'geofire-common';

const center = [coordinate.latitude, coordinate.longitude];
const radiusInM = 5000; // 5km

const bounds = geohashQueryBounds(center, radiusInM);
// Use bounds for Firestore queries
```

## Migration Notes from Swift

| Swift (Core Location) | React Native (expo-location) |
|----------------------|------------------------------|
| `requestWhenInUseAuthorization()` | `requestForegroundPermissionsAsync()` |
| `requestLocation()` | `getCurrentPositionAsync()` |
| `CLLocationCoordinate2D` | `Coordinate` interface |
| `CLGeocoder` | `reverseGeocodeAsync()` |
| `kCLLocationAccuracyBest` | `Accuracy.High` |
| `CLLocationManagerDelegate` | Promise-based async/await |

## Troubleshooting

### Location Permission Not Working

**iOS:**
- Check `app.json` has `expo-location` plugin
- Rebuild app: `npx expo prebuild --clean`
- Check Info.plist has `NSLocationWhenInUseUsageDescription`

**Android:**
- Check permissions in AndroidManifest.xml
- Ensure Google Play Services is available

### Location Timeout

- Check device has location services enabled
- Ensure device has GPS signal (not in building)
- Check if using "None" in simulator

### Geocoding Fails

- Requires internet connection
- May fail in remote areas without map data
- Fallback: Use coordinates without address

### Permission Denied

- Show "Open Settings" button
- Use `Linking.openSettings()` on Android
- Use `Linking.openURL('app-settings:')` on iOS

## Performance Considerations

- **First Capture**: ~2-5 seconds (cold start GPS)
- **Subsequent Captures**: ~1-2 seconds (warm GPS)
- **Timeout**: 10 seconds maximum
- **Network**: Geocoding requires internet
- **Cache**: Last location cached in memory (not persisted)

## Privacy Compliance

- Only "When In Use" permission (not "Always")
- Location captured only on explicit user action
- No background tracking
- Clear permission prompts with explanations
- Follows iOS/Android privacy guidelines

## Links

- **expo-location docs**: https://docs.expo.dev/versions/latest/sdk/location/
- **Firebase GeoPoint**: https://firebase.google.com/docs/reference/js/firestore_.geopoint
- **Swift Reference**: `/Users/didowu/DDRideApp/ios/DDRide/Core/Services/LocationService.swift`

## Support

For issues or questions:
1. Check this README
2. See example components
3. Review Swift implementation
4. Check expo-location documentation
