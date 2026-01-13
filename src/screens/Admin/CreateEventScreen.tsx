/**
 * Create Event Screen
 *
 * Form to create a new event.
 */

import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { createEvent, selectLoading } from '../../store/slices/eventsSlice';
import { Header, Input, Button, Card } from '../../components';
import { colors, spacing, typography } from '../../components/theme';

type Props = AdminScreenProps<'CreateEvent'>;

const CreateEventScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Event name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    if (!user?.chapterId) {
      Alert.alert('Error', 'Chapter ID not found');
      return;
    }

    try {
      await dispatch(createEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        startTime: new Date(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours later
        assignedDDs: [],
        createdBy: user.id,
      })).unwrap();

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Create Event" showBack onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.formCard}>
            <Input
              label="Event Name"
              placeholder="e.g., Friday Night Rides"
              value={name}
              onChangeText={setName}
              error={errors.name}
              editable={!loading}
            />

            <Input
              label="Location (Optional)"
              placeholder="e.g., K-State Campus"
              value={location}
              onChangeText={setLocation}
              editable={!loading}
            />

            <Input
              label="Description (Optional)"
              placeholder="Event details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!loading}
            />
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Event Info</Text>
            <Text style={styles.infoText}>
              • The event will start immediately after creation
            </Text>
            <Text style={styles.infoText}>
              • You can assign DDs after creating the event
            </Text>
            <Text style={styles.infoText}>
              • Members can request rides once the event is active
            </Text>
          </Card>

          <View style={styles.createButton}>
            <Button
              title="Create Event"
              onPress={handleCreate}
              loading={loading}
              disabled={loading}
              fullWidth
            />
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  createButton: {
    marginBottom: spacing.xl,
  },
});

export default CreateEventScreen;
