/**
 * Member Management Screen
 *
 * View and manage chapter members.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { Header, Card, EmptyState, LoadingSpinner, Input } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'MemberManagement'>;

interface Member {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  chapterId: string;
  classYear: number;
  role: 'admin' | 'member';
  emailVerified: boolean;
  createdAt: any;
}

const MemberManagementScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAppSelector(selectUser);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'member'>('all');

  useEffect(() => {
    fetchMembers();
  }, [user?.chapterId]);

  const fetchMembers = async () => {
    if (!user?.chapterId) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('chapterId', '==', user.chapterId)
      );
      const snapshot = await getDocs(q);
      const memberList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Member[];
      setMembers(memberList);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (member: Member) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    Alert.alert(
      'Change Role',
      `Make ${member.name} ${newRole === 'admin' ? 'an Admin' : 'a Member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', member.id), { role: newRole });
              Alert.alert('Success', `${member.name} is now ${newRole === 'admin' ? 'an Admin' : 'a Member'}`);
              fetchMembers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMember = async (member: Member) => {
    // Prevent self-deletion
    if (member.id === user?.id) {
      Alert.alert('Error', 'You cannot delete yourself');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from the chapter? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', member.id));
              Alert.alert('Success', `${member.name} has been removed from the chapter`);
              fetchMembers();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getClassYearText = (year: number): string => {
    switch (year) {
      case 1: return 'Freshman';
      case 2: return 'Sophomore';
      case 3: return 'Junior';
      case 4: return 'Senior';
      default: return `Year ${year}`;
    }
  };

  const filteredMembers = members
    .filter(m => filter === 'all' || m.role === filter)
    .filter(m =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const renderMember = ({ item }: { item: Member }) => (
    <Card style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {item.name?.charAt(0).toUpperCase() || 'M'}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberEmail}>{item.email}</Text>
          <Text style={styles.memberYear}>{getClassYearText(item.classYear)}</Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity
          style={[styles.actionButton, item.role === 'admin' && styles.removeAdminButton]}
          onPress={() => handleToggleAdmin(item)}
        >
          <Text style={[styles.actionButtonText, item.role === 'admin' && styles.removeAdminText]}>
            {item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
          </Text>
        </TouchableOpacity>
        {item.id !== user?.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteMember(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  const filters: { key: 'all' | 'admin' | 'member'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'member', label: 'Members' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Members" showBack onBack={() => navigation.goBack()} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          label="Search"
          placeholder="Search members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Members Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>{filteredMembers.length} members</Text>
      </View>

      {/* Member List */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Members Found"
          message={searchQuery ? "No matching members found." : "No members in this chapter."}
        />
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchMembers} colors={[colors.primary]} />
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
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.caption,
    color: colors.gray[600],
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  countContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
  },
  countText: {
    ...typography.caption,
    color: colors.gray[500],
  },
  listContent: {
    padding: spacing.lg,
  },
  memberCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  memberAvatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    ...typography.h3,
    color: colors.gray[800],
  },
  adminBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  adminBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  memberEmail: {
    ...typography.caption,
    color: colors.gray[500],
  },
  memberYear: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  memberActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  removeAdminButton: {
    backgroundColor: colors.gray[100],
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  removeAdminText: {
    color: colors.gray[600],
  },
  deleteButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});

export default MemberManagementScreen;
