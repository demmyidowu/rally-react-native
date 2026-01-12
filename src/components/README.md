# Rally React Native Component Library

A comprehensive collection of reusable, production-ready UI components for the Rally app with K-State branding.

## Design System

### Colors
- **Primary**: K-State Purple (#512888)
- **Secondary**: Rally Red/Maroon (#8B1538)
- **Success**: Green (#22C55E)
- **Warning**: Yellow (#EAB308)
- **Error**: Red (#EF4444)
- **Info**: Blue (#3B82F6)

### Typography
All components use consistent typography from `theme.ts`:
- **h1**: 32px, bold
- **h2**: 24px, bold
- **h3**: 20px, 600 weight
- **body**: 16px, normal
- **caption**: 14px, normal
- **small**: 12px, normal

## Components

### Core Components

#### Button
Multi-variant button component with loading and disabled states.

```tsx
import { Button } from '@/components';

<Button
  title="Request Ride"
  onPress={handlePress}
  variant="primary" // 'primary' | 'secondary' | 'danger'
  loading={false}
  disabled={false}
  fullWidth
  icon="car" // Ionicons name
/>
```

**Variants:**
- `primary`: K-State purple background, white text
- `secondary`: White background, purple border and text
- `danger`: Red background, white text (for destructive actions)

---

#### Input
Text input with label, validation, and error display.

```tsx
import { Input } from '@/components';

<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="you@ksu.edu"
  error={emailError}
  icon="mail"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

**Features:**
- Automatic error styling
- Icon support
- Multiline support
- Disabled state styling

---

#### Card
Container component with elevation and optional press handling.

```tsx
import { Card } from '@/components';

<Card
  onPress={() => navigate('RideDetails')}
  elevation="md" // 'sm' | 'md' | 'lg'
>
  <Text>Card content</Text>
</Card>
```

---

### Complex Components

#### RideCard
Display comprehensive ride information.

```tsx
import { RideCard } from '@/components';

<RideCard
  ride={ride}
  onPress={() => viewRideDetails(ride.id)}
  showDD={true}
  showPriority={true}
  riderName={rider.name}
  ddName={dd?.name}
/>
```

**Features:**
- Emergency badge for emergency rides
- Status badge
- Queue position display
- Pickup/dropoff addresses
- DD information (optional)
- Estimated wait time
- Priority score
- Notes section

---

#### DDCard
Display designated driver information and status.

```tsx
import { DDCard } from '@/components';

<DDCard
  ddAssignment={ddAssignment}
  user={user}
  activeRidesCount={3}
  onToggleActive={handleToggle}
  showToggle={true}
  onPress={() => viewDDDetails(ddAssignment.id)}
/>
```

**Features:**
- Avatar with photo or initials
- Car description
- Active rides count
- Total completed rides
- Active/inactive status
- Toggle switch for DD to enable/disable
- Warning for excessive toggling

---

#### Avatar
User avatar with automatic color generation and initials fallback.

```tsx
import { Avatar } from '@/components';

<Avatar
  uri={user.photoURL}
  name={user.name}
  size={56}
/>
```

**Features:**
- Displays image if URI provided
- Falls back to initials if no image
- Consistent color generation based on name
- Customizable size

---

#### StatusBadge
Visual status indicator for rides and events.

```tsx
import { StatusBadge } from '@/components';

<StatusBadge
  status={ride.status} // RideStatus or EventStatus
  size="medium" // 'small' | 'medium'
/>
```

**Status Colors:**
- **Queued**: Warning yellow
- **Assigned**: Info blue
- **En Route**: Rally red/maroon
- **Completed**: Success green
- **Cancelled**: Gray

---

#### QueuePosition
Animated queue position indicator with progress bar.

```tsx
import { QueuePosition } from '@/components';

<QueuePosition
  position={3}
  totalInQueue={10}
  estimatedWaitTime={15}
/>
```

**Features:**
- Animated progress bar
- Color-coded position (green for #1, blue for top 3, yellow for top 5)
- Percentage complete indicator
- Estimated wait time display
- "You're next!" banner for position #1

---

#### PhoneNumberInput
Auto-formatting phone input with E.164 conversion.

```tsx
import { PhoneNumberInput } from '@/components';

<PhoneNumberInput
  label="Phone Number"
  value={phone}
  onChangeText={setPhone}
  error={phoneError}
/>
```

**Features:**
- Automatic formatting: (555) 123-4567
- Converts to E.164 format: +15551234567
- Real-time validation
- Phone icon included

---

### UI State Components

#### LoadingSpinner
Centered loading indicator with optional message.

```tsx
import { LoadingSpinner } from '@/components';

<LoadingSpinner
  message="Loading rides..."
  size="large" // 'small' | 'large'
  color={colors.primary}
/>
```

---

#### ErrorMessage
Full-screen error display with retry functionality.

```tsx
import { ErrorMessage } from '@/components';

<ErrorMessage
  message="Failed to load rides. Please check your connection."
  onRetry={refetchRides}
  dismissable
  onDismiss={handleDismiss}
/>
```

---

#### EmptyState
Display when lists are empty.

```tsx
import { EmptyState } from '@/components';

<EmptyState
  icon="car-outline"
  title="No Active Rides"
  message="There are no rides in the queue right now."
  actionTitle="Request a Ride"
  onAction={handleRequestRide}
/>
```

---

### Navigation Components

#### Header
Custom header with back button and action buttons.

```tsx
import { Header } from '@/components';

<Header
  title="Active Rides"
  showBack
  onBack={() => navigation.goBack()}
  rightActions={[
    {
      icon: 'add',
      onPress: handleAdd,
      accessibilityLabel: 'Add new ride',
    },
    {
      icon: 'settings',
      onPress: handleSettings,
      accessibilityLabel: 'Settings',
    },
  ]}
/>
```

---

### Feature Components

#### EmergencyButton
Large emergency button with confirmation modal.

```tsx
import { EmergencyButton } from '@/components';

<EmergencyButton
  onEmergency={handleEmergency}
  disabled={hasActiveRide}
/>
```

**Features:**
- Large, prominent red button
- Warning icon
- Confirmation modal
- Explains emergency priority
- Platform-specific button ordering (iOS vs Android)

---

## Usage

### Importing Components

```tsx
// Import individual components
import { Button, Input, Card } from '@/components';

// Import theme
import { colors, spacing, typography } from '@/components';
```

### Theme Usage

```tsx
import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '@/components';

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
});
```

## Accessibility

All components include:
- Proper `accessibilityRole` attributes
- `accessibilityLabel` for interactive elements
- `accessibilityHint` where appropriate
- `accessibilityState` for disabled/selected states
- Sufficient color contrast ratios
- Minimum touch target sizes (48x48)

## Testing

Components can be tested using React Native Testing Library:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components';

test('Button calls onPress when tapped', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <Button title="Test" onPress={onPress} />
  );

  fireEvent.press(getByText('Test'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

## Best Practices

1. **Consistency**: Always use components from this library rather than creating one-off components
2. **Theme Usage**: Use theme constants instead of hardcoded values
3. **Accessibility**: Ensure all interactive elements have proper labels
4. **TypeScript**: Use provided interfaces for type safety
5. **Performance**: Use React.memo() for components in lists
6. **Responsive**: Test components on different screen sizes

## File Structure

```
src/components/
├── theme.ts                  # Design tokens
├── Button.tsx                # Core button
├── Input.tsx                 # Text input
├── Card.tsx                  # Container
├── RideCard.tsx              # Ride display
├── DDCard.tsx                # DD display
├── Avatar.tsx                # User avatar
├── StatusBadge.tsx           # Status indicator
├── QueuePosition.tsx         # Queue display
├── PhoneNumberInput.tsx      # Phone input
├── LoadingSpinner.tsx        # Loading state
├── ErrorMessage.tsx          # Error state
├── EmptyState.tsx            # Empty state
├── Header.tsx                # Navigation header
├── EmergencyButton.tsx       # Emergency action
└── index.ts                  # Barrel exports
```

## Contributing

When adding new components:

1. Create the component file in `src/components/`
2. Include TypeScript interfaces for props
3. Add proper JSDoc comments
4. Include accessibility attributes
5. Use theme constants
6. Export from `index.ts`
7. Update this README with usage examples

## License

Copyright © 2025 Rally - K-State Fraternity & Sorority DD Management
