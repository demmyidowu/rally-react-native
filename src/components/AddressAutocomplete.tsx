/**
 * AddressAutocomplete Component
 *
 * Google Places-powered address autocomplete input.
 * Returns address string along with latitude/longitude coordinates.
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

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
    GooglePlacesAutocomplete,
    GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import { colors, spacing, typography, borderRadius } from './theme';

// TODO: Move to environment variable
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

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
    const ref = useRef<GooglePlacesAutocompleteRef>(null);

    // Set initial value if provided
    React.useEffect(() => {
        if (initialValue && ref.current) {
            ref.current.setAddressText(initialValue);
        }
    }, [initialValue]);

    const handlePress = (data: any, details: any | null) => {
        if (details?.geometry?.location) {
            const { lat, lng } = details.geometry.location;
            const address = data.description || details.formatted_address || '';
            onAddressSelect(address, lat, lng);
        } else {
            // Fallback if no geometry (should rarely happen)
            onError?.('Could not get coordinates for this address');
        }
    };

    const handleFail = (error: any) => {
        console.error('Google Places error:', error);
        onError?.('Failed to fetch address suggestions');
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                error && styles.inputContainerError,
                !editable && styles.inputContainerDisabled,
            ]}>
                <GooglePlacesAutocomplete
                    ref={ref}
                    placeholder={placeholder}
                    onPress={handlePress}
                    onFail={handleFail}
                    fetchDetails={true}
                    enablePoweredByContainer={false}
                    minLength={2}
                    debounce={300}
                    query={{
                        key: GOOGLE_PLACES_API_KEY,
                        language: 'en',
                        components: 'country:us', // Restrict to US addresses
                    }}
                    styles={{
                        container: styles.autocompleteContainer,
                        textInputContainer: styles.textInputContainer,
                        textInput: [
                            styles.textInput,
                            !editable && styles.textInputDisabled,
                        ],
                        listView: styles.listView,
                        row: styles.row,
                        separator: styles.separator,
                        description: styles.description,
                        loader: styles.loader,
                    }}
                    textInputProps={{
                        editable,
                        placeholderTextColor: colors.gray[400],
                        autoCapitalize: 'words',
                        autoCorrect: false,
                    }}
                    // Near Manhattan, KS for better local results
                    predefinedPlacesAlwaysVisible={false}
                    nearbyPlacesAPI="GooglePlacesSearch"
                    GooglePlacesSearchQuery={{
                        rankby: 'distance',
                    }}
                    GooglePlacesDetailsQuery={{
                        fields: 'formatted_address,geometry',
                    }}
                    filterReverseGeocodingByTypes={[
                        'locality',
                        'administrative_area_level_3',
                    ]}
                />
            </View>
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
            {!GOOGLE_PLACES_API_KEY && (
                <Text style={styles.warningText}>
                    ⚠️ Google Places API key not configured
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.body,
        fontWeight: '600',
        color: colors.gray[700],
        marginBottom: spacing.xs,
    },
    inputContainer: {
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
    autocompleteContainer: {
        flex: 0,
    },
    textInputContainer: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderBottomWidth: 0,
    },
    textInput: {
        ...typography.body,
        color: colors.gray[800],
        height: 46,
        paddingHorizontal: spacing.md,
        paddingVertical: 0,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        backgroundColor: 'transparent',
    },
    textInputDisabled: {
        color: colors.gray[500],
    },
    listView: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderRadius: borderRadius.md,
        zIndex: 1000,
        elevation: 5,
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
    row: {
        backgroundColor: colors.white,
        padding: spacing.md,
    },
    separator: {
        height: 1,
        backgroundColor: colors.gray[100],
    },
    description: {
        ...typography.body,
        color: colors.gray[700],
    },
    loader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: spacing.sm,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    warningText: {
        ...typography.caption,
        color: colors.warning,
        marginTop: spacing.xs,
    },
});

export default AddressAutocomplete;
