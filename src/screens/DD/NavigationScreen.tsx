/**
 * Navigation Screen (DD)
 *
 * Provides navigation options to rider's pickup location.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DDScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectRides, selectLoading } from '../../store/slices/ridesSlice';
import { Header, Card, Button, LoadingSpinner } from '../../components';
import { colors, spacing, typography } from '../../components/theme';

type Props = DDScreenProps<'Navigation'>;

const NavigationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId, destination: _destination } = route.params;
  const rides = useAppSelector(selectRides);
  const loading = useAppSelector(selectLoading);
  const ride = rides.find(r => r.id === rideId);

  const openGoogleMaps = () => {
    if (!ride?.pickupLocation) {
      Alert.alert('Error', 'Pickup location not available');
      return;
    }

    const { latitude, longitude } = ride.pickupLocation;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
    });

    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

    Linking.canOpenURL(url!).then((supported) => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  const openAppleMaps = () => {
    if (!ride?.pickupLocation) {
      Alert.alert('Error', 'Pickup location not available');
      return;
    }

    const { latitude, longitude } = ride.pickupLocation;
    const url = `maps://app?daddr=${latitude},${longitude}&dirflg=d`;
    const webUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  const openWaze = () => {
    if (!ride?.pickupLocation) {
      Alert.alert('Error', 'Pickup location not available');
      return;
    }

    const { latitude, longitude } = ride.pickupLocation;
    const url = `waze://?ll=${latitude},${longitude}&navigate=yes`;
    const webUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  if (loading && !ride) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Navigation" showBack onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Navigation" showBack onBack={() => navigation.goBack()} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Ride not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Navigation" showBack onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Destination Info */}
        <Card style={styles.destinationCard}>
          <Text style={styles.destinationLabel}>Navigate to Rider</Text>
          <Text style={styles.riderName}>{ride.riderName || 'Rider'}</Text>
          <Text style={styles.address}>{ride.pickupAddress || 'Pickup location'}</Text>
        </Card>

        {/* Navigation Options */}
        <Text style={styles.sectionTitle}>Choose Navigation App</Text>

        <View style={styles.navOptions}>
          <View style={styles.navButton}>
            <Button
              title="🗺️ Google Maps"
              onPress={openGoogleMaps}
              fullWidth
            />
          </View>

          {Platform.OS === 'ios' && (
            <View style={styles.navButton}>
              <Button
                title="🍎 Apple Maps"
                variant="secondary"
                onPress={openAppleMaps}
                fullWidth
              />
            </View>
          )}

          <View style={styles.navButton}>
            <Button
              title="🚗 Waze"
              variant="secondary"
              onPress={openWaze}
              fullWidth
            />
          </View>
        </View>

        {/* Tips */}
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipText}>• Make sure to mark "En Route" before leaving</Text>
          <Text style={styles.tipText}>• Call the rider if you can't find them</Text>
          <Text style={styles.tipText}>• Complete the ride after drop-off</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.body,
    color: colors.gray[500],
  },
  destinationCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.primaryLight,
  },
  destinationLabel: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  riderName: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  address: {
    ...typography.body,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  navOptions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  navButton: {
    width: '100%',
  },
  tipsCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
  },
  tipsTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  tipText: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
});

export default NavigationScreen;
