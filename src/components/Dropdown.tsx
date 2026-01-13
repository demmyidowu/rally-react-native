/**
 * Dropdown Component
 * 
 * A styled dropdown/picker for selecting from a list of options.
 * Uses a modal on both iOS and Android for consistent UX.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    SafeAreaView,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';

interface DropdownOption {
    label: string;
    value: string;
}

interface DropdownProps {
    label: string;
    placeholder?: string;
    options: DropdownOption[];
    value?: string;
    onSelect: (value: string) => void;
    error?: string;
    disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
    label,
    placeholder = 'Select an option',
    options,
    value,
    onSelect,
    error,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onSelect(optionValue);
        setIsOpen(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[
                    styles.selector,
                    error && styles.selectorError,
                    disabled && styles.selectorDisabled,
                ]}
                onPress={() => !disabled && setIsOpen(true)}
                disabled={disabled}
            >
                <Text style={[
                    styles.selectorText,
                    !selectedOption && styles.placeholderText,
                ]}>
                    {selectedOption?.label || placeholder}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                visible={isOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Text style={styles.closeButton}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        item.value === value && styles.optionSelected,
                                    ]}
                                    onPress={() => handleSelect(item.value)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        item.value === value && styles.optionTextSelected,
                                    ]}>
                                        {item.label}
                                    </Text>
                                    {item.value === value && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    </SafeAreaView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.caption,
        color: colors.gray[700],
        marginBottom: spacing.xs,
        fontWeight: '500',
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.gray[50],
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.md,
        padding: spacing.md,
        minHeight: 48,
    },
    selectorError: {
        borderColor: colors.error,
    },
    selectorDisabled: {
        opacity: 0.5,
    },
    selectorText: {
        ...typography.body,
        color: colors.gray[800],
        flex: 1,
    },
    placeholderText: {
        color: colors.gray[400],
    },
    arrow: {
        color: colors.gray[400],
        fontSize: 12,
        marginLeft: spacing.sm,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
    },
    modalTitle: {
        ...typography.h3,
        color: colors.gray[800],
    },
    closeButton: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    optionSelected: {
        backgroundColor: colors.primaryLight,
    },
    optionText: {
        ...typography.body,
        color: colors.gray[800],
        flex: 1,
    },
    optionTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    checkmark: {
        color: colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    separator: {
        height: 1,
        backgroundColor: colors.gray[100],
    },
});

export default Dropdown;
