/**
 * DD Car Settings Screen
 *
 * Allows DD to update their car information
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DDScreenProps } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectUser, updateUserProfile } from '../../store/slices/authSlice';
import { Card, Input, Button } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../components/theme';

type Props = DDScreenProps<'CarSettings'>;

const CarSettingsScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);

    const [carMake, setCarMake] = useState(user?.carMake || '');
    const [carModel, setCarModel] = useState(user?.carModel || '');
    const [carColor, setCarColor] = useState(user?.carColor || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setCarColor(user.carColor || '');
            setCarMake(user.carMake || '');
            setCarModel(user.carModel || '');
        }
    }, [user?.carColor, user?.carMake, user?.carModel]);

    const handleSave = async () => {
        if (!carMake.trim() || !carModel.trim() || !carColor.trim()) {
            Alert.alert('Required Fields', 'Please fill in make, model, and color.');
            return;
        }

        if (!user?.id) return;

        setSaving(true);
        try {
            await dispatch(updateUserProfile({
                userId: user.id,
                data: {
                    carColor: carColor.trim(),
                    carMake: carMake.trim(),
                    carModel: carModel.trim(),
                },
            })).unwrap();

            Alert.alert('Saved', 'Car information updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save car information');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.title}>Your Vehicle Information</Text>
                    <Text style={styles.subtitle}>
                        This information helps riders identify your car
                    </Text>

                    <Input
                        label="Car Color *"
                        placeholder="e.g., Silver, Black, Red"
                        value={carColor}
                        onChangeText={setCarColor}
                    />

                    <Input
                        label="Make *"
                        placeholder="e.g., Toyota, Honda, Ford"
                        value={carMake}
                        onChangeText={setCarMake}
                    />

                    <Input
                        label="Model *"
                        placeholder="e.g., Camry, Civic, F-150"
                        value={carModel}
                        onChangeText={setCarModel}
                    />
                </Card>

                <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Preview:</Text>
                    <Text style={styles.previewText}>
                        {carColor || 'Color'} {carMake || 'Make'} {carModel || 'Model'}
                    </Text>
                </View>

                <Button
                    title="Save Car Info"
                    onPress={handleSave}
                    loading={saving}
                    fullWidth
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.gray[800],
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.body,
        color: colors.gray[600],
        marginBottom: spacing.lg,
    },
    previewCard: {
        backgroundColor: colors.primaryLight,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    previewLabel: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    previewText: {
        ...typography.h3,
        color: colors.primaryDark,
    },
});

export default CarSettingsScreen;
