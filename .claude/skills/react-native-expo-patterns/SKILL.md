---
name: react-native-expo-patterns
description: React Native best practices with Expo. Use when building React Native components, screens, navigation, styling, or optimizing performance for cross-platform mobile apps.
---

# React Native + Expo Patterns

## When to Use This Skill
Building React Native apps with Expo, especially for:
- Component architecture and composition
- Styling and theming
- Performance optimization
- Platform-specific code
- Expo SDK integration
- TypeScript patterns

## Core Component Patterns

### Functional Components with TypeScript
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const CustomButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled
      ]}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#6B7280',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Component Composition
```typescript
// Container component
interface ScreenContainerProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  loading,
  error
}) => {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return <View style={styles.container}>{children}</View>;
};
```

### List Rendering with FlatList
```typescript
import { FlatList, ListRenderItem } from 'react-native';

interface Item {
  id: string;
  title: string;
  description: string;
}

interface ItemListProps {
  items: Item[];
  onItemPress: (item: Item) => void;
}

export const ItemList: React.FC<ItemListProps> = ({ items, onItemPress }) => {
  const renderItem: ListRenderItem<Item> = ({ item }) => (
    <TouchableOpacity
      onPress={() => onItemPress(item)}
      style={styles.itemContainer}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
    />
  );
};
```

## Styling Patterns

### StyleSheet Best Practices
```typescript
import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  // Use StyleSheet.create for performance
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Platform-specific styles
  header: {
    paddingTop: Platform.select({
      ios: 50,
      android: 20,
    }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Responsive sizing
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});

// Dynamic styles outside StyleSheet
const getDynamicStyle = (isActive: boolean) => ({
  backgroundColor: isActive ? '#007AFF' : '#E5E7EB',
});
```

### Theme Management
```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#6B7280',
    background: '#FFFFFF',
    text: '#1F2937',
    error: '#EF4444',
    success: '#10B981',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
  },
};

// Usage
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
});
```

## Performance Optimization

### Memoization
```typescript
import React, { memo, useMemo, useCallback } from 'react';

interface ExpensiveComponentProps {
  data: string[];
  onItemPress: (item: string) => void;
}

// Memo to prevent unnecessary re-renders
export const ExpensiveComponent = memo<ExpensiveComponentProps>(({
  data,
  onItemPress
}) => {
  // useMemo for expensive computations
  const processedData = useMemo(() => {
    return data.map(item => item.toUpperCase()).sort();
  }, [data]);

  // useCallback for stable function references
  const handlePress = useCallback((item: string) => {
    onItemPress(item);
  }, [onItemPress]);

  return (
    <View>
      {processedData.map((item, index) => (
        <TouchableOpacity key={index} onPress={() => handlePress(item)}>
          <Text>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

ExpensiveComponent.displayName = 'ExpensiveComponent';
```

### Image Optimization
```typescript
import { Image } from 'expo-image';

// Use expo-image instead of react-native Image for better performance
export const OptimizedImage: React.FC<{ uri: string }> = ({ uri }) => (
  <Image
    source={{ uri }}
    style={styles.image}
    contentFit="cover"
    transition={200}
    cachePolicy="memory-disk"
    placeholder={require('../assets/placeholder.png')}
  />
);
```

## Platform-Specific Code

### Platform Detection
```typescript
import { Platform } from 'react-native';

// Method 1: Platform.select
const padding = Platform.select({
  ios: 10,
  android: 15,
  default: 12,
});

// Method 2: Platform.OS
if (Platform.OS === 'ios') {
  // iOS-specific code
}

// Method 3: Separate files
// Component.ios.tsx
// Component.android.tsx
// Component.tsx (shared)
```

### Safe Area Handling
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export const Screen: React.FC = ({ children }) => (
  <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
    {children}
  </SafeAreaView>
);
```

## Hooks Patterns

### Custom Hooks
```typescript
import { useState, useEffect } from 'react';

// Custom hook for async data fetching
export const useFetch = <T,>(fetchFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetchFn();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [fetchFn]);

  return { data, loading, error };
};
```

## Error Boundaries
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Common Pitfalls to Avoid

### 1. Inline Functions in Render
```typescript
// BAD - Creates new function on every render
<Button onPress={() => handlePress(item.id)} />

// GOOD - Use useCallback
const handlePress = useCallback(() => {
  handlePressItem(item.id);
}, [item.id]);

<Button onPress={handlePress} />
```

### 2. Inline Styles
```typescript
// BAD - Creates new object on every render
<View style={{ padding: 10, margin: 5 }} />

// GOOD - Use StyleSheet
const styles = StyleSheet.create({
  container: { padding: 10, margin: 5 }
});

<View style={styles.container} />
```

### 3. Key Props in Lists
```typescript
// BAD - Using index as key
{items.map((item, index) => <Item key={index} />)}

// GOOD - Use unique identifier
{items.map((item) => <Item key={item.id} />)}
```

### 4. State Initialization
```typescript
// BAD - Expensive computation on every render
const [data] = useState(expensiveComputation());

// GOOD - Lazy initialization
const [data] = useState(() => expensiveComputation());
```

### 5. Missing Cleanup
```typescript
// BAD - Memory leak
useEffect(() => {
  const subscription = eventEmitter.subscribe();
  // No cleanup
}, []);

// GOOD - Proper cleanup
useEffect(() => {
  const subscription = eventEmitter.subscribe();
  return () => subscription.unsubscribe();
}, []);
```

## Expo-Specific Patterns

### App Configuration (app.json)
```json
{
  "expo": {
    "name": "Rally",
    "slug": "rally-react-native",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourorg.rally",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Rally needs your location to estimate ride times."
      }
    },
    "android": {
      "package": "com.yourorg.rally",
      "permissions": ["ACCESS_FINE_LOCATION"],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      }
    }
  }
}
```

### Environment Variables
```typescript
// Use expo-constants for environment variables
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.default.com';
```

## Best Practices

1. **Use TypeScript** for type safety
2. **Functional components** with hooks (avoid class components)
3. **Memoization** for expensive computations and components
4. **StyleSheet.create** for all styles
5. **FlatList/SectionList** for long lists (avoid ScrollView)
6. **SafeAreaView** for proper spacing on notched devices
7. **Error boundaries** for graceful error handling
8. **Platform-specific** code when necessary
9. **Lazy loading** for heavy screens
10. **Clean up** side effects in useEffect

## Testing Considerations

```typescript
// Component should be testable
import { render, fireEvent } from '@testing-library/react-native';

describe('CustomButton', () => {
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomButton title="Test" onPress={onPress} />
    );

    fireEvent.press(getByText('Test'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

## References

- React Native Docs: https://reactnative.dev/docs/getting-started
- Expo Docs: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/
- Performance: https://reactnative.dev/docs/performance
