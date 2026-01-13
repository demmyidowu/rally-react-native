/**
 * TransferAdminScreen
 *
 * Allows current chapter admin to transfer their admin status to another member.
 * After transfer, the current admin becomes a regular member.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { AdminScreenProps } from '../../navigation/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../components/theme';
import { Button, Card, EmptyState } from '../../components';
import { selectUser } from '../../store/slices/authSlice';
import { User } from '../../models';
import { db } from '../../config/firebase';

type Props = AdminScreenProps<'TransferAdmin'>;

interface MemberItem extends User {
    isSelected: boolean;
}

const TransferAdminScreen: React.FC<Props> = ({ navigation }) => {
    const currentUser = useSelector(selectUser);
    const functions = getFunctions();

    const [members, setMembers] = useState<MemberItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);

    // Fetch chapter members (excluding current user and other admins)
    const fetchMembers = useCallback(async () => {
        if (!currentUser?.chapterId) {
            setLoading(false);
            return;
        }

        try {
            const membersQuery = query(
                collection(db, 'users'),
                where('chapterId', '==', currentUser.chapterId),
                where('role', '==', 'member')
            );

            const snapshot = await getDocs(membersQuery);
            const memberList: MemberItem[] = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isSelected: false,
                } as MemberItem))
                .filter(member => member.id !== currentUser.id);

            setMembers(memberList);
        } catch (error) {
            console.error('Error fetching members:', error);
            Alert.alert('Error', 'Failed to load chapter members');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentUser?.chapterId, currentUser?.id]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMembers();
    };

    const handleSelectMember = (member: MemberItem) => {
        setSelectedMember(member);
        setMembers(prev =>
            prev.map(m => ({
                ...m,
                isSelected: m.id === member.id,
            }))
        );
    };

    const handleTransfer = async () => {
        if (!selectedMember) {
            Alert.alert('Select Member', 'Please select a member to transfer admin status to.');
            return;
        }

        Alert.alert(
            'Transfer Admin Status',
            `Are you sure you want to transfer your admin status to ${selectedMember.name}?\n\nThis action cannot be undone. You will become a regular member.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Transfer',
                    style: 'destructive',
                    onPress: confirmTransfer,
                },
            ]
        );
    };

    const confirmTransfer = async () => {
        if (!selectedMember) return;

        setTransferring(true);
        try {
            const transferAdminStatus = httpsCallable(functions, 'transferAdminStatus');
            const result = await transferAdminStatus({ newAdminUserId: selectedMember.id });

            const data = result.data as { success: boolean; message: string };

            if (data.success) {
                Alert.alert(
                    'Transfer Complete',
                    `Admin status has been transferred to ${selectedMember.name}. You are now a regular member.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.goBack(),
                        },
                    ]
                );
            } else {
                Alert.alert('Transfer Failed', data.message || 'Failed to transfer admin status.');
            }
        } catch (error: any) {
            console.error('Transfer error:', error);
            Alert.alert(
                'Transfer Failed',
                error.message || 'An error occurred while transferring admin status.'
            );
        } finally {
            setTransferring(false);
        }
    };

    const renderMember = ({ item }: { item: MemberItem }) => (
        <TouchableOpacity
            style={[styles.memberCard, item.isSelected && styles.memberCardSelected]}
            onPress={() => handleSelectMember(item)}
            disabled={transferring}
        >
            <View style={styles.memberInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                    <Text style={styles.memberClass}>Class Year: {item.classYear}</Text>
                </View>
            </View>
            {item.isSelected && (
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading members...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transfer Admin</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Warning Card */}
            <Card style={styles.warningCard}>
                <View style={styles.warningContent}>
                    <Ionicons name="warning" size={24} color={colors.warning} />
                    <View style={styles.warningTextContainer}>
                        <Text style={styles.warningTitle}>Important</Text>
                        <Text style={styles.warningText}>
                            Transferring admin status will make you a regular member. The new admin will have full control over the chapter.
                        </Text>
                    </View>
                </View>
            </Card>

            {/* Member List */}
            {members.length === 0 ? (
                <EmptyState
                    icon="people-outline"
                    title="No Members Found"
                    message="There are no other members in your chapter to transfer admin status to."
                />
            ) : (
                <FlatList
                    data={members}
                    renderItem={renderMember}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListHeaderComponent={
                        <Text style={styles.sectionTitle}>
                            Select a member to become the new admin:
                        </Text>
                    }
                />
            )}

            {/* Transfer Button */}
            {members.length > 0 && (
                <View style={styles.footer}>
                    <Button
                        title={transferring ? 'Transferring...' : 'Transfer Admin Status'}
                        onPress={handleTransfer}
                        loading={transferring}
                        disabled={!selectedMember || transferring}
                        variant={selectedMember ? 'primary' : 'secondary'}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.gray[50],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body,
        color: colors.gray[500],
        marginTop: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.gray[800],
    },
    placeholder: {
        width: 32,
    },
    warningCard: {
        margin: spacing.md,
        backgroundColor: colors.warningLight,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
    },
    warningContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
    },
    warningTextContainer: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    warningTitle: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[800],
        marginBottom: spacing.xs,
    },
    warningText: {
        ...typography.caption,
        color: colors.gray[600],
    },
    sectionTitle: {
        ...typography.body,
        color: colors.gray[600],
        marginBottom: spacing.md,
    },
    listContent: {
        padding: spacing.md,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    memberCardSelected: {
        borderWidth: 2,
        borderColor: colors.success,
        backgroundColor: colors.successLight,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        ...typography.h3,
        color: colors.white,
        fontWeight: '600',
    },
    memberDetails: {
        marginLeft: spacing.md,
        flex: 1,
    },
    memberName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[800],
    },
    memberEmail: {
        ...typography.caption,
        color: colors.gray[500],
    },
    memberClass: {
        ...typography.caption,
        color: colors.gray[400],
        marginTop: spacing.xs,
    },
    footer: {
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.gray[200],
    },
});

export default TransferAdminScreen;
