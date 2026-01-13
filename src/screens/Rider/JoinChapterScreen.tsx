/**
 * Join Chapter Screen
 * 
 * Allows users without a chapter to request to join one.
 * Shows available chapters and pending requests.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { Header, Card, Button, LoadingSpinner, Dropdown } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';
import { getChaptersForUniversity, getChapterById } from '../../data/chapters';
import {
    createJoinRequest,
    getUserJoinRequests,
    cancelJoinRequest,
    JoinRequest
} from '../../services/chapterJoinService';

type Props = RiderScreenProps<'JoinChapter'>;

const JoinChapterScreen: React.FC<Props> = ({ navigation }) => {
    const user = useAppSelector(selectUser);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
    const [selectedChapter, setSelectedChapter] = useState('');

    // For now, default to K-State. Can be expanded later.
    const selectedUniversity = 'ksu';

    const chapterOptions = useMemo(() => {
        const chapters = getChaptersForUniversity(selectedUniversity);
        return chapters.map(c => ({
            label: `${c.name} (${c.type === 'fraternity' ? 'Fraternity' : 'Sorority'})`,
            value: c.id,
        }));
    }, [selectedUniversity]);

    useEffect(() => {
        loadPendingRequests();
    }, [user?.id]);

    const loadPendingRequests = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const requests = await getUserJoinRequests(user.id);
            setPendingRequests(requests.filter(r => r.status === 'pending'));
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestJoin = async () => {
        if (!selectedChapter || !user) return;

        const chapter = getChapterById(selectedChapter);
        if (!chapter) {
            Alert.alert('Error', 'Invalid chapter selected');
            return;
        }

        setSubmitting(true);
        try {
            await createJoinRequest(
                user.id,
                user.name,
                user.email,
                selectedChapter,
                chapter.name,
                selectedUniversity
            );

            Alert.alert(
                'Request Sent! 🎉',
                `Your request to join ${chapter.name} has been sent to their admins. You'll be notified when they respond.`,
                [{ text: 'OK', onPress: () => loadPendingRequests() }]
            );
            setSelectedChapter('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelRequest = async (request: JoinRequest) => {
        if (!user) return;

        Alert.alert(
            'Cancel Request',
            `Cancel your request to join ${request.chapterName}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelJoinRequest(request.id, user.id);
                            Alert.alert('Cancelled', 'Your request has been cancelled');
                            loadPendingRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel request');
                        }
                    },
                },
            ]
        );
    };

    const renderPendingRequest = ({ item }: { item: JoinRequest }) => (
        <Card style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <Text style={styles.requestChapter}>{item.chapterName}</Text>
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                </View>
            </View>
            <Text style={styles.requestDate}>
                Requested {item.createdAt.toLocaleDateString()}
            </Text>
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelRequest(item)}
            >
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
        </Card>
    );

    // If user already has a chapter, show message
    if (user?.chapterId) {
        const chapter = getChapterById(user.chapterId);
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header title="Join Chapter" showBack onBack={() => navigation.goBack()} />
                <View style={styles.alreadyMemberContainer}>
                    <Text style={styles.alreadyMemberTitle}>You're Already in a Chapter!</Text>
                    <Text style={styles.alreadyMemberText}>
                        You're a member of {chapter?.name || 'a chapter'}.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Join a Chapter" showBack onBack={() => navigation.goBack()} />

            <View style={styles.content}>
                {/* Request to Join Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Request to Join</Text>
                    <Text style={styles.sectionSubtitle}>
                        Select a chapter and send a request to their admins
                    </Text>

                    <Dropdown
                        label="Select Chapter"
                        placeholder="Choose a chapter to join"
                        options={chapterOptions}
                        value={selectedChapter}
                        onSelect={setSelectedChapter}
                        disabled={submitting}
                    />

                    <Button
                        title={submitting ? 'Sending...' : 'Send Join Request'}
                        onPress={handleRequestJoin}
                        disabled={!selectedChapter || submitting}
                        loading={submitting}
                    />
                </View>

                {/* Pending Requests Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Pending Requests</Text>

                    {loading ? (
                        <LoadingSpinner />
                    ) : pendingRequests.length === 0 ? (
                        <Text style={styles.noRequests}>
                            No pending requests. Select a chapter above to send a request.
                        </Text>
                    ) : (
                        <FlatList
                            data={pendingRequests}
                            renderItem={renderPendingRequest}
                            keyExtractor={(item) => item.id}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
                                    onRefresh={loadPendingRequests}
                                    colors={[colors.primary]}
                                />
                            }
                            scrollEnabled={false}
                        />
                    )}
                </View>
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
        padding: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.gray[800],
        marginBottom: spacing.xs,
    },
    sectionSubtitle: {
        ...typography.body,
        color: colors.gray[500],
        marginBottom: spacing.md,
    },
    requestCard: {
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    requestChapter: {
        ...typography.h3,
        color: colors.gray[800],
    },
    pendingBadge: {
        backgroundColor: colors.warningLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    pendingText: {
        ...typography.caption,
        color: colors.warning,
        fontWeight: '600',
    },
    requestDate: {
        ...typography.caption,
        color: colors.gray[500],
        marginBottom: spacing.sm,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.gray[100],
    },
    cancelButtonText: {
        ...typography.body,
        color: colors.error,
        fontWeight: '500',
    },
    noRequests: {
        ...typography.body,
        color: colors.gray[400],
        textAlign: 'center',
        paddingVertical: spacing.lg,
    },
    alreadyMemberContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    alreadyMemberTitle: {
        ...typography.h2,
        color: colors.primary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    alreadyMemberText: {
        ...typography.body,
        color: colors.gray[600],
        textAlign: 'center',
    },
});

export default JoinChapterScreen;
