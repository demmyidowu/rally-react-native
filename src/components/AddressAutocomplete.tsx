/**
 * AddressAutocomplete Component
 *
 * Address autocomplete using Cloud Function proxy to Google Places API.
 * This keeps the API key secure on the server side.
 *
 * Usage:
 * ```tsx
 * <AddressAutocomplete
 *   label="Pickup Location"
 *   placeholder="Enter your address"
 *   onAddressSelect={(address, lat, lng) => {
 *     console.log(address, lat, lng);
 *   }}
 * />
 * ```
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from './theme';
import {
    searchPlaces,
    getPlaceDetails,
    generateSessionToken,
    PlacePrediction,
} from '../services/placesService';

export interface AddressAutocompleteProps {
    label?: string;
    placeholder?: string;
    initialValue?: string;
    onAddressSelect: (address: string, latitude: number, longitude: number) => void;
    onError?: (error: string) => void;
    editable?: boolean;
    error?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    label,
    placeholder = 'Enter address',
    initialValue,
    onAddressSelect,
    onError,
    editable = true,
    error,
}) => {
    const [inputValue, setInputValue] = useState(initialValue || '');
    const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const sessionTokenRef = useRef<string>(generateSessionToken());
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback(async (text: string) => {
        if (text.length < 2) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchPlaces(text, sessionTokenRef.current);
            setPredictions(results);
            setShowDropdown(results.length > 0);
        } catch (err: any) {
            console.error('Search error:', err);
            onError?.(err.message || 'Failed to search addresses');
            setPredictions([]);
        } finally {
            setIsLoading(false);
        }
    }, [onError]);

    const handleInputChange = useCallback((text: string) => {
        setInputValue(text);

        // Debounce API calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            handleSearch(text);
        }, 300);
    }, [handleSearch]);

    const handleSelectPrediction = useCallback(async (prediction: PlacePrediction) => {
        setInputValue(prediction.description);
        setShowDropdown(false);
        setPredictions([]);
        setIsLoading(true);

        try {
            const details = await getPlaceDetails(
                prediction.placeId,
                sessionTokenRef.current
            );
            // Generate new session token for next search
            sessionTokenRef.current = generateSessionToken();
            onAddressSelect(details.formattedAddress, details.latitude, details.longitude);
        } catch (err: any) {
            console.error('Get details error:', err);
            onError?.(err.message || 'Failed to get address details');
        } finally {
            setIsLoading(false);
        }
    }, [onAddressSelect, onError]);

    const renderPrediction = ({ item }: { item: PlacePrediction }) => (
        <TouchableOpacity
            style={styles.predictionRow}
            onPress={() => handleSelectPrediction(item)}
        >
            <Text style={styles.predictionMain}>{item.mainText}</Text>
            <Text style={styles.predictionSecondary}>{item.secondaryText}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                error && styles.inputContainerError,
                !editable && styles.inputContainerDisabled,
            ]}>
                <TextInput
                    style={styles.textInput}
                    value={inputValue}
                    onChangeText={handleInputChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.gray[400]}
                    editable={editable}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                />
                {isLoading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.loader}
                    />
                )}
            </View>

            {showDropdown && predictions.length > 0 && (
                <View style={styles.dropdown}>
                    <FlatList
                        data={predictions}
                        renderItem={renderPrediction}
                        keyExtractor={(item) => item.placeId}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
        zIndex: 1000,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[700],
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.md,
        backgroundColor: colors.white,
        minHeight: 48,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    inputContainerDisabled: {
        backgroundColor: colors.gray[100],
    },
    textInput: {
        flex: 1,
        ...typography.body,
        color: colors.gray[800],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    loader: {
        marginRight: spacing.md,
    },
    dropdown: {
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        maxHeight: 200,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.md,
        ...Platform.select({
            ios: {
                shadowColor: colors.gray[900],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    predictionRow: {
        padding: spacing.md,
    },
    predictionMain: {
        ...typography.body,
        color: colors.gray[800],
        fontWeight: '500',
    },
    predictionSecondary: {
        ...typography.caption,
        color: colors.gray[500],
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: colors.gray[100],
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
});

export default AddressAutocomplete;
