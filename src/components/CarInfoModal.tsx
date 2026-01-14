/**
 * Car Info Modal Component
 *
 * Modal that prompts DD to enter car info before going active.
 * Car info is not persisted - must be entered each session.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './theme';
import { Button } from './Button';

export interface CarInfo {
    color: string;
    make: string;
    model: string;
}

interface CarInfoModalProps {
    visible: boolean;
    onConfirm: (carInfo: CarInfo) => void;
    onCancel: () => void;
}

export const CarInfoModal: React.FC<CarInfoModalProps> = ({
    visible,
    onConfirm,
    onCancel,
}) => {
    const [color, setColor] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!color.trim() || !make.trim() || !model.trim()) {
            setError('Please fill in all fields');
            return;
        }

        onConfirm({
            color: color.trim(),
            make: make.trim(),
            model: model.trim(),
        });

        // Reset for next time
        setColor('');
        setMake('');
        setModel('');
        setError('');
    };

    const handleCancel = () => {
        setColor('');
        setMake('');
        setModel('');
        setError('');
        onCancel();
    };

    const isValid = color.trim() && make.trim() && model.trim();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>🚗 Enter Car Information</Text>
                        <Text style={styles.subtitle}>
                            Help riders identify your vehicle
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Car Color</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Blue, Silver, Red"
                                placeholderTextColor={colors.gray[400]}
                                value={color}
                                onChangeText={setColor}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Make</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Toyota, Honda, Ford"
                                placeholderTextColor={colors.gray[400]}
                                value={make}
                                onChangeText={setMake}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Model</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Camry, Civic, F-150"
                                placeholderTextColor={colors.gray[400]}
                                value={model}
                                onChangeText={setModel}
                                autoCapitalize="words"
                            />
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}
                    </View>

                    <View style={styles.preview}>
                        <Text style={styles.previewLabel}>Riders will see:</Text>
                        <Text style={styles.previewText}>
                            {isValid
                                ? `${color} ${make} ${model}`
                                : 'Blue Toyota Camry'}
                        </Text>
                    </View>

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <Button
                            title="Go Active"
                            onPress={handleConfirm}
                            disabled={!isValid}
                            style={styles.confirmButton}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    container: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
        ...shadows.lg,
    },
    header: {
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.gray[900],
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.gray[600],
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    form: {
        marginBottom: spacing.md,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[700],
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...typography.body,
        color: colors.gray[800],
        backgroundColor: colors.white,
    },
    error: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    preview: {
        backgroundColor: colors.gray[50],
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    previewLabel: {
        ...typography.caption,
        color: colors.gray[500],
        marginBottom: spacing.xs,
    },
    previewText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.primary,
    },
    buttons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.md,
    },
    cancelButtonText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[600],
    },
    confirmButton: {
        flex: 1,
    },
});

export default CarInfoModal;
