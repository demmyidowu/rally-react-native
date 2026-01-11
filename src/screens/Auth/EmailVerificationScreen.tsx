/**
 * Email Verification Screen
 *
 * Placeholder - To be implemented by react-native-developer
 * Handles KSU email verification requirement
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthScreenProps } from '../../navigation/types';

type Props = AuthScreenProps<'EmailVerification'>;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, password } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Verification Screen</Text>
      <Text style={styles.subtitle}>To be implemented</Text>
      <Text style={styles.email}>Email: {email}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  email: {
    fontSize: 14,
    color: '#666666',
    marginTop: 20,
  },
});

export default EmailVerificationScreen;
