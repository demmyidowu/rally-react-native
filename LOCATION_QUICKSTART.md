# Location Service - Quick Start Guide

## 5-Minute Integration

### 1. Import the Service

```typescript
import { locationService } from '@/services/locationService';
```

### 2. Request Permission

```typescript
const { granted } = await locationService.requestLocationPermission();

if (!granted) {
  Alert.alert('Permission Required', 'Please enable location access');
  return;
}
```

### 3. Capture Location

```typescript
// For Rider (with address)
const { geoPoint, address } = await locationService.captureRiderPickupLocation();

// For DD (no address needed)
const { geoPoint, latitude, longitude } = await locationService.captureDDLocation();
```

### 4. Save to Firestore

```typescript
await firestore().collection('rides').add({
  pickupLocation: geoPoint, // Firebase GeoPoint
  pickupAddress: address,   // Human-readable string
  // ...other fields
});
```

## Common Use Cases

### Rider Requests Ride

```typescript
const handleRequestRide = async () => {
  try {
    // 1. Check permission
    if (!(await locationService.hasLocationPermission())) {
      await locationService.requestLocationPermission();
    }

    // 2. Capture location
    const { geoPoint, address } = await locationService.captureRiderPickupLocation();

    // 3. Create ride
    await createRide({
      pickupLocation: geoPoint,
      pickupAddress: address,
    });

  } catch (error) {
    Alert.alert('Error', 'Failed to get location');
  }
};
```

### DD Marks En Route

```typescript
const handleMarkEnRoute = async (ride: Ride) => {
  try {
    // 1. Capture DD location
    const { geoPoint } = await locationService.captureDDLocation();

    // 2. Update ride
    await updateRide(ride.id, {
      status: 'enroute',
      ddLocation: geoPoint,
    });

  } catch (error) {
    Alert.alert('Error', 'Failed to get location');
  }
};
```

## Error Handling

```typescript
import { LocationServiceError, LocationErrorType } from '@/services/locationService';

try {
  const location = await locationService.getCurrentLocation();
} catch (error) {
  if (error instanceof LocationServiceError) {
    if (error.type === LocationErrorType.PERMISSION_DENIED) {
      // Direct to Settings
    } else if (error.type === LocationErrorType.TIMEOUT) {
      // Retry or suggest outdoor location
    }
  }
}
```

## Permission UI Component

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { locationService } from '@/services/locationService';

const LocationPermission = ({ onGranted }: { onGranted: () => void }) => {
  const handleRequest = async () => {
    const { granted } = await locationService.requestLocationPermission();
    if (granted) {
      onGranted();
    }
  };

  return (
    <View>
      <Text>We need your location to connect you with a driver</Text>
      <Button title="Enable Location" onPress={handleRequest} />
    </View>
  );
};
```

## Testing

### Simulator Setup

**iOS:**
1. Simulator > Features > Location
2. Custom Location: 39.1836, -96.5717 (Manhattan, KS)

**Android:**
1. Emulator > Extended Controls (⋮)
2. Location tab
3. Enter: 39.1836, -96.5717

### Run Tests

```bash
npm test locationService.test.ts
```

## Common Issues

**Timeout Error:**
- Ensure location services enabled on device
- Try outdoor location for better GPS signal

**Permission Denied:**
- Check app.json for permission configuration
- Guide user to Settings > Rally > Location

**Geocoding Failed:**
- Requires internet connection
- Fallback to coordinates if needed

## Full Documentation

- **Complete Guide:** `docs/LocationServiceUsage.md`
- **Implementation Details:** `LOCATION_SERVICE_IMPLEMENTATION.md`
- **Example Components:**
  - `src/screens/Rider/RideRequestExample.tsx`
  - `src/screens/DD/DDEnRouteExample.tsx`

## Key Features

✅ One-time capture (battery efficient)
✅ High accuracy GPS
✅ 10-second timeout
✅ Foreground permission only
✅ Geocoding support
✅ Firebase GeoPoint integration
✅ TypeScript type safety
✅ Comprehensive error handling
✅ iOS & Android support

## API Quick Reference

| Method | Returns | Use Case |
|--------|---------|----------|
| `requestLocationPermission()` | `PermissionResult` | Request permission |
| `hasLocationPermission()` | `boolean` | Check permission |
| `getCurrentLocation()` | `LocationWithAddress` | Capture with address |
| `captureRiderPickupLocation()` | `LocationWithAddress` | Rider requests ride |
| `captureDDLocation()` | `LocationResult` | DD marks en route |
| `reverseGeocode(lat, lon)` | `string` | Coordinates → address |
| `geocodeAddress(address)` | `LocationResult` | Address → coordinates |
| `validateCoordinates(lat, lon)` | `boolean` | Validate range |
| `isInManhattanKS(lat, lon)` | `boolean` | Check service area |

## Next Steps

1. Add permission screen to app navigation
2. Integrate into ride request flow
3. Add to DD dashboard
4. Test on real devices
5. Deploy to production

## Support

Questions? Check:
- `docs/LocationServiceUsage.md` - Full guide
- `__tests__/services/locationService.test.ts` - Test examples
- Example implementations in `src/screens/`

---

**Ready to go!** The location service is production-ready and tested. Just import and use.
