# Rally React Native - Navigation Structure

## Overview
This directory contains the complete navigation setup for Rally React Native using React Navigation v7 with TypeScript.

## Architecture

### Navigation Hierarchy
```
AppNavigator (Root)
├── Auth Flow (when not authenticated)
│   ├── Login
│   ├── Signup
│   └── Email Verification
│
└── Main Flow (when authenticated)
    ├── Admin Tab (only if role === 'admin')
    │   ├── Admin Dashboard
    │   ├── Event Management
    │   ├── Create Event (modal)
    │   ├── Edit Event (modal)
    │   ├── DD Management
    │   ├── Assign DD (modal)
    │   ├── Member Management
    │   ├── Member Details
    │   ├── Ride History
    │   └── Ride Details
    │
    ├── DD Tab (all users)
    │   ├── DD Dashboard
    │   ├── Active Rides
    │   ├── Ride Details
    │   ├── Navigation (full-screen)
    │   └── Toggle Status (modal)
    │
    └── Rider Tab (all users)
        ├── Rider Dashboard
        ├── Request Ride (modal)
        ├── My Rides
        ├── Ride Details
        └── Queue Status
```

## Files

### Core Navigation Files

#### `types.ts`
Type-safe navigation definitions including:
- Auth stack param lists
- Admin stack param lists
- DD stack param lists
- Rider stack param lists
- Root stack param lists
- Deep linking configuration types
- Helper types for navigation props

#### `AppNavigator.tsx`
Root navigation container that:
- Handles auth vs main flow switching
- Manages deep linking configuration
- Shows loading states during auth check
- Provides global modals (Emergency Ride, Notifications)

#### `AuthNavigator.tsx`
Authentication flow stack:
- Login screen
- Signup screen
- Email verification screen (for KSU email requirement)

#### `MainNavigator.tsx`
Main app bottom tab navigator:
- Conditionally shows Admin tab for admin users
- DD tab for all users
- Rider tab for all users
- Uses K-State purple branding (#512888)

#### `AdminNavigator.tsx`
Admin stack navigator with:
- Event management screens
- DD assignment screens
- Member management screens
- Ride history and audit logs

#### `DDNavigator.tsx`
Designated driver stack navigator with:
- Active ride management
- Navigation to rider location
- Status toggle (active/inactive)

#### `RiderNavigator.tsx`
Rider stack navigator with:
- Ride request flow
- My rides list
- Queue status tracking

## Usage

### Importing Navigation Types

```typescript
import { AuthScreenProps, RiderScreenProps } from '../navigation/types';

// In a screen component
type Props = RiderScreenProps<'RequestRide'>;

const RequestRideScreen: React.FC<Props> = ({ navigation, route }) => {
  // navigation and route are fully typed
  navigation.navigate('RideDetails', { rideId: '123' });
};
```

### Navigating Between Screens

```typescript
// Navigate to a screen in the same stack
navigation.navigate('RideDetails', { rideId: '123' });

// Navigate to a different tab
navigation.navigate('DD', { screen: 'DDDashboard' });

// Go back
navigation.goBack();

// Navigate to root of stack
navigation.popToTop();
```

### Deep Linking

The app supports deep links for:
- Authentication: `rally://login`, `rally://signup`
- Rides: `rally://rider/rides/:rideId`
- DD: `rally://dd/rides/:rideId`
- Admin: `rally://admin/events/:eventId`
- Notifications: `rally://notification/:type/:rideId`
- Emergency: `rally://emergency`

## Authentication Flow

The `AppNavigator` checks Redux state (`state.auth.isAuthenticated`) to determine which flow to show:

1. **Not Authenticated**: Shows `AuthNavigator`
2. **Authenticated**: Shows `MainNavigator`

The switch happens automatically when auth state changes.

## Role-Based Access

The Admin tab in `MainNavigator` is conditionally rendered based on user role:

```typescript
const currentUser = useSelector((state: RootState) => state.auth.user);
const isAdmin = currentUser?.role === 'admin';

{isAdmin && (
  <Tab.Screen name="Admin" component={AdminNavigator} />
)}
```

## Branding

All navigators use K-State purple (#512888) for headers and active tab colors, maintaining consistency with the university brand.

## Modal Presentations

Several screens use modal presentation style:
- Create Event
- Edit Event
- Assign DD
- Request Ride
- Toggle Status
- Emergency Ride
- Notifications

This provides a better UX for temporary actions that users can dismiss.

## Dependencies

```json
{
  "@react-navigation/native": "^7.0.16",
  "@react-navigation/stack": "^7.2.7",
  "@react-navigation/bottom-tabs": "^7.0.0",
  "@expo/vector-icons": "latest",
  "react-native-safe-area-context": "~5.6.0",
  "react-native-screens": "~4.16.0"
}
```

## Next Steps

1. Implement actual screen components (currently placeholders)
2. Add proper authentication logic in auth screens
3. Connect screens to Firebase services
4. Add loading and error states
5. Implement deep link handling in screens
6. Add navigation guards for protected routes
7. Test navigation flows on iOS and Android

## Notes

- All screens are currently placeholders showing "To be implemented"
- Type safety is enforced throughout the navigation system
- The structure mirrors the Swift app's navigation architecture
- Deep linking is configured but needs testing
- Redux store integration is in place for auth state management
