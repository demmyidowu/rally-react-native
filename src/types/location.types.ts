/**
 * location.types.ts
 * Rally React Native
 *
 * TypeScript type definitions for location services
 * Created: 2026-01-11
 */

import { GeoPoint } from 'firebase/firestore';

/**
 * Coordinate representation
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Location with metadata
 */
export interface LocationData {
  coordinate: Coordinate;
  geoPoint: GeoPoint;
  address?: string;
  timestamp: Date;
  accuracy?: number;
}

/**
 * Pickup location for a ride
 */
export interface PickupLocation {
  address: string;
  coordinate: Coordinate;
  geoPoint: GeoPoint;
  capturedAt: Date;
}

/**
 * DD location when marking en route
 */
export interface DDLocation {
  coordinate: Coordinate;
  geoPoint: GeoPoint;
  capturedAt: Date;
}

/**
 * ETA information
 */
export interface ETAInfo {
  minutes: number;
  distance: number; // in kilometers
  calculatedAt: Date;
}

/**
 * Location permission state
 */
export type LocationPermissionState =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'restricted';

/**
 * Location error types
 */
export interface LocationErrorInfo {
  code: string;
  message: string;
  originalError?: Error;
}
