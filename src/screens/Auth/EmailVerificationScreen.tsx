/**
 * Email Verification Screen
 *
 * Shown after signup to verify the user's email address.
 * Features:
 * - Check verification button
 * - Resend verification email
 * - Automatic check on return
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreenProps } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  checkEmailVerification,
  selectIsEmailVerified,
  selectIsLoading,
  selectUser,
  signOut,
} from '../../store/slices/authSlice';
import { resendVerificationEmail } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components';
import { colors, spacing, typography } from '../../components/theme';
import { auth } from '../../config/firebase';

type Props = AuthScreenProps<'EmailVerification'>;

const EmailVerificationScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isEmailVerified = useAppSelector(selectIsEmailVerified);
  const isLoading = useAppSelector(selectIsLoading);

  const [resendLoading, setResendLoading] = useState(false);
  const [lastResent, setLastResent] = useState<Date | null>(null);

  // Get email from Redux user OR fallback to Firebase Auth (handles case where Firestore doc doesn't exist yet)
  const userEmail = user?.email || auth.currentUser?.email || 'your email';

  useEffect(() => {
    // If email is verified, navigate to main app
    if (isEmailVerified) {
      // Navigation will be handled by AppNavigator
    }
  }, [isEmailVerified]);

  const handleCheckVerification = async () => {
    try {
      const result = await dispatch(checkEmailVerification()).unwrap();
      if (result) {
        // Email verified! Sign out and prompt to login
        await dispatch(signOut()).unwrap();
        Alert.alert(
          'Email Verified! 🎉',
          'Your email has been verified successfully. Please sign in to continue.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Not Verified',
          'Your email has not been verified yet. Please check your inbox and click the verification link.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check verification status');
    }
  };

  const handleResendEmail = async () => {
    // Prevent spam by limiting resends
    if (lastResent && Date.now() - lastResent.getTime() < 60000) {
      Alert.alert(
        'Please Wait',
        'You can request another verification email in 1 minute.'
      );
      return;
    }

    setResendLoading(true);
    try {
      await resendVerificationEmail();
      setLastResent(new Date());
      Alert.alert(
        'Email Sent',
        'A new verification email has been sent. Please check your inbox.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
          </View>
        </View>

        {/* Header */}
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to:
        </Text>
        <Text style={styles.email}>{userEmail}</Text>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructions}>
            Click the link in your email to verify your account and get started with RallyRide.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="I've Verified My Email"
            onPress={handleCheckVerification}
            loading={isLoading}
            disabled={isLoading || resendLoading}
            fullWidth
          />

          <Button
            title="Resend Verification Email"
            onPress={handleResendEmail}
            variant="secondary"
            loading={resendLoading}
            disabled={isLoading || resendLoading}
            fullWidth
          />

          <View style={styles.signOutButton}>
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="secondary"
              disabled={isLoading || resendLoading}
              fullWidth
            />
          </View>
        </View>

        {/* Help text */}
        <Text style={styles.helpText}>
          Didn't receive the email? Check your spam folder or try resending.
        </Text>
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
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
  },
  email: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  instructionsContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  instructions: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  checkButton: {
    width: '100%',
  },
  resendButton: {
    width: '100%',
  },
  signOutButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  helpText: {
    ...typography.caption,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});

export default EmailVerificationScreen;
