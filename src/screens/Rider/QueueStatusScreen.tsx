/**
 * Queue Status Screen
 *
 * Placeholder - To be implemented by react-native-developer
 * Shows rider's position in queue and estimated wait time
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RiderScreenProps } from '../../navigation/types';

type Props = RiderScreenProps<'QueueStatus'>;

const QueueStatusScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Queue Status</Text>
      <Text style={styles.subtitle}>To be implemented</Text>
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
});

export default QueueStatusScreen;
