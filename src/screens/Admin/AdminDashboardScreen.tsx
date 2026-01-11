/**
 * Admin Dashboard Screen
 *
 * Placeholder - To be implemented by react-native-developer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminScreenProps } from '../../navigation/types';

type Props = AdminScreenProps<'AdminDashboard'>;

const AdminDashboardScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
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

export default AdminDashboardScreen;
