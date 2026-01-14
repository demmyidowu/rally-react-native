/**
 * Places Service
 *
 * Client-side service for calling Google Places proxy Cloud Functions.
 * This keeps the API key secure on the server side.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface PlacePrediction {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

export interface PlaceDetails {
    placeId: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
}

/**
 * Search for address suggestions using Google Places autocomplete
 * Calls Cloud Function that proxies to Google Places API
 */
export const searchPlaces = async (
    input: string,
    sessionToken?: string
): Promise<PlacePrediction[]> => {
    if (!input || input.length < 2) {
        return [];
    }

    try {
        const searchPlacesFunc = httpsCallable<
            { input: string; sessionToken?: string },
            { predictions: PlacePrediction[] }
        >(functions, 'searchPlaces');

        const result = await searchPlacesFunc({ input, sessionToken });
        return result.data.predictions;
    } catch (error: any) {
        console.error('searchPlaces error:', error);
        throw new Error(error.message || 'Failed to search places');
    }
};

/**
 * Get place details including coordinates
 * Calls Cloud Function that proxies to Google Places API
 */
export const getPlaceDetails = async (
    placeId: string,
    sessionToken?: string
): Promise<PlaceDetails> => {
    try {
        const getPlaceDetailsFunc = httpsCallable<
            { placeId: string; sessionToken?: string },
            PlaceDetails
        >(functions, 'getPlaceDetails');

        const result = await getPlaceDetailsFunc({ placeId, sessionToken });
        return result.data;
    } catch (error: any) {
        console.error('getPlaceDetails error:', error);
        throw new Error(error.message || 'Failed to get place details');
    }
};

/**
 * Generate a session token for Places API
 * Session tokens group autocomplete and details requests for billing
 */
export const generateSessionToken = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
