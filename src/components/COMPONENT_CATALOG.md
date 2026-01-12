# Rally Component Library Catalog

Complete catalog of all reusable UI components in the Rally React Native app.

## Component Checklist

### Core Components ✅
- [x] **theme.ts** - Design system with K-State colors, spacing, typography, shadows
- [x] **Button.tsx** - Multi-variant button (primary, secondary, danger) with loading states
- [x] **Input.tsx** - Text input with label, error, validation, and icons
- [x] **Card.tsx** - Container with elevation and press handling

### Complex Display Components ✅
- [x] **RideCard.tsx** - Comprehensive ride information display
  - Emergency badge
  - Status badge
  - Queue position
  - Pickup/dropoff locations
  - DD information
  - Estimated wait time
  - Priority score
  - Notes section

- [x] **DDCard.tsx** - Designated driver information card
  - Avatar with photo
  - Car description
  - Active rides count
  - Total completed count
  - Active/inactive toggle
  - Warning for excessive toggling

- [x] **Avatar.tsx** - User avatar component
  - Image display with fallback
  - Initials generation
  - Consistent color generation
  - Customizable size

- [x] **StatusBadge.tsx** - Visual status indicators
  - Ride statuses (queued, assigned, en route, completed, cancelled)
  - Event statuses (scheduled, active, completed, cancelled)
  - Color-coded by status
  - Two sizes (small, medium)

- [x] **QueuePosition.tsx** - Queue position indicator
  - Animated progress bar
  - Color-coded position
  - Percentage complete
  - Estimated wait time
  - "You're next!" banner

### Form Components ✅
- [x] **PhoneNumberInput.tsx** - Phone number input
  - Automatic formatting: (555) 123-4567
  - E.164 conversion: +15551234567
  - Real-time validation
  - Phone icon

### UI State Components ✅
- [x] **LoadingSpinner.tsx** - Loading indicator
  - Customizable size
  - Optional message
  - Centered layout

- [x] **ErrorMessage.tsx** - Error display
  - Error icon
  - Error message
  - Retry button
  - Dismissable option

- [x] **EmptyState.tsx** - Empty state display
  - Custom icon
  - Title and message
  - Optional action button

### Navigation Components ✅
- [x] **Header.tsx** - Custom navigation header
  - Title
  - Back button
  - Action buttons (multiple)
  - Platform-specific styling

### Feature Components ✅
- [x] **EmergencyButton.tsx** - Emergency ride button
  - Large red button
  - Warning icon
  - Confirmation modal
  - Emergency explanation
  - Platform-specific modal actions

### Export Configuration ✅
- [x] **index.ts** - Barrel exports for easy importing

### Documentation ✅
- [x] **README.md** - Comprehensive usage guide
- [x] **COMPONENT_CATALOG.md** - This catalog

## Component Count

**Total Components Created**: 15 components + 1 theme + 2 docs = **18 files**

## Component Dependencies

```
theme.ts (base)
├── Button.tsx
├── Input.tsx
├── Card.tsx
├── Avatar.tsx
├── StatusBadge.tsx (uses Ride.ts, Event.ts models)
├── LoadingSpinner.tsx
├── ErrorMessage.tsx (uses Button)
├── EmptyState.tsx (uses Button)
├── Header.tsx
├── EmergencyButton.tsx (uses Button)
├── QueuePosition.tsx
├── PhoneNumberInput.tsx (uses Input)
├── RideCard.tsx (uses Card, StatusBadge, Ride.ts model)
└── DDCard.tsx (uses Card, Avatar, DDAssignment.ts, User.ts models)
```

## Model Dependencies

Components use the following TypeScript models from `/src/models/`:

- **Ride.ts**: RideStatus enum, Ride interface, getRideStatusDisplayName
- **Event.ts**: EventStatus enum, Event interface, getEventStatusDisplayName
- **User.ts**: User interface, UserRole enum
- **DDAssignment.ts**: DDAssignment interface

## Theme Design Tokens

### Colors
```typescript
primary: '#512888'        // K-State Purple
secondary: '#8B1538'      // Rally Red/Maroon
white: '#FFFFFF'
black: '#000000'
gray: {100-900}           // 9 shades
success: '#22C55E'        // Green
warning: '#EAB308'        // Yellow
error: '#EF4444'          // Red
info: '#3B82F6'           // Blue
```

### Spacing Scale
```typescript
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

### Border Radius
```typescript
sm: 4px
md: 8px
lg: 12px
full: 9999px (circular)
```

### Typography
```typescript
h1: 32px bold
h2: 24px bold
h3: 20px weight-600
body: 16px normal
caption: 14px normal
small: 12px normal
```

### Shadows
```typescript
sm: elevation 1
md: elevation 4
lg: elevation 8
```

## Icon Library

All components use **@expo/vector-icons (Ionicons)**

Common icons used:
- `car` - Vehicles, DDs
- `location` - Pickup locations
- `flag` - Dropoff locations
- `person` - Users
- `time` - Timestamps
- `hourglass` - Wait times
- `warning` - Emergencies, alerts
- `checkmark-circle` - Success, completed
- `alert-circle` - Errors, warnings
- `add` - Create actions
- `settings` - Settings
- `arrow-back` - Navigation
- `close` - Dismiss actions

## Accessibility Features

All components include:
- ✅ `accessibilityRole` attributes
- ✅ `accessibilityLabel` for interactive elements
- ✅ `accessibilityHint` where appropriate
- ✅ `accessibilityState` for disabled/selected states
- ✅ WCAG AA contrast ratios
- ✅ 48x48 minimum touch targets

## Usage Example

```tsx
import React from 'react';
import { View, FlatList } from 'react-native';
import {
  Header,
  Button,
  RideCard,
  DDCard,
  EmptyState,
  LoadingSpinner,
  ErrorMessage,
  EmergencyButton,
  QueuePosition,
  colors,
  spacing,
} from '@/components';

const RideScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rides, setRides] = useState([]);

  if (loading) {
    return <LoadingSpinner message="Loading rides..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={refetchRides}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Active Rides"
        showBack
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'refresh',
            onPress: refetchRides,
          },
        ]}
      />

      <FlatList
        data={rides}
        renderItem={({ item }) => (
          <RideCard
            ride={item}
            onPress={() => viewDetails(item)}
            showDD
            showPriority
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="No Active Rides"
            message="Request a ride to get started"
            actionTitle="Request Ride"
            onAction={handleRequest}
          />
        }
      />

      <EmergencyButton onEmergency={handleEmergency} />
    </View>
  );
};
```

## Testing Coverage

Components should be tested for:
- ✅ Rendering with required props
- ✅ Rendering with optional props
- ✅ User interactions (press, input)
- ✅ Loading states
- ✅ Error states
- ✅ Accessibility
- ✅ Snapshot testing

## Next Steps

### Potential Future Components
- [ ] EventCard - Display event information
- [ ] MemberCard - Display member/admin information
- [ ] ConfirmationModal - Reusable confirmation dialog
- [ ] DateTimePicker - Custom date/time selector
- [ ] SearchBar - Search input with filters
- [ ] TabBar - Custom tab navigation
- [ ] Toast - Temporary notification messages
- [ ] ChapterBadge - Display chapter affiliation
- [ ] PriorityIndicator - Visual priority display
- [ ] RideTimeline - Visual ride progress tracker

### Enhancements
- [ ] Dark mode support
- [ ] Animation library integration
- [ ] Storybook setup for component showcase
- [ ] Unit tests for all components
- [ ] Performance optimization (React.memo)
- [ ] Skeleton loading states
- [ ] Haptic feedback integration

## Component Quality Checklist

Each component includes:
- ✅ TypeScript interfaces for props
- ✅ JSDoc comments
- ✅ Proper accessibility attributes
- ✅ Theme constant usage
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states (where applicable)
- ✅ Platform-specific optimizations
- ✅ Consistent styling
- ✅ Exported from index.ts

## Related Files

- `/src/models/` - TypeScript data models
- `/src/components/examples/` - Example usage components
- `/package.json` - Dependencies (@expo/vector-icons, etc.)

---

**Last Updated**: January 12, 2025
**Component Library Version**: 1.0.0
**Author**: Rally Development Team
