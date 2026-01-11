/**
 * NotificationSetup Component
 *
 * Example component showing how to integrate the notification service.
 * This component can be used in your auth flow to set up notifications
 * after user login.
 *
 * Usage:
 * ```tsx
 * <NotificationSetup userId={user.uid} onComplete={() => navigation.navigate('Home')} />
 * ```
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPermissionStatus } from '../types/notifications';

interface NotificationSetupProps {
  userId: string;
  onComplete?: () => void;
  onSkip?: () => void;
  autoRequest?: boolean; // Automatically request permissions on mount
}

const NotificationSetup: React.FC<NotificationSetupProps> = ({
  userId,
  onComplete,
  onSkip,
  autoRequest = false,
}) => {
  const {
    permissionStatus,
    isLoading,
    error,
    requestPermissions,
    registerForPush,
  } = useNotifications(true);

  const [setupComplete, setSetupComplete] = useState(false);

  /**
   * Auto-request permissions if enabled
   */
  useEffect(() => {
    if (autoRequest && permissionStatus === NotificationPermissionStatus.UNDETERMINED) {
      handleRequestPermissions();
    }
  }, [autoRequest, permissionStatus]);

  /**
   * Register for push notifications when permissions are granted
   */
  useEffect(() => {
    if (permissionStatus === NotificationPermissionStatus.GRANTED && !setupComplete) {
      handleRegisterForPush();
    }
  }, [permissionStatus, setupComplete]);

  /**
   * Handle permission request
   */
  const handleRequestPermissions = async () => {
    try {
      const status = await requestPermissions();

      if (status === NotificationPermissionStatus.DENIED) {
        Alert.alert(
          'Notifications Disabled',
          'To receive ride updates, please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (err) {
      console.error('Failed to request permissions:', err);
      Alert.alert('Error', 'Failed to request notification permissions. Please try again.');
    }
  };

  /**
   * Register for push notifications
   */
  const handleRegisterForPush = async () => {
    try {
      const token = await registerForPush(userId);

      if (token) {
        setSetupComplete(true);
        Alert.alert(
          'Notifications Enabled',
          'You will now receive updates about your rides!',
          [{ text: 'OK', onPress: onComplete }]
        );
      }
    } catch (err) {
      console.error('Failed to register for push:', err);
      Alert.alert(
        'Setup Failed',
        'Failed to set up notifications. You can try again later in settings.',
        [{ text: 'OK', onPress: onComplete }]
      );
    }
  };

  /**
   * Handle skip button
   */
  const handleSkip = () => {
    Alert.alert(
      'Skip Notifications?',
      'You won\'t receive updates about your rides. You can enable this later in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: onSkip || onComplete },
      ]
    );
  };

  /**
   * Render setup status
   */
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Setting up notifications...</Text>
        </View>
      );
    }

    if (setupComplete) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>Notifications Enabled!</Text>
          <Text style={styles.description}>
            You'll receive updates about your rides and important alerts.
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (permissionStatus === NotificationPermissionStatus.DENIED) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>🔕</Text>
          <Text style={styles.errorText}>Notifications Disabled</Text>
          <Text style={styles.description}>
            To receive ride updates, please enable notifications in your device settings.
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContent}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>Enable Notifications</Text>
        <Text style={styles.description}>
          Stay updated with real-time notifications about your rides:
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>• When a DD is assigned to your ride</Text>
          <Text style={styles.feature}>• When your DD is en route with ETA</Text>
          <Text style={styles.feature}>• Emergency alerts and important updates</Text>
        </View>
        <TouchableOpacity style={styles.enableButton} onPress={handleRequestPermissions}>
          <Text style={styles.enableButtonText}>Enable Notifications</Text>
        </TouchableOpacity>
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  featureList: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  feature: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 12,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  successText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 16,
  },
  enableButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 280,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 280,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 280,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  errorMessage: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default NotificationSetup;
