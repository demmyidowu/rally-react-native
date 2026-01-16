/**
 * Google Places Proxy
 *
 * Cloud Function that proxies Google Places API requests.
 * This keeps the API key secure on the server side.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Define the secret - it will be available at runtime
const googlePlacesApiKey = defineSecret('GOOGLE_PLACES_API_KEY');

interface PlaceAutocompleteRequest {
    input: string;
    sessionToken?: string;
}

interface PlacePrediction {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

interface PlaceDetailsRequest {
    placeId: string;
    sessionToken?: string;
}

interface PlaceDetails {
    placeId: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
}

/**
 * Search for place predictions based on user input
 * Uses Google Places Autocomplete API
 */
export const searchPlaces = onCall(
    { secrets: [googlePlacesApiKey] },
    async (request): Promise<{ predictions: PlacePrediction[] }> => {
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to search places');
        }

        const { input, sessionToken } = request.data as PlaceAutocompleteRequest;

        if (!input || input.length < 2) {
            return { predictions: [] };
        }

        const apiKey = googlePlacesApiKey.value();
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'Google Places API key not configured');
        }

        try {
            const params = new URLSearchParams({
                input,
                key: apiKey,
                components: 'country:us',
                types: 'address',
            });

            if (sessionToken) {
                params.append('sessiontoken', sessionToken);
            }

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
            );

            const data = await response.json();

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                console.error('Places API error:', data.status, data.error_message);
                throw new HttpsError('internal', `Places API error: ${data.status}`);
            }

            const predictions: PlacePrediction[] = (data.predictions || []).map((p: any) => ({
                placeId: p.place_id,
                description: p.description,
                mainText: p.structured_formatting?.main_text || '',
                secondaryText: p.structured_formatting?.secondary_text || '',
            }));

            return { predictions };
        } catch (error: any) {
            console.error('searchPlaces error:', error);
            throw new HttpsError('internal', error.message || 'Failed to search places');
        }
    });

/**
 * Get place details including coordinates
 * Uses Google Places Details API
 */
export const getPlaceDetails = onCall(
    { secrets: [googlePlacesApiKey] },
    async (request): Promise<PlaceDetails> => {
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to get place details');
        }

        const { placeId, sessionToken } = request.data as PlaceDetailsRequest;

        if (!placeId) {
            throw new HttpsError('invalid-argument', 'placeId is required');
        }

        const apiKey = googlePlacesApiKey.value();
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'Google Places API key not configured');
        }

        try {
            const params = new URLSearchParams({
                place_id: placeId,
                key: apiKey,
                fields: 'formatted_address,geometry',
            });

            if (sessionToken) {
                params.append('sessiontoken', sessionToken);
            }

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?${params}`
            );

            const data = await response.json();

            if (data.status !== 'OK') {
                console.error('Place Details API error:', data.status, data.error_message);
                throw new HttpsError('internal', `Place Details API error: ${data.status}`);
            }

            const result = data.result;

            return {
                placeId,
                formattedAddress: result.formatted_address,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
            };
        } catch (error: any) {
            console.error('getPlaceDetails error:', error);
            throw new HttpsError('internal', error.message || 'Failed to get place details');
        }
    });
