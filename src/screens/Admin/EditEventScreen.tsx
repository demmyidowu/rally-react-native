/**
 * Edit Event Screen (Placeholder)
 *
 * Placeholder for editing existing events.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { Header } from '../../components';
import { colors, spacing, typography } from '../../components/theme';

type Props = AdminScreenProps<'EditEvent'>;

const EditEventScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Edit Event" showBack onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.text}>Edit Event: {eventId}</Text>
        <Text style={styles.subtext}>Coming soon...</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },
  subtext: {
    ...typography.body,
    color: colors.gray[500],
  },
});

export default EditEventScreen;
