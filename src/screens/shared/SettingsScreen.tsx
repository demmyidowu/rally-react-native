import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, updateUserProfile } from '../../store/slices/authSlice';
import { Header, Card } from '../../components';
import { colors, spacing, typography } from '../../components/theme';

interface Props {
  navigation: { goBack: () => void };
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notificationsEnabled !== false
  );

  const handleToggleNotifications = async (value: boolean) => {
    if (!user) return;
    setNotificationsEnabled(value);
    try {
      await dispatch(updateUserProfile({
        userId: user.id,
        data: { notificationsEnabled: value },
      })).unwrap();
    } catch {
      // Revert on failure
      setNotificationsEnabled(!value);
      Alert.alert('Error', 'Failed to update notification setting.');
    }
  };

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open link.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Settings" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowSubLabel}>Ride updates and alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.gray[200], true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Legal & Support Links */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Legal & Support</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink('https://demmyidowu.github.io/rally-react-native/privacy.html')}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink('https://demmyidowu.github.io/rally-react-native/index.html')}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openLink('https://demmyidowu.github.io/rally-react-native/support.html')}
          >
            <Text style={styles.linkText}>Support</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>
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
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    ...typography.body,
    color: colors.gray[800],
    fontWeight: '500',
  },
  rowSubLabel: {
    ...typography.small,
    color: colors.gray[500],
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.gray[800],
  },
  chevron: {
    fontSize: 20,
    color: colors.gray[400],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
  },
});

export default SettingsScreen;
