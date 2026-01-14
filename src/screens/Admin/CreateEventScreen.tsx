/**
 * Create Event Screen
 *
 * Form to create a new event with organization access controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { createEvent, selectLoading } from '../../store/slices/eventsSlice';
import { Header, Input, Button, Card } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'CreateEvent'>;

interface Organization {
  id: string;
  name: string;
}

const CreateEventScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  // Basic info
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Access controls
  const [allowAll, setAllowAll] = useState(false);
  const [allowNonGreek, setAllowNonGreek] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch organizations from same university
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.universityId) {
        setLoadingOrgs(false);
        return;
      }

      try {
        const chaptersQuery = query(
          collection(db, 'chapters'),
          where('universityId', '==', user.universityId)
        );
        const snapshot = await getDocs(chaptersQuery);
        const orgs: Organization[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown Chapter',
        }));
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, [user?.universityId]);

  const toggleOrganization = (orgId: string) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  const selectAllOrgs = () => {
    setSelectedOrgs(organizations.map(org => org.id));
  };

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
        location: location.trim() || undefined,
        startTime: new Date(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        assignedDDs: [],
        createdBy: user.id,
        // Access controls
        allowAll,
        allowNonGreek,
        allowedOrganizationIds: allowAll ? [] : selectedOrgs,
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
          {/* Event Details */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Event Details</Text>
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
              numberOfLines={3}
              editable={!loading}
            />
          </Card>

          {/* Access Controls */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Who Can Request DDs?</Text>

            {/* Allow All Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Allow Everyone</Text>
                <Text style={styles.toggleDescription}>
                  Anyone can request a DD from this event
                </Text>
              </View>
              <Switch
                value={allowAll}
                onValueChange={setAllowAll}
                trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
                thumbColor={allowAll ? colors.primary : colors.gray[400]}
              />
            </View>

            {/* Allow Non-Greek */}
            {!allowAll && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Allow Non-Greek</Text>
                  <Text style={styles.toggleDescription}>
                    Users without a chapter can request rides
                  </Text>
                </View>
                <Switch
                  value={allowNonGreek}
                  onValueChange={setAllowNonGreek}
                  trackColor={{ false: colors.gray[300], true: colors.primaryLight }}
                  thumbColor={allowNonGreek ? colors.primary : colors.gray[400]}
                />
              </View>
            )}

            {/* Organization Selector */}
            {!allowAll && (
              <View style={styles.orgSection}>
                <View style={styles.orgHeader}>
                  <Text style={styles.orgLabel}>Allowed Organizations</Text>
                  <TouchableOpacity onPress={selectAllOrgs}>
                    <Text style={styles.selectAllButton}>Select All</Text>
                  </TouchableOpacity>
                </View>

                {loadingOrgs ? (
                  <Text style={styles.loadingText}>Loading organizations...</Text>
                ) : organizations.length === 0 ? (
                  <Text style={styles.emptyText}>No organizations found</Text>
                ) : (
                  <View style={styles.orgList}>
                    {organizations.map(org => (
                      <TouchableOpacity
                        key={org.id}
                        style={[
                          styles.orgItem,
                          selectedOrgs.includes(org.id) && styles.orgItemSelected,
                        ]}
                        onPress={() => toggleOrganization(org.id)}
                      >
                        <Text
                          style={[
                            styles.orgName,
                            selectedOrgs.includes(org.id) && styles.orgNameSelected,
                          ]}
                        >
                          {org.name}
                        </Text>
                        {selectedOrgs.includes(org.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.helperText}>
                  {selectedOrgs.length === 0
                    ? 'Only your chapter can request DDs'
                    : `${selectedOrgs.length} organization(s) selected`}
                </Text>
              </View>
            )}
          </Card>

          {/* Info */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Event Info</Text>
            <Text style={styles.infoText}>• Event starts immediately after creation</Text>
            <Text style={styles.infoText}>• Assign DDs after creating the event</Text>
            <Text style={styles.infoText}>• DDs from your chapter will handle rides</Text>
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
  sectionTitle: {
    ...typography.h3,
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[800],
  },
  toggleDescription: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: 2,
  },
  orgSection: {
    marginTop: spacing.md,
  },
  orgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orgLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[700],
  },
  selectAllButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  orgList: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  orgItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: colors.white,
  },
  orgItemSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  orgName: {
    ...typography.body,
    color: colors.gray[700],
  },
  orgNameSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
  },
  loadingText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    padding: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    padding: spacing.md,
  },
  helperText: {
    ...typography.caption,
    color: colors.gray[500],
    marginTop: spacing.sm,
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
