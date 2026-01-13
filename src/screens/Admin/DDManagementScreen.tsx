/**
 * DD Management Screen
 *
 * Manage designated drivers - view list, assign to events, see stats.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { Header, Card, Button, EmptyState, LoadingSpinner, Input } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'DDManagement'>;

interface DDUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  carDescription?: string;
  totalRidesCompleted?: number;
  isActive?: boolean;
}

const DDManagementScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAppSelector(selectUser);
  const [ddList, setDDList] = useState<DDUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDDs();
  }, [user?.chapterId]);

  const fetchDDs = async () => {
    if (!user?.chapterId) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('chapterId', '==', user.chapterId),
        where('role', 'in', ['admin', 'member'])
      );
      const snapshot = await getDocs(q);
      const dds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DDUser[];
      setDDList(dds);
    } catch (error) {
      console.error('Error fetching DDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDDs = ddList.filter(dd =>
    dd.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dd.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignDD = (dd: DDUser) => {
    navigation.navigate('AssignDD', { eventId: '', ddId: dd.id, ddName: dd.name });
  };

  const renderDD = ({ item }: { item: DDUser }) => (
    <Card style={styles.ddCard}>
      <View style={styles.ddHeader}>
        <View style={styles.ddAvatar}>
          <Text style={styles.ddAvatarText}>
            {item.name?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </View>
        <View style={styles.ddInfo}>
          <Text style={styles.ddName}>{item.name}</Text>
          <Text style={styles.ddEmail}>{item.email}</Text>
          {item.carDescription && (
            <Text style={styles.ddCar}>🚗 {item.carDescription}</Text>
          )}
        </View>
      </View>
      <View style={styles.ddStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.totalRidesCompleted || 0}</Text>
          <Text style={styles.statLabel}>Total Rides</Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.isActive ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.isActive ? styles.activeText : styles.inactiveText
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.assignButton}>
        <Button
          title="Assign to Event"
          variant="secondary"
          onPress={() => handleAssignDD(item)}
          fullWidth
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="DD Management" showBack onBack={() => navigation.goBack()} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          label="Search"
          placeholder="Search DDs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* DD List */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredDDs.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title="No DDs Found"
          message={searchQuery ? "No matching DDs found." : "No designated drivers in this chapter."}
        />
      ) : (
        <FlatList
          data={filteredDDs}
          renderItem={renderDD}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchDDs} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  listContent: {
    padding: spacing.lg,
  },
  ddCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  ddHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  ddAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ddAvatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  ddInfo: {
    flex: 1,
  },
  ddName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  ddEmail: {
    ...typography.caption,
    color: colors.gray[500],
  },
  ddCar: {
    ...typography.caption,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  ddStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray[500],
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  activeBadge: {
    backgroundColor: colors.successLight,
  },
  inactiveBadge: {
    backgroundColor: colors.gray[100],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.gray[500],
  },
  assignButton: {
    marginTop: spacing.sm,
  },
});

export default DDManagementScreen;
