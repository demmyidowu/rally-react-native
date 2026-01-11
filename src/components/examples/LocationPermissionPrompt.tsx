/**
 * LocationPermissionPrompt.tsx
 * Rally React Native
 *
 * Example component for requesting location permission
 * Created: 2026-01-11
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useLocationPermission } from '@/hooks/useLocation';
import { PermissionStatus } from '@/services/locationService';

/**
 * Component that shows location permission prompt
 *
 * Shows different UI based on permission state:
 * - Undetermined: Shows "Enable Location" button
 * - Denied: Shows "Open Settings" button
 * - Granted: Shows nothing (or children)
 * - Restricted: Shows error message
 */
export function LocationPermissionPrompt({
  children,
  onPermissionGranted,
}: {
  children?: React.ReactNode;
  onPermissionGranted?: () => void;
}) {
  const { status, isRequesting, requestPermission } =
    useLocationPermission();

  // Handle permission request
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted && onPermissionGranted) {
      onPermissionGranted();
    }
  };

  // Handle opening settings
  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // If permission granted, show children
  if (status === PermissionStatus.GRANTED) {
    return <>{children}</>;
  }

  // Show appropriate UI based on permission status
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📍</Text>
      </View>

      <Text style={styles.title}>Location Permission</Text>

      {status === PermissionStatus.UNDETERMINED && (
        <>
          <Text style={styles.message}>
            We need your location to connect you with a designated driver. Your
            location is only captured when you request a ride.
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              isRequesting && styles.buttonDisabled,
            ]}
            onPress={handleRequestPermission}
            disabled={isRequesting}
          >
            <Text style={styles.buttonText}>
              {isRequesting ? 'Requesting...' : 'Enable Location'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {status === PermissionStatus.DENIED && (
        <>
          <Text style={styles.message}>
            Location permission is required to request rides. Please enable it
            in Settings.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenSettings}
          >
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        </>
      )}

      {status === PermissionStatus.RESTRICTED && (
        <>
          <Text style={styles.message}>
            Location services are restricted on this device. This may be due to
            parental controls or device management settings.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LocationPermissionPrompt;
