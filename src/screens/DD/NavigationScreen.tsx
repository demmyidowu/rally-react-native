/**
 * Navigation Screen
 *
 * Placeholder - To be implemented by react-native-developer
 * Will show map navigation to rider's location
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DDScreenProps } from '../../navigation/types';

type Props = DDScreenProps<'Navigation'>;

const NavigationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId, destination } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation</Text>
      <Text style={styles.subtitle}>To be implemented</Text>
      <Text style={styles.info}>Ride ID: {rideId}</Text>
      <Text style={styles.info}>Address: {destination.address}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#512888',
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    marginTop: 10,
  },
  info: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
  },
});

export default NavigationScreen;
