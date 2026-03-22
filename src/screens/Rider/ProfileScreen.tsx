/**
 * Profile Screen
 *
 * Displays user profile information and settings:
 * - User info (name, email, chapter)
 * - Edit name
 * - Leave chapter
 * - Sign out
 * - Delete account
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RiderScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, signOut, updateUserProfile } from '../../store/slices/authSlice';
import { Header, Card, Button } from '../../components';
import { colors, spacing, typography, borderRadius, shadows } from '../../components/theme';
import { getChapterById } from '../../data/chapters';
import { deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { deleteUser } from 'firebase/auth';

type Props = RiderScreenProps<'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);

    const chapter = user?.chapterId ? getChapterById(user.chapterId) : null;

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(signOut()).unwrap();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to sign out');
                        }
                    },
                },
            ]
        );
    };

    const handleUpdateName = async () => {
        if (!newName.trim() || !user) return;

        setLoading(true);
        try {
            await dispatch(updateUserProfile({
                userId: user.id,
                data: { name: newName.trim() }
            })).unwrap();
            setIsEditingName(false);
            Alert.alert('Success', 'Your name has been updated.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update name');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveChapter = () => {
        if (!user?.chapterId) return;

        Alert.alert(
            'Leave Chapter',
            `Are you sure you want to leave ${chapter?.name || 'your chapter'}? You'll need to request to join again.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await dispatch(updateUserProfile({
                                userId: user.id,
                                data: { chapterId: '' }
                            })).unwrap();
                            Alert.alert('Success', 'You have left the chapter.');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to leave chapter');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Delete Account',
            'This action cannot be undone. All your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => confirmDeleteAccount(),
                },
            ]
        );
    };

    const confirmDeleteAccount = () => {
        Alert.alert(
            'Final Confirmation',
            'Are you absolutely sure? Type "DELETE" to confirm.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;

                        setLoading(true);
                        try {
                            // Delete Firestore document
                            await deleteDoc(doc(db, 'users', user.id));

                            // Delete Firebase Auth user
                            const currentUser = auth.currentUser;
                            if (currentUser) {
                                await deleteUser(currentUser);
                            }

                            dispatch(signOut());
                        } catch (error: any) {
                            // If re-auth required
                            if (error.code === 'auth/requires-recent-login') {
                                Alert.alert(
                                    'Re-authentication Required',
                                    'For security, please sign out and sign in again before deleting your account.',
                                    [{ text: 'OK' }]
                                );
                            } else {
                                Alert.alert('Error', error.message || 'Failed to delete account');
                            }
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header title="Profile" showBack onBack={() => navigation.goBack()} />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{user?.name}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>

                {/* Profile Info Card */}
                <Card style={styles.card}>
                    <Text style={styles.cardTitle}>Profile Information</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name</Text>
                        <TouchableOpacity onPress={() => setIsEditingName(true)}>
                            <View style={styles.infoValueRow}>
                                <Text style={styles.infoValue}>{user?.name}</Text>
                                <Text style={styles.editIcon}>✏️</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{user?.email}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Chapter</Text>
                        <Text style={styles.infoValue}>
                            {chapter?.name || 'No chapter'}
                        </Text>
                    </View>

                    {user?.chapterId && (
                        <>
                            <View style={styles.divider} />
                            <TouchableOpacity
                                style={styles.leaveChapterButton}
                                onPress={handleLeaveChapter}
                                disabled={loading}
                            >
                                <Text style={styles.leaveChapterText}>Leave Chapter</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Card>

                {/* Quick Links */}
                <Card style={styles.card}>
                    <TouchableOpacity
                        style={styles.navRow}
                        onPress={() => navigation.navigate('Help')}
                    >
                        <Text style={styles.navRowText}>Help & Support</Text>
                        <Text style={styles.navRowChevron}>›</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={styles.navRow}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text style={styles.navRowText}>Settings</Text>
                        <Text style={styles.navRowChevron}>›</Text>
                    </TouchableOpacity>
                </Card>

                {/* Actions */}
                <View style={styles.actionsSection}>
                    <Button
                        title="Sign Out"
                        variant="secondary"
                        onPress={handleSignOut}
                        disabled={loading}
                        fullWidth
                    />

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                        disabled={loading}
                    >
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Name Modal */}
            <Modal
                visible={isEditingName}
                transparent
                animationType="fade"
                onRequestClose={() => setIsEditingName(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter your name"
                            autoCapitalize="words"
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <Button
                                title="Cancel"
                                variant="secondary"
                                onPress={() => {
                                    setNewName(user?.name || '');
                                    setIsEditingName(false);
                                }}
                                disabled={loading}
                            />
                            <View style={styles.modalButtonSpacer} />
                            <Button
                                title="Save"
                                onPress={handleUpdateName}
                                loading={loading}
                                disabled={loading || !newName.trim()}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '600',
        color: colors.primary,
    },
    userName: {
        ...typography.h2,
        color: colors.gray[800],
        marginBottom: spacing.xs,
    },
    userEmail: {
        ...typography.body,
        color: colors.gray[500],
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    cardTitle: {
        ...typography.h3,
        color: colors.gray[800],
        marginBottom: spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    infoLabel: {
        ...typography.body,
        color: colors.gray[500],
    },
    infoValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoValue: {
        ...typography.body,
        color: colors.gray[800],
        fontWeight: '500',
    },
    editIcon: {
        marginLeft: spacing.sm,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: colors.gray[100],
        marginVertical: spacing.sm,
    },
    leaveChapterButton: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    leaveChapterText: {
        ...typography.body,
        color: colors.warning,
        fontWeight: '500',
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    navRowText: {
        ...typography.body,
        color: colors.gray[800],
    },
    navRowChevron: {
        fontSize: 20,
        color: colors.gray[400],
    },
    actionsSection: {
        marginTop: spacing.md,
        marginBottom: spacing.xxl,
    },
    deleteButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    deleteButtonText: {
        ...typography.body,
        color: colors.error,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 400,
        ...shadows.lg,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.gray[800],
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.md,
        padding: spacing.md,
        ...typography.body,
        marginBottom: spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalButtonSpacer: {
        width: spacing.md,
    },
});

export default ProfileScreen;
