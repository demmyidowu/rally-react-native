---
name: expo-notifications
description: expo-notifications setup and patterns for React Native. Use when implementing push notifications, local notifications, permission management, or notification handlers for iOS and Android.
---

# Expo Notifications for React Native

## When to Use This Skill
Implementing push and local notifications in React Native with expo-notifications:
- Push notification setup (APNs, FCM)
- Permission management
- Notification handlers and listeners
- Local notifications
- Notification scheduling
- Badge management
- iOS and Android configuration

## Installation

```bash
npx expo install expo-notifications expo-device expo-constants
```

## Configuration

### iOS Configuration (app.json)
```json
{
  "expo": {
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourorg.rally",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#007AFF"
    }
  }
}
```

### Android Configuration (app.json)
```json
{
  "expo": {
    "android": {
      "package": "com.yourorg.rally",
      "permissions": [
        "POST_NOTIFICATIONS"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "googleServicesFile": "./google-services.json"
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#007AFF",
      "androidMode": "default",
      "androidCollapsedTitle": "Rally"
    }
  }
}
```

## Permission Management

### Request Notification Permission
```typescript
// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export class NotificationService {
  // Request notification permissions
  static async requestPermission(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Check if permission is granted
  static async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  // Get push notification token (for FCM/APNs)
  static async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Get device push token (APNs or FCM)
  static async getDevicePushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getDevicePushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Error getting device push token:', error);
      return null;
    }
  }
}
```

## Notification Handlers

### Configure Notification Behavior
```typescript
// src/config/notifications.ts
import * as Notifications from 'expo-notifications';

// Set notification handler (controls how notifications are handled when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure notification channel for Android
export const configureNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });

    await Notifications.setNotificationChannelAsync('ride-updates', {
      name: 'Ride Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });
  }
};
```

### Notification Listeners
```typescript
// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

interface UseNotificationsProps {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void;
}

export const useNotifications = ({
  onNotificationReceived,
  onNotificationTapped,
}: UseNotificationsProps = {}) => {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        onNotificationTapped?.(response);
      }
    );

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [onNotificationReceived, onNotificationTapped]);
};
```

## Local Notifications

### Schedule Local Notification
```typescript
export class NotificationService {
  // Schedule immediate local notification
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Schedule notification for later
  static async scheduleDelayedNotification(
    title: string,
    body: string,
    seconds: number,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          seconds,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling delayed notification:', error);
      throw error;
    }
  }

  // Schedule notification at specific time
  static async scheduleNotificationAtTime(
    title: string,
    body: string,
    date: Date,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          date,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling notification at time:', error);
      throw error;
    }
  }

  // Cancel notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Cancel all notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Get scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}
```

## Rally-Specific Notification Patterns

### Ride Notification Service
```typescript
// src/services/rideNotificationService.ts
import { NotificationService } from './notificationService';

export class RideNotificationService {
  // Notify rider when ride is assigned
  static async notifyRideAssigned(
    riderName: string,
    ddName: string,
    eta: number
  ): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'Ride Assigned',
      `${ddName} will pick you up in ${eta} minutes`,
      {
        type: 'ride_assigned',
        ddName,
        eta,
      }
    );
  }

  // Notify rider when DD is en route
  static async notifyDDEnRoute(
    ddName: string,
    eta: number
  ): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'DD is on the way',
      `${ddName} is en route. ETA: ${eta} minutes`,
      {
        type: 'dd_enroute',
        ddName,
        eta,
      }
    );
  }

  // Notify rider when DD arrives
  static async notifyDDArrived(ddName: string): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'DD has arrived',
      `${ddName} is here to pick you up`,
      {
        type: 'dd_arrived',
        ddName,
      }
    );
  }

  // Notify DD of new ride assignment
  static async notifyDDNewRide(
    riderName: string,
    pickupAddress: string
  ): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'New Ride Request',
      `Pick up ${riderName} at ${pickupAddress}`,
      {
        type: 'new_ride',
        riderName,
        pickupAddress,
      }
    );
  }

  // Notify admin of emergency ride
  static async notifyEmergency(
    riderName: string,
    pickupAddress: string
  ): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'EMERGENCY RIDE REQUEST',
      `${riderName} needs immediate pickup at ${pickupAddress}`,
      {
        type: 'emergency',
        riderName,
        pickupAddress,
        priority: 'high',
      }
    );
  }

  // Notify DD of inactive status
  static async notifyDDInactive(inactiveMinutes: number): Promise<void> {
    await NotificationService.scheduleLocalNotification(
      'Still Available?',
      `You've been inactive for ${inactiveMinutes} minutes. Are you still available?`,
      {
        type: 'dd_inactive',
        inactiveMinutes,
      }
    );
  }
}
```

## Badge Management

### Badge Count
```typescript
export class NotificationService {
  // Set badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Get badge count
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Clear badge
  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  // Increment badge
  static async incrementBadge(): Promise<void> {
    try {
      const count = await this.getBadgeCount();
      await this.setBadgeCount(count + 1);
    } catch (error) {
      console.error('Error incrementing badge:', error);
    }
  }
}
```

## Push Notifications (Backend)

### Save Push Token to Firestore
```typescript
// src/services/pushTokenService.ts
import { FirestoreService } from './firestoreService';
import { NotificationService } from './notificationService';

export class PushTokenService {
  // Register device push token
  static async registerPushToken(userId: string): Promise<void> {
    try {
      const token = await NotificationService.getPushToken();
      if (!token) {
        console.warn('Could not get push token');
        return;
      }

      // Save to Firestore
      await FirestoreService.updateDocument('users', userId, {
        pushToken: token,
        pushTokenUpdatedAt: Date.now(),
      });

      console.log('Push token registered:', token);
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  // Remove push token (on logout)
  static async unregisterPushToken(userId: string): Promise<void> {
    try {
      await FirestoreService.updateDocument('users', userId, {
        pushToken: null,
        pushTokenUpdatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }
}
```

### Cloud Function to Send Push Notification
```typescript
// functions/src/sendPushNotification.ts
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // Get user's push token from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const pushToken = userDoc.data()?.pushToken;

    if (!pushToken) {
      console.log('No push token for user:', userId);
      return;
    }

    // Verify it's a valid Expo push token
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error('Invalid Expo push token:', pushToken);
      return;
    }

    // Create push message
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
    };

    // Send notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    console.log('Push notification sent:', tickets);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};
```

## Notification Navigation

### Handle Notification Taps
```typescript
// src/navigation/NotificationNavigator.tsx
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../hooks/useNotifications';

export const useNotificationNavigation = () => {
  const navigation = useNavigation();

  useNotifications({
    onNotificationTapped: (response) => {
      const data = response.notification.request.content.data;

      switch (data.type) {
        case 'ride_assigned':
        case 'dd_enroute':
        case 'dd_arrived':
          navigation.navigate('RideDetails', { rideId: data.rideId });
          break;

        case 'new_ride':
          navigation.navigate('DDRideQueue');
          break;

        case 'emergency':
          navigation.navigate('AdminDashboard', { tab: 'emergency' });
          break;

        case 'dd_inactive':
          navigation.navigate('DDAvailability');
          break;

        default:
          console.log('Unknown notification type:', data.type);
      }
    },
  });
};
```

## App.tsx Integration

### Setup Notifications in App
```typescript
// App.tsx
import { useEffect } from 'react';
import { NotificationService } from './src/services/notificationService';
import { PushTokenService } from './src/services/pushTokenService';
import { configureNotificationChannels } from './src/config/notifications';
import { useAuth } from './src/hooks/useAuth';

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    // Configure notification channels (Android)
    configureNotificationChannels();

    // Request permission and register token
    if (user) {
      NotificationService.requestPermission().then((granted) => {
        if (granted) {
          PushTokenService.registerPushToken(user.uid);
        }
      });
    }
  }, [user]);

  return (
    // ... app content
  );
}
```

## Testing

### Test Local Notifications
```typescript
// For testing, you can trigger notifications manually
import { NotificationService } from './src/services/notificationService';

// Test notification
await NotificationService.scheduleLocalNotification(
  'Test Notification',
  'This is a test notification',
  { test: true }
);
```

### Test Push Notifications (Expo Tool)
```bash
# Use Expo's push notification tool
# https://expo.dev/notifications

# Or use curl
curl -H "Content-Type: application/json" -X POST \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Test",
    "body": "Test notification"
  }' \
  https://exp.host/--/api/v2/push/send
```

## Common Pitfalls to Avoid

### 1. Not Requesting Permission
```typescript
// BAD - Assuming permission is granted
const token = await Notifications.getExpoPushTokenAsync();

// GOOD - Request permission first
const hasPermission = await NotificationService.hasPermission();
if (!hasPermission) {
  await NotificationService.requestPermission();
}
const token = await Notifications.getExpoPushTokenAsync();
```

### 2. Forgetting to Remove Listeners
```typescript
// BAD - Memory leak
useEffect(() => {
  Notifications.addNotificationReceivedListener(() => {});
}, []);

// GOOD - Cleanup subscription
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(() => {});
  return () => subscription.remove();
}, []);
```

### 3. Not Configuring Android Channels
```typescript
// BAD - No channel configuration (Android 8.0+)
await Notifications.scheduleNotificationAsync({ ... });

// GOOD - Configure channels first
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.HIGH,
});
```

### 4. Invalid Push Tokens
```typescript
// BAD - Not validating token format
await sendPushNotification(invalidToken);

// GOOD - Validate token
if (Expo.isExpoPushToken(token)) {
  await sendPushNotification(token);
}
```

### 5. Testing Only on Emulator
```typescript
// Push notifications don't work on iOS Simulator
// Always test on physical device!
if (!Device.isDevice) {
  console.warn('Push notifications only work on physical devices');
  return;
}
```

## Best Practices

1. **Request permission early** but with context
2. **Configure Android channels** for Android 8.0+
3. **Handle notification taps** for navigation
4. **Test on physical devices** (not simulators)
5. **Validate push tokens** before sending
6. **Remove listeners** on cleanup
7. **Use appropriate priority** for different notification types
8. **Clear badges** when app opens
9. **Save tokens to backend** for push notifications
10. **Handle permission denial** gracefully

## Notification Content Best Practices

### Good Notification Content
```typescript
// GOOD - Clear, actionable notifications
{
  title: 'DD is on the way',
  body: 'John will pick you up in 5 minutes',
  data: { type: 'dd_enroute', eta: 5 }
}

// GOOD - Emergency notification
{
  title: 'EMERGENCY RIDE REQUEST',
  body: 'Sarah needs immediate pickup at Aggieville',
  data: { type: 'emergency', priority: 'high' }
}
```

### Bad Notification Content
```typescript
// BAD - Vague, not actionable
{
  title: 'Update',
  body: 'Something happened',
  data: {}
}

// BAD - Too verbose
{
  title: 'Your designated driver John Smith has accepted your ride request',
  body: 'He is currently on his way to pick you up from your current location...',
  data: {}
}
```

## Platform Differences

### iOS vs Android
```typescript
// iOS automatically shows notifications when app is backgrounded
// Android requires notification channels (8.0+)

// iOS uses APNs, Android uses FCM
// Both can use Expo push notification service

// Badge count works differently:
// - iOS: Shows on app icon
// - Android: Requires launcher support (not all launchers show badges)
```

## References

- expo-notifications docs: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- APNs: https://developer.apple.com/documentation/usernotifications
- FCM: https://firebase.google.com/docs/cloud-messaging
- Expo Push Tool: https://expo.dev/notifications
