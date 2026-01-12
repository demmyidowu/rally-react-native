# Rally Component Library - Quick Reference

## Import Shortcuts

```tsx
// Everything from components
import {
  // Theme
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,

  // Core
  Button,
  Input,
  Card,

  // Complex
  RideCard,
  DDCard,
  Avatar,
  StatusBadge,
  QueuePosition,
  PhoneNumberInput,

  // UI State
  LoadingSpinner,
  ErrorMessage,
  EmptyState,

  // Navigation
  Header,

  // Features
  EmergencyButton,
} from '@/components';
```

## Common Patterns

### Button Variants

```tsx
// Primary (K-State Purple)
<Button title="Submit" onPress={handleSubmit} variant="primary" />

// Secondary (White with Purple Border)
<Button title="Cancel" onPress={handleCancel} variant="secondary" />

// Danger (Red)
<Button title="Delete" onPress={handleDelete} variant="danger" />

// With Loading
<Button title="Submit" onPress={handleSubmit} loading={isSubmitting} />

// With Icon
<Button title="Request Ride" onPress={handleRequest} icon="car" />

// Full Width
<Button title="Continue" onPress={handleContinue} fullWidth />
```

### Input Fields

```tsx
// Text Input
<Input
  label="Name"
  value={name}
  onChangeText={setName}
  placeholder="Enter your name"
/>

// Email Input
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  icon="mail"
/>

// Password Input
<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  icon="lock-closed"
/>

// With Error
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  error="Invalid email address"
/>

// Phone Number
<PhoneNumberInput
  label="Phone"
  value={phone}
  onChangeText={setPhone}
/>
```

### Card Usage

```tsx
// Static Card
<Card>
  <Text>Card Content</Text>
</Card>

// Pressable Card
<Card onPress={() => navigate('Details')}>
  <Text>Tap me</Text>
</Card>

// With Custom Elevation
<Card elevation="lg">
  <Text>High elevation card</Text>
</Card>
```

### Display Components

```tsx
// Ride Card
<RideCard
  ride={ride}
  riderName={rider.name}
  ddName={dd?.name}
  showDD
  showPriority
  onPress={() => viewDetails(ride.id)}
/>

// DD Card
<DDCard
  ddAssignment={assignment}
  user={user}
  activeRidesCount={3}
  onToggleActive={handleToggle}
  showToggle
/>

// Avatar
<Avatar uri={user.photoURL} name={user.name} size={56} />

// Status Badge
<StatusBadge status={ride.status} size="medium" />

// Queue Position
<QueuePosition
  position={3}
  totalInQueue={10}
  estimatedWaitTime={15}
/>
```

### UI States

```tsx
// Loading
{loading && <LoadingSpinner message="Loading rides..." />}

// Error
{error && (
  <ErrorMessage
    message={error}
    onRetry={refetch}
    dismissable
    onDismiss={() => setError(null)}
  />
)}

// Empty State
{!loading && rides.length === 0 && (
  <EmptyState
    icon="car-outline"
    title="No Rides"
    message="You don't have any active rides"
    actionTitle="Request Ride"
    onAction={handleRequest}
  />
)}
```

### Header

```tsx
// Basic Header
<Header title="My Rides" />

// With Back Button
<Header
  title="Ride Details"
  showBack
  onBack={() => navigation.goBack()}
/>

// With Actions
<Header
  title="Active Rides"
  showBack
  onBack={() => navigation.goBack()}
  rightActions={[
    {
      icon: 'add',
      onPress: handleAdd,
      accessibilityLabel: 'Add ride',
    },
    {
      icon: 'refresh',
      onPress: handleRefresh,
      accessibilityLabel: 'Refresh',
    },
  ]}
/>
```

### Emergency Button

```tsx
<EmergencyButton
  onEmergency={handleEmergencyRequest}
  disabled={hasActiveRide}
/>
```

## Theme Usage

### Colors

```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,      // K-State Purple
    borderColor: colors.secondary,        // Rally Red
  },
  text: {
    color: colors.white,                  // White
  },
  error: {
    color: colors.error,                  // Red
  },
  success: {
    color: colors.success,                // Green
  },
});
```

### Spacing

```tsx
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,                  // 16px
    margin: spacing.lg,                   // 24px
    gap: spacing.sm,                      // 8px
  },
  smallGap: {
    gap: spacing.xs,                      // 4px
  },
  largeGap: {
    gap: spacing.xl,                      // 32px
  },
});
```

### Typography

```tsx
const styles = StyleSheet.create({
  title: {
    ...typography.h1,                     // 32px bold
  },
  subtitle: {
    ...typography.h2,                     // 24px bold
  },
  heading: {
    ...typography.h3,                     // 20px 600 weight
  },
  body: {
    ...typography.body,                   // 16px normal
  },
  caption: {
    ...typography.caption,                // 14px normal
  },
  small: {
    ...typography.small,                  // 12px normal
  },
});
```

### Border Radius

```tsx
const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,        // 12px
  },
  button: {
    borderRadius: borderRadius.md,        // 8px
  },
  badge: {
    borderRadius: borderRadius.sm,        // 4px
  },
  avatar: {
    borderRadius: borderRadius.full,      // 9999px (circular)
  },
});
```

### Shadows

```tsx
const styles = StyleSheet.create({
  card: {
    ...shadows.md,                        // elevation 4
  },
  modal: {
    ...shadows.lg,                        // elevation 8
  },
  button: {
    ...shadows.sm,                        // elevation 1
  },
});
```

## Screen Layout Pattern

```tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Header, colors, spacing } from '@/components';

const MyScreen = () => {
  return (
    <View style={styles.container}>
      <Header
        title="Screen Title"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content}>
        {/* Screen content */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
});
```

## List Pattern

```tsx
import { FlatList } from 'react-native';
import { RideCard, EmptyState, LoadingSpinner } from '@/components';

const RideList = ({ rides, loading, onRefresh }) => {
  if (loading) {
    return <LoadingSpinner message="Loading rides..." />;
  }

  return (
    <FlatList
      data={rides}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <RideCard
          ride={item}
          onPress={() => viewDetails(item)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="car-outline"
          title="No Rides"
          message="No active rides found"
        />
      }
      refreshing={loading}
      onRefresh={onRefresh}
    />
  );
};
```

## Form Pattern

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { Input, PhoneNumberInput, Button, spacing } from '@/components';

const ProfileForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // Submit logic
    setLoading(false);
  };

  return (
    <View style={{ padding: spacing.md }}>
      <Input
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="John Doe"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        icon="mail"
      />

      <PhoneNumberInput
        label="Phone Number"
        value={phone}
        onChangeText={setPhone}
      />

      <Button
        title="Save Profile"
        onPress={handleSubmit}
        loading={loading}
        fullWidth
      />
    </View>
  );
};
```

## Modal Pattern

```tsx
import { Modal, View, StyleSheet } from 'react-native';
import { Button, colors, spacing, borderRadius, shadows } from '@/components';

const CustomModal = ({ visible, onClose, children }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.content}>
        {children}
        <Button
          title="Close"
          onPress={onClose}
          variant="secondary"
        />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
});
```

## Conditional Rendering

```tsx
// Loading State
{loading && <LoadingSpinner />}

// Error State
{error && <ErrorMessage message={error} onRetry={refetch} />}

// Empty State
{!loading && !error && data.length === 0 && (
  <EmptyState
    icon="document-outline"
    title="No Data"
    message="Nothing to display"
  />
)}

// Success State
{!loading && !error && data.length > 0 && (
  <FlatList data={data} renderItem={renderItem} />
)}
```

## Color Reference

| Usage | Color | Hex |
|-------|-------|-----|
| Primary Actions | K-State Purple | #512888 |
| Secondary Actions | Rally Red | #8B1538 |
| Success | Green | #22C55E |
| Warning | Yellow | #EAB308 |
| Error | Red | #EF4444 |
| Info | Blue | #3B82F6 |
| Background | White | #FFFFFF |
| Text | Black | #000000 |

## Spacing Reference

| Size | Value | Usage |
|------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Small gaps |
| md | 16px | Default padding |
| lg | 24px | Section spacing |
| xl | 32px | Large spacing |
| xxl | 48px | Extra large spacing |

---

**Quick Tip**: Press `Cmd+Shift+F` in VS Code and search for component names to see usage examples in the codebase.
