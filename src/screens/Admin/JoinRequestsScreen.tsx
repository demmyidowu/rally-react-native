/**
 * Join Requests Management Screen (Admin)
 * 
 * Allows chapter admins to view and manage join requests.
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { Card, EmptyState, LoadingSpinner } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import {
    getChapterJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    JoinRequest
} from '../../services/chapterJoinService';

type Props = AdminScreenProps<'JoinRequests'>;

const JoinRequestsScreen: React.FC<Props> = ({ navigation }) => {
    const user = useAppSelector(selectUser);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<JoinRequest[]>([]);

    useEffect(() => {
        loadRequests();
    }, [user?.chapterId]);

    const loadRequests = async () => {
        if (!user?.chapterId) return;

        setLoading(true);
        try {
            const data = await getChapterJoinRequests(user.chapterId);
            setRequests(data);
        } catch (error) {
            console.error('Error loading join requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: JoinRequest) => {
        Alert.alert(
            'Approve Request',
            `Add ${request.userName} to your chapter?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            await approveJoinRequest(request.id);
                            Alert.alert('Success! 🎉', `${request.userName} is now a member of your chapter.`);
                            loadRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to approve request');
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (request: JoinRequest) => {
        Alert.alert(
            'Reject Request',
            `Reject ${request.userName}'s request to join?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await rejectJoinRequest(request.id);
                            Alert.alert('Request Rejected', `${request.userName}'s request has been rejected.`);
                            loadRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reject request');
                        }
                    },
                },
            ]
        );
    };

    const renderRequest = ({ item }: { item: JoinRequest }) => (
        <Card style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.userName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                </View>
                <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{item.userName}</Text>
                    <Text style={styles.requestEmail}>{item.userEmail}</Text>
                    <Text style={styles.requestDate}>
                        Requested {item.createdAt.toLocaleDateString()}
                    </Text>
                </View>
            </View>

            {item.message && (
                <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Message:</Text>
                    <Text style={styles.messageText}>{item.message}</Text>
                </View>
            )}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(item)}
                >
                    <Text style={styles.approveText}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(item)}
                >
                    <Text style={styles.rejectText}>✗ Reject</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {loading ? (
                <LoadingSpinner />
            ) : requests.length === 0 ? (
                <EmptyState
                    icon="mail-open-outline"
                    title="No Pending Requests"
                    message="When new members request to join your chapter, they'll appear here."
                />
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={loadRequests}
                            colors={[colors.primary]}
                        />
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
    listContent: {
        padding: spacing.lg,
    },
    requestCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    requestHeader: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.h3,
        color: colors.primary,
    },
    requestInfo: {
        flex: 1,
    },
    requestName: {
        ...typography.h3,
        color: colors.gray[800],
    },
    requestEmail: {
        ...typography.caption,
        color: colors.gray[500],
    },
    requestDate: {
        ...typography.caption,
        color: colors.gray[400],
        marginTop: spacing.xs,
    },
    messageContainer: {
        backgroundColor: colors.gray[50],
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    messageLabel: {
        ...typography.caption,
        color: colors.gray[500],
        marginBottom: spacing.xs,
    },
    messageText: {
        ...typography.body,
        color: colors.gray[700],
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    approveButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        backgroundColor: colors.successLight,
        borderRadius: borderRadius.md,
    },
    approveText: {
        ...typography.body,
        color: colors.success,
        fontWeight: '600',
    },
    rejectButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        backgroundColor: colors.errorLight,
        borderRadius: borderRadius.md,
    },
    rejectText: {
        ...typography.body,
        color: colors.error,
        fontWeight: '600',
    },
});

export default JoinRequestsScreen;
