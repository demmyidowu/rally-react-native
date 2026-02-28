/**
 * Create Event Screen
 *
 * Form to create a new event with organization access controls and date selection.
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { createEvent, selectLoading } from '../../store/slices/eventsSlice';
import { Input, Button, Card } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { fetchChaptersForUniversity, getUniversityIdFromChapterId } from '../../services/chapterService';

type Props = AdminScreenProps<'CreateEvent'>;

interface Organization {
  id: string;
  name: string;
  type: 'fraternity' | 'sorority';
}

const CreateEventScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  // Basic info
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Date and time - default to today at 8 PM to midnight
  const getDefaultStartTime = () => {
    const date = new Date();
    date.setHours(20, 0, 0, 0); // 8 PM
    return date;
  };
  const getDefaultEndTime = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Next day
    date.setHours(0, 0, 0, 0); // Midnight
    return date;
  };

  const [eventDate, setEventDate] = useState(new Date());
  const [startTime, setStartTime] = useState(getDefaultStartTime());
  const [endTime, setEndTime] = useState(getDefaultEndTime());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Access controls
  const [allowAll, setAllowAll] = useState(false);
  const [allowNonGreek, setAllowNonGreek] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgTab, setOrgTab] = useState<'fraternity' | 'sorority'>('fraternity');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch chapters from Firestore
  useEffect(() => {
    const loadOrganizations = async () => {
      // Get the university ID from the user's chapter
      const universityId = user?.chapterId
        ? getUniversityIdFromChapterId(user.chapterId)
        : 'ksu';

      try {
        const chapters = await fetchChaptersForUniversity(universityId);
        const orgs: Organization[] = chapters.map(chapter => ({
          id: chapter.id,
          name: chapter.name,
          type: chapter.type,
        }));
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, [user?.chapterId]);

  const toggleOrganization = (orgId: string) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    );
  };

  // Filter organizations by current tab
  const filteredOrganizations = organizations.filter(org => org.type === orgTab);

  // Get counts for each tab
  const fraternityCount = organizations.filter(org => org.type === 'fraternity').length;
  const sororitiesCount = organizations.filter(org => org.type === 'sorority').length;
  const fraternitySelectedCount = selectedOrgs.filter(id =>
    organizations.find(org => org.id === id && org.type === 'fraternity')
  ).length;
  const sororitySelectedCount = selectedOrgs.filter(id =>
    organizations.find(org => org.id === id && org.type === 'sorority')
  ).length;

  const selectAllOrgs = () => {
    // Only select organizations in the current tab
    const currentTabOrgs = organizations.filter(org => org.type === orgTab);
    const currentTabIds = currentTabOrgs.map(org => org.id);
    // Add to existing selection (preserve other tab's selections)
    setSelectedOrgs(prev => [...new Set([...prev, ...currentTabIds])]);
  };

  const clearAllOrgs = () => {
    // Only clear organizations in the current tab
    const currentTabIds = organizations.filter(org => org.type === orgTab).map(org => org.id);
    setSelectedOrgs(prev => prev.filter(id => !currentTabIds.includes(id)));
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

    // Combine date with times
    const combinedStartTime = new Date(eventDate);
    combinedStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const combinedEndTime = new Date(eventDate);
    combinedEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    // If end time is before start time, assume it's the next day
    if (combinedEndTime <= combinedStartTime) {
      combinedEndTime.setDate(combinedEndTime.getDate() + 1);
    }

    try {
      await dispatch(createEvent({
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: combinedStartTime,
        endTime: combinedEndTime,
        assignedDDs: [],
        createdBy: user.id,
        chapterId: user.chapterId,
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

          {/* Date and Time */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Date & Time</Text>

            {/* Event Date */}
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeLabel}>Event Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(!showDatePicker)}
                disabled={loading}
              >
                <Text style={styles.dateTimeValue}>
                  {eventDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Start Time */}
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartTimePicker(!showStartTimePicker)}
                disabled={loading}
              >
                <Text style={styles.dateTimeValue}>
                  {startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Time */}
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndTimePicker(!showEndTimePicker)}
                disabled={loading}
              >
                <Text style={styles.dateTimeValue}>
                  {endTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setEventDate(date);
                }}
              />
            )}

            {/* Start Time Picker */}
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, time) => {
                  setShowStartTimePicker(Platform.OS === 'ios');
                  if (time) setStartTime(time);
                }}
              />
            )}

            {/* End Time Picker */}
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event, time) => {
                  setShowEndTimePicker(Platform.OS === 'ios');
                  if (time) setEndTime(time);
                }}
              />
            )}
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
                <Text style={styles.orgLabel}>Allowed Organizations</Text>

                {/* Fraternity/Sorority Tabs */}
                <View style={styles.orgTabs}>
                  <TouchableOpacity
                    style={[styles.orgTab, orgTab === 'fraternity' && styles.orgTabActive]}
                    onPress={() => setOrgTab('fraternity')}
                  >
                    <Text style={[styles.orgTabText, orgTab === 'fraternity' && styles.orgTabTextActive]}>
                      Fraternities ({fraternitySelectedCount}/{fraternityCount})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orgTab, orgTab === 'sorority' && styles.orgTabActive]}
                    onPress={() => setOrgTab('sorority')}
                  >
                    <Text style={[styles.orgTabText, orgTab === 'sorority' && styles.orgTabTextActive]}>
                      Sororities ({sororitySelectedCount}/{sororitiesCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Select/Clear buttons for current tab */}
                <View style={styles.orgActions}>
                  <TouchableOpacity onPress={selectAllOrgs}>
                    <Text style={styles.selectAllButton}>Select All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAllOrgs}>
                    <Text style={styles.clearAllButton}>Clear</Text>
                  </TouchableOpacity>
                </View>

                {loadingOrgs ? (
                  <Text style={styles.loadingText}>Loading organizations...</Text>
                ) : filteredOrganizations.length === 0 ? (
                  <Text style={styles.emptyText}>No {orgTab === 'fraternity' ? 'fraternities' : 'sororities'} found</Text>
                ) : (
                  <View style={styles.orgList}>
                    {filteredOrganizations.map(org => (
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
            <Text style={styles.infoTitle}>Event Info</Text>
            <Text style={styles.infoText}>• Assign DDs after creating the event</Text>
            <Text style={styles.infoText}>• DDs from your chapter will handle rides</Text>
            <Text style={styles.infoText}>• Events automatically activate at start time</Text>
          </Card>

          {/* Early Access Info */}
          <Card style={styles.earlyAccessCard}>
            <Text style={styles.earlyAccessTitle}>Early Access</Text>
            <Text style={styles.earlyAccessText}>
              Your chapter members can request rides 2.5 hours before the event starts, even before other organizations have access.
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
  orgLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  orgTabs: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    padding: 4,
  },
  orgTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md - 2,
  },
  orgTabActive: {
    backgroundColor: colors.white,
  },
  orgTabText: {
    ...typography.caption,
    color: colors.gray[600],
    fontWeight: '500',
  },
  orgTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  orgActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  selectAllButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  clearAllButton: {
    ...typography.body,
    color: colors.gray[500],
    fontWeight: '500',
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
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  dateTimeLabel: {
    ...typography.body,
    color: colors.gray[700],
    fontWeight: '500',
  },
  dateTimeButton: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dateTimeValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  earlyAccessCard: {
    padding: spacing.lg,
    backgroundColor: colors.primaryLight + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
  },
  earlyAccessTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  earlyAccessText: {
    ...typography.body,
    color: colors.gray[700],
    lineHeight: 22,
  },
});

export default CreateEventScreen;
