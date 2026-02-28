/**
 * Forgot Password Screen
 *
 * Allows users to reset their password via email.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreenProps } from '../../navigation/types';
import { sendPasswordReset } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Header } from '../../components';
import { colors, spacing, typography } from '../../components/theme';

type Props = AuthScreenProps<'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const validateEmail = (value: string): boolean => {
        if (!value) {
            setEmailError('Email is required');
            return false;
        }
        if (!value.toLowerCase().endsWith('.edu')) {
            setEmailError('Please use your university email (.edu)');
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleResetPassword = async () => {
        if (!validateEmail(email)) {
            return;
        }

        setIsLoading(true);
        try {
            await sendPasswordReset(email.toLowerCase().trim());
            setEmailSent(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send password reset email');
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Reset Password" showBack onBack={() => navigation.goBack()} />
                <View style={styles.successContent}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="checkmark" size={40} color={colors.success} />
                    </View>
                    <Text style={styles.successTitle}>Check Your Email</Text>
                    <Text style={styles.successText}>
                        We've sent password reset instructions to:
                    </Text>
                    <Text style={styles.emailText}>{email}</Text>
                    <View style={styles.backButton}>
                        <Button
                            title="Back to Login"
                            onPress={() => navigation.navigate('Login')}
                            fullWidth
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Reset Password" showBack onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        Enter your university email address and we'll send you instructions to reset your password.
                    </Text>

                    <Input
                        label="Email"
                        placeholder="your.name@university.edu"
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            if (emailError) validateEmail(text);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={emailError}
                        editable={!isLoading}
                    />

                    <View style={styles.submitButton}>
                        <Button
                            title="Send Reset Link"
                            onPress={handleResetPassword}
                            loading={isLoading}
                            disabled={isLoading}
                            fullWidth
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    title: {
        ...typography.h2,
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: colors.gray[500],
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    submitButton: {
        marginTop: spacing.lg,
    },
    successContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.successLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    successTitle: {
        ...typography.h2,
        color: colors.primary,
        marginBottom: spacing.md,
    },
    successText: {
        ...typography.body,
        color: colors.gray[500],
        textAlign: 'center',
    },
    emailText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.primary,
        marginTop: spacing.xs,
        marginBottom: spacing.xl,
    },
    backButton: {
        width: '100%',
    },
});

export default ForgotPasswordScreen;
