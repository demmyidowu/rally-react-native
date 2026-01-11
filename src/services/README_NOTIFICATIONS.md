# Notification Service Documentation

## Overview
The Rally notification service provides a comprehensive solution for managing push notifications using `expo-notifications`. It handles permissions, FCM token management, notification handlers, and navigation.

## Features
- ✅ Request and manage notification permissions (iOS & Android)
- ✅ Register for push notifications and get FCM token
- ✅ Handle received notifications (foreground)
- ✅ Handle notification taps (background/terminated)
- ✅ Save FCM token to user's Firestore document
- ✅ Configure notification channels (Android)
- ✅ Schedule local notifications
- ✅ Badge count management (iOS)
- ✅ Navigation based on notification type

## Installation

The required dependencies are already in `package.json`:
```json
{
  "expo-notifications": "~0.32.16"
}
```

## Configuration

### 1. app.json Configuration
Add notification configuration to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF6B35",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#FF6B35",
      "androidMode": "default",
      "androidCollapsedTitle": "Rally"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### 2. Firebase Cloud Messaging Setup

#### iOS
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in your project root
3. Add to `app.json` (see above)

#### Android
1. Download `google-services.json` from Firebase Console
2. Place it in your project root
3. Add to `app.json` (see above)

### 3. Update Expo Project ID
In `notificationService.ts`, update the project ID:

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-expo-project-id', // Replace with your actual Expo project ID
});
```

Find your project ID in your `app.json` under `"extra": { "eas": { "projectId": "..." } }`

## Usage

### Basic Setup in App.tsx

```typescript
import { useEffect } from 'react';
import notificationService from './src/services/notificationService';
import { useNavigation } from '@react-navigation/native';
import { NotificationType } from './src/types/notifications';

export default function App() {
  const navigation = useNavigation();

  useEffect(() => {
    // Initialize notification service with navigation callback
    notificationService.initialize((type, data) => {
      const navParams = notificationService.getNavigationParams(type, data);
      if (navParams) {
        navigation.navigate(navParams.screen, navParams.params);
      }
    });

    return () => {
      notificationService.cleanup();
    };
  }, []);

  return <YourApp />;
}
```

### Using the Hook

```typescript
import { useEffect } from 'react';
import { useNotifications } from './src/hooks/useNotifications';
import { NotificationType } from './src/types/notifications';

function LoginScreen() {
  const { registerForPush, permissionStatus } = useNotifications(
    true, // auto-initialize
    (type, data) => {
      // Handle navigation based on notification type
      console.log('Notification tapped:', type, data);
    }
  );

  const handleLogin = async (userId: string) => {
    // After successful login, register for push notifications
    const token = await registerForPush(userId);
    console.log('FCM Token:', token);
  };

  return <YourLoginForm onLogin={handleLogin} />;
}
```

### Direct Service Usage

```typescript
import notificationService from './src/services/notificationService';

// Request permissions
const status = await notificationService.requestPermissions();

// Register for push notifications
const token = await notificationService.registerForPushNotifications();

// Save token to Firestore
await notificationService.saveTokenToFirestore(userId, token);

// Or do all at once
const token = await notificationService.completeRegistration(userId);

// Schedule local notification
const notificationId = await notificationService.scheduleLocalNotification(
  'Ride Assigned',
  'A DD is on the way!',
  { type: NotificationType.DD_EN_ROUTE, rideId: '123' }
);

// Set badge count (iOS)
await notificationService.setBadgeCount(5);

// Cancel all notifications
await notificationService.cancelAllNotifications();
```

## Notification Types

The service supports these notification types from Cloud Functions:

### 1. Ride Assigned
```typescript
{
  type: NotificationType.RIDE_ASSIGNED,
  data: {
    rideId: 'ride123',
    ddId: 'dd456',
    pickupLocation: '123 Main St',
  }
}
// Navigates to: DDDashboard
```

### 2. DD En Route
```typescript
{
  type: NotificationType.DD_EN_ROUTE,
  data: {
    rideId: 'ride123',
    eta: 5, // minutes
  }
}
// Navigates to: ActiveRide
```

### 3. Emergency Alert
```typescript
{
  type: NotificationType.EMERGENCY_ALERT,
  data: {
    rideId: 'ride123',
    riderId: 'rider789',
    riderName: 'John Doe',
    location: '123 Main St',
  }
}
// Navigates to: AdminDashboard with emergency flag
```

### 4. DD Activity Warning
```typescript
{
  type: NotificationType.DD_ACTIVITY_WARNING,
  data: {
    ddId: 'dd456',
    inactiveCount: 2,
    warningLevel: 'first',
  }
}
// Navigates to: DDProfile
```

## Android Notification Channels

The service automatically creates these channels:

1. **Default** - General notifications
2. **Rides** - Ride updates (high priority, vibration, LED)
3. **Emergency** - Critical alerts (max priority, strong vibration, red LED)
4. **Activity** - DD activity warnings (high priority)

## Cloud Functions Integration

The existing Cloud Functions from the Swift project can be reused. They should send notifications in this format:

```typescript
// Example Cloud Function
admin.messaging().send({
  token: userFcmToken,
  notification: {
    title: 'DD En Route',
    body: 'Your DD will arrive in 5 minutes',
  },
  data: {
    type: 'dd_en_route',
    rideId: 'ride123',
    eta: '5',
  },
  apns: {
    payload: {
      aps: {
        sound: 'default',
        badge: 1,
      },
    },
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'rides',
      priority: 'high',
      sound: 'default',
    },
  },
});
```

## Firestore Schema

The service saves FCM tokens to the user document:

```typescript
// users/{userId}
{
  fcmToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  lastTokenUpdate: Timestamp,
  devicePlatform: 'ios' | 'android',
  // ... other user fields
}
```

## Testing

### 1. Test with Expo Push Tool
Use the Expo push notification tool: https://expo.dev/notifications

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Test Notification",
  "body": "This is a test!",
  "data": {
    "type": "general",
    "someData": "goes here"
  }
}
```

### 2. Test with Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Select target (single device or topic)
5. Add custom data in "Additional options"

### 3. Test Locally with Cloud Functions
```typescript
// In Firebase Cloud Functions
const sendTestNotification = async (userId: string) => {
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: 'Test Notification',
      body: 'This is a test from Cloud Functions',
    },
    data: {
      type: 'general',
    },
  });
};
```

## Platform Differences

### iOS
- Requires explicit permission request
- Supports badge counts
- Notification sounds must be < 30 seconds
- Uses APNs (Apple Push Notification service)

### Android
- Supports notification channels
- More granular control over notification behavior
- LED lights and vibration patterns
- Uses FCM (Firebase Cloud Messaging)

## Troubleshooting

### Permissions Denied
```typescript
const status = await notificationService.getPermissionStatus();
if (status === NotificationPermissionStatus.DENIED) {
  // Show alert asking user to enable in settings
  Alert.alert(
    'Notifications Disabled',
    'Please enable notifications in your device settings to receive ride updates.',
    [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]
  );
}
```

### Token Not Saving
- Ensure Firestore rules allow writes to user documents
- Check that userId is correct
- Verify Firebase connection

### Notifications Not Appearing
- Check permission status
- Verify FCM token is saved correctly
- Test with Expo push tool first
- Check device notification settings
- Ensure app is in foreground/background as expected

### Android Channel Issues
- Channels are immutable once created
- To change channel settings, uninstall and reinstall app
- Or create new channel with different ID

## Best Practices

1. **Request permissions at appropriate time**
   - Don't request on app launch
   - Request when user performs action that requires notifications
   - Explain why you need permissions

2. **Handle token refresh**
   - Tokens can expire or change
   - Re-register on app updates
   - Update Firestore when token changes

3. **Clean up listeners**
   - Always call `cleanup()` when unmounting
   - Prevents memory leaks

4. **Test on physical devices**
   - Notifications don't work on simulators/emulators
   - Test on both iOS and Android

5. **Handle edge cases**
   - User denies permissions
   - Network errors
   - Invalid tokens
   - App in different states (foreground/background/terminated)

## References

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
