/**
 * Edit Event Screen
 *
 * Placeholder - To be implemented by react-native-developer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminScreenProps } from '../../navigation/types';

type Props = AdminScreenProps<'EditEvent'>;

const EditEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Event</Text>
      <Text style={styles.subtitle}>To be implemented</Text>
      <Text style={styles.info}>Event ID: {eventId}</Text>
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
    marginTop: 20,
  },
});

export default EditEventScreen;
