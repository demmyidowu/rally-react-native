/**
 * Location Services Cloud Functions
 *
 * Proxies location-related API calls to keep API keys server-side:
 * - reverseGeocode: Convert coordinates to address
 * - calculateETA: Get driving time between two points
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Define the secret - it will be available at runtime
const googleMapsApiKey = defineSecret('GOOGLE_PLACES_API_KEY');

interface ReverseGeocodeRequest {
    latitude: number;
    longitude: number;
}

interface ReverseGeocodeResponse {
    address: string;
    formattedAddress: string;
    city?: string;
    state?: string;
    zipCode?: string;
}

interface CalculateETARequest {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
}

interface CalculateETAResponse {
    etaMinutes: number;
    distanceMeters: number;
    distanceText: string;
    durationText: string;
}

/**
 * Convert coordinates to human-readable address
 * Uses Google Maps Geocoding API
 */
export const reverseGeocode = onCall(
    { secrets: [googleMapsApiKey] },
    async (request): Promise<ReverseGeocodeResponse> => {
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to geocode');
        }

        const { latitude, longitude } = request.data as ReverseGeocodeRequest;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new HttpsError('invalid-argument', 'latitude and longitude are required');
        }

        const apiKey = googleMapsApiKey.value();
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'Google Maps API key not configured');
        }

        try {
            const params = new URLSearchParams({
                latlng: `${latitude},${longitude}`,
                key: apiKey,
                result_type: 'street_address|premise',
            });

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?${params}`
            );

            const data = await response.json();

            if (data.status !== 'OK') {
                console.error('Geocoding API error:', data.status, data.error_message);
                // Return a fallback address
                return {
                    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                    formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                };
            }

            const result = data.results[0];
            const components = result.address_components || [];

            // Extract address components
            let city = '';
            let state = '';
            let zipCode = '';

            for (const component of components) {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                } else if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                } else if (component.types.includes('postal_code')) {
                    zipCode = component.long_name;
                }
            }

            return {
                address: result.formatted_address,
                formattedAddress: result.formatted_address,
                city,
                state,
                zipCode,
            };
        } catch (error: any) {
            console.error('reverseGeocode error:', error);
            throw new HttpsError('internal', error.message || 'Failed to geocode location');
        }
    });

/**
 * Calculate driving ETA between two points
 * Uses Google Maps Distance Matrix API
 */
export const calculateETA = onCall(
    { secrets: [googleMapsApiKey] },
    async (request): Promise<CalculateETAResponse> => {
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be logged in to calculate ETA');
        }

        const { originLat, originLng, destLat, destLng } = request.data as CalculateETARequest;

        if (!originLat || !originLng || !destLat || !destLng) {
            throw new HttpsError('invalid-argument', 'Origin and destination coordinates are required');
        }

        const apiKey = googleMapsApiKey.value();
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'Google Maps API key not configured');
        }

        try {
            const params = new URLSearchParams({
                origins: `${originLat},${originLng}`,
                destinations: `${destLat},${destLng}`,
                key: apiKey,
                mode: 'driving',
                departure_time: 'now',
            });

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
            );

            const data = await response.json();

            if (data.status !== 'OK') {
                console.error('Distance Matrix API error:', data.status, data.error_message);
                throw new HttpsError('internal', `Distance Matrix API error: ${data.status}`);
            }

            const element = data.rows[0]?.elements[0];

            if (!element || element.status !== 'OK') {
                throw new HttpsError('internal', 'Could not calculate route');
            }

            // duration_in_traffic if available, otherwise duration
            const durationSeconds = element.duration_in_traffic?.value || element.duration?.value || 0;
            const etaMinutes = Math.ceil(durationSeconds / 60);

            return {
                etaMinutes,
                distanceMeters: element.distance?.value || 0,
                distanceText: element.distance?.text || 'Unknown',
                durationText: element.duration?.text || `${etaMinutes} min`,
            };
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            console.error('calculateETA error:', error);
            throw new HttpsError('internal', error.message || 'Failed to calculate ETA');
        }
    });
