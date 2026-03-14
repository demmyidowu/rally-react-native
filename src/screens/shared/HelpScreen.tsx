import React from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { Header, Card } from '../../components';

const FAQ_ITEMS = [
  {
    q: 'How do I request a ride?',
    a: 'Tap "Request a Ride" on your dashboard. Enter your pickup location and the app will assign the next available DD.',
  },
  {
    q: 'How long will I wait for a DD?',
    a: 'The queue is prioritized by class year and wait time. You can check your position on the Queue Status screen.',
  },
  {
    q: 'What is the Emergency button?',
    a: 'The Emergency button gives your ride request the highest priority. Use it only if you are in an unsafe situation — admins will be alerted immediately.',
  },
  {
    q: 'How do I become a DD?',
    a: 'Go to the DD tab and toggle yourself active. Make sure your car information (make, model, color) is filled in under Car Settings first.',
  },
  {
    q: 'My ride was not completed — what do I do?',
    a: 'Contact your chapter admin directly. You can also reach us through the support link below.',
  },
];

interface Props {
  navigation: { goBack: () => void };
}

const HelpScreen: React.FC<Props> = ({ navigation }) => {
  const openSupport = async () => {
    const url = 'https://support.rallyride.app';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open support page.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Help & Support" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.supportButton} onPress={openSupport} activeOpacity={0.85}>
          <Text style={styles.supportButtonText}>Open Support Center</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {FAQ_ITEMS.map((item, index) => (
          <Card key={index} style={styles.faqCard}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </Card>
        ))}

        <Text style={styles.footer}>
          Still need help? Visit{' '}
          <Text style={styles.link} onPress={openSupport}>
            support.rallyride.app
          </Text>
        </Text>
      </ScrollView>
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
  supportButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  faqCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  question: {
    ...typography.body,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },
  answer: {
    ...typography.body,
    color: colors.gray[600],
    lineHeight: 22,
  },
  footer: {
    ...typography.small,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default HelpScreen;
