/**
 * Sign Up Screen
 *
 * Allows new users to create an account with:
 * - University email (.edu required)
 * - Password
 * - Full name
 * - University and Chapter selection
 *
 * After successful signup, redirects to email verification screen
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreenProps } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { AuthError } from '../../types/errors';
import { Button, Input, Dropdown } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { universities, getChaptersForUniversity } from '../../data/chapters';

type Props = AuthScreenProps<'Signup'>;

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const { signUp, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [isChapterAdmin, setIsChapterAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminCodeValid, setAdminCodeValid] = useState<boolean | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [selectedClassYear, setSelectedClassYear] = useState('');

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Class year options for prioritization
  const classYearOptions = useMemo(() => [
    { label: 'Freshman', value: '1' },
    { label: 'Sophomore', value: '2' },
    { label: 'Junior', value: '3' },
    { label: 'Senior', value: '4' },
  ], []);

  // Get university options
  const universityOptions = useMemo(() =>
    universities.map(u => ({ label: u.name, value: u.id })),
    []
  );

  // Get chapter options based on selected university
  const chapterOptions = useMemo(() => {
    if (!selectedUniversity) return [];
    const chapters = getChaptersForUniversity(selectedUniversity);
    return chapters.map(c => ({
      label: `${c.name} (${c.type === 'fraternity' ? 'Fraternity' : 'Sorority'})`,
      value: c.id
    }));
  }, [selectedUniversity]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      errors.name = 'Name is required';
    }

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!email.toLowerCase().endsWith('.edu')) {
      errors.email = 'Must use a university email address (.edu)';
    }

    // University validation
    if (!selectedUniversity) {
      errors.university = 'Please select your university';
    }

    // Chapter is optional - users can request to join later

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must include an uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must include a lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must include a number';
    }

    // Confirm password
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Admin code validation
    if (isChapterAdmin && !adminCode.trim()) {
      errors.adminCode = 'Admin code is required for chapter admins';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate admin code when it changes
  const validateAdminCode = async (code: string) => {
    if (!code.trim() || !selectedUniversity) {
      setAdminCodeValid(null);
      return;
    }

    setValidatingCode(true);
    try {
      // Call the Cloud Function to validate admin code
      const response = await fetch(`https://us-central1-ddride-didowu.cloudfunctions.net/validateAdminCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            adminCode: code.trim(),
            universityId: selectedUniversity
          }
        }),
      });
      const result = await response.json();
      setAdminCodeValid(result.result?.valid === true);
    } catch (err) {
      console.error('Error validating admin code:', err);
      setAdminCodeValid(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleUniversityChange = (value: string) => {
    setSelectedUniversity(value);
    setSelectedChapter(''); // Reset chapter when university changes
    if (validationErrors.university) {
      setValidationErrors((prev) => ({ ...prev, university: '' }));
    }
  };

  const handleChapterChange = (value: string) => {
    setSelectedChapter(value);
    if (validationErrors.chapter) {
      setValidationErrors((prev) => ({ ...prev, chapter: '' }));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    // If admin, verify code is valid
    if (isChapterAdmin && adminCodeValid !== true) {
      Alert.alert('Invalid Admin Code', 'Please enter a valid admin code from your IFC.');
      return;
    }

    try {
      clearError();
      await signUp(
        email.trim(),
        password,
        name.trim(),
        undefined,
        selectedChapter,
        parseInt(selectedClassYear) || 1,
        isChapterAdmin ? adminCode.trim() : undefined // Pass admin code if registering as admin
      );
      navigation.navigate('EmailVerification', { email: email.trim(), password });
    } catch (err: any) {
      if (err instanceof AuthError) {
        Alert.alert('Sign Up Failed', err.message);
      } else {
        Alert.alert('Sign Up Failed', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up with your .edu email</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="Full Name"
              placeholder="First Last"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              autoCapitalize="words"
              error={validationErrors.name}
              editable={!loading}
            />

            <Input
              label="University Email"
              placeholder="yourname@university.edu"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              error={validationErrors.email}
              editable={!loading}
            />

            <Dropdown
              label="University"
              placeholder="Select your university"
              options={universityOptions}
              value={selectedUniversity}
              onSelect={handleUniversityChange}
              error={validationErrors.university}
              disabled={loading}
            />

            <Dropdown
              label="Chapter (Optional)"
              placeholder={selectedUniversity ? "Select your chapter or join later" : "Select university first"}
              options={chapterOptions}
              value={selectedChapter}
              onSelect={handleChapterChange}
              error={validationErrors.chapter}
              disabled={loading || !selectedUniversity}
            />

            <Dropdown
              label="Class Year"
              placeholder="Select your class year"
              options={classYearOptions}
              value={selectedClassYear}
              onSelect={setSelectedClassYear}
              error={validationErrors.classYear}
              disabled={loading}
            />

            {/* Admin Registration Section */}
            <View style={styles.adminSection}>
              <View style={styles.adminToggleRow}>
                <View style={styles.adminToggleTextContainer}>
                  <Text style={styles.adminToggleLabel}>I'm a Chapter Admin</Text>
                  <Text style={styles.adminToggleHint}>I have an admin code from IFC</Text>
                </View>
                <Switch
                  value={isChapterAdmin}
                  onValueChange={setIsChapterAdmin}
                  trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
                  thumbColor={isChapterAdmin ? colors.primary : colors.gray[400]}
                  disabled={loading}
                />
              </View>

              {isChapterAdmin && (
                <View style={styles.adminCodeContainer}>
                  <Input
                    label="Admin Code"
                    placeholder="Enter code from IFC"
                    value={adminCode}
                    onChangeText={(text) => {
                      setAdminCode(text);
                      setAdminCodeValid(null);
                      if (validationErrors.adminCode) {
                        setValidationErrors((prev) => ({ ...prev, adminCode: '' }));
                      }
                    }}
                    onBlur={() => validateAdminCode(adminCode)}
                    autoCapitalize="characters"
                    error={validationErrors.adminCode}
                    editable={!loading && !!selectedUniversity}
                  />
                  {validatingCode && (
                    <Text style={styles.validatingText}>Validating...</Text>
                  )}
                  {adminCodeValid === true && !validatingCode && (
                    <Text style={styles.validCodeText}>✓ Valid admin code</Text>
                  )}
                  {adminCodeValid === false && !validatingCode && (
                    <Text style={styles.invalidCodeText}>✗ Invalid admin code</Text>
                  )}
                  {!selectedUniversity && isChapterAdmin && (
                    <Text style={styles.adminCodeHint}>Select university first</Text>
                  )}
                </View>
              )}
            </View>

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (validationErrors.password) {
                  setValidationErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              secureTextEntry
              error={validationErrors.password}
              editable={!loading}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (validationErrors.confirmPassword) {
                  setValidationErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              secureTextEntry
              error={validationErrors.confirmPassword}
              editable={!loading}
            />

            <Text style={styles.passwordHint}>
              Password must be at least 8 characters with uppercase, lowercase, and a number.
            </Text>

            <Button
              title="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
            />

            {/* Sign In Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray[500],
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorBannerText: {
    color: colors.error,
    ...typography.body,
  },
  passwordHint: {
    ...typography.caption,
    color: colors.gray[400],
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footerText: {
    color: colors.gray[500],
    ...typography.body,
  },
  link: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  adminSection: {
    marginBottom: spacing.lg,
  },
  adminToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  adminToggleTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  adminToggleLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
  },
  adminToggleHint: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  adminCodeContainer: {
    marginTop: spacing.sm,
  },
  validatingText: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  validCodeText: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xs,
  },
  invalidCodeText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  adminCodeHint: {
    ...typography.caption,
    color: colors.gray[400],
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default SignupScreen;
