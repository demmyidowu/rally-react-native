/**
 * useLocation.ts
 * Rally React Native
 *
 * React hook for location services
 * Created: 2026-01-11
 *
 * Provides a convenient React hook wrapper around locationService
 * for use in functional components.
 */

import { useState, useCallback, useEffect } from 'react';
import locationService, {
  LocationError,
  LocationErrorCode,
  PermissionStatus,
  Coordinate,
  LocationWithAddress,
} from '@/services/locationService';

/**
 * Location state
 */
interface LocationState {
  location: Coordinate | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: PermissionStatus;
}

/**
 * Return type for useLocation hook
 */
interface UseLocationReturn extends LocationState {
  requestPermission: () => Promise<boolean>;
  captureLocation: () => Promise<void>;
  captureLocationWithAddress: () => Promise<void>;
  clearError: () => void;
  clearLocation: () => void;
}

/**
 * Custom hook for location services
 *
 * Example usage:
 * ```tsx
 * const {
 *   location,
 *   address,
 *   isLoading,
 *   error,
 *   permissionStatus,
 *   requestPermission,
 *   captureLocationWithAddress
 * } = useLocation();
 *
 * // Request permission
 * await requestPermission();
 *
 * // Capture location
 * await captureLocationWithAddress();
 * ```
 */
export function useLocation(): UseLocationReturn {
  const [state, setState] = useState<LocationState>({
    location: null,
    address: null,
    isLoading: false,
    error: null,
    permissionStatus: locationService.currentPermissionStatus,
  });

  // Update permission status on mount and when it changes
  useEffect(() => {
    const checkPermission = async () => {
      // This will trigger an update if permission status has changed
      const status = locationService.currentPermissionStatus;
      setState((prev) => ({ ...prev, permissionStatus: status }));
    };

    checkPermission();
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const granted = await locationService.requestLocationPermission();

      setState((prev) => ({
        ...prev,
        permissionStatus: locationService.currentPermissionStatus,
        isLoading: false,
        error: granted ? null : 'Location permission denied',
      }));

      return granted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Permission request failed';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  /**
   * Capture location (coordinate only, no address)
   */
  const captureLocation = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await locationService.captureLocationOnce();

      setState((prev) => ({
        ...prev,
        location: result.coordinate,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      let errorMessage = 'Failed to capture location';

      if (error instanceof LocationError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  /**
   * Capture location with address
   */
  const captureLocationWithAddress = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await locationService.captureLocationAndAddress();

      setState((prev) => ({
        ...prev,
        location: result.coordinate,
        address: result.address,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      let errorMessage = 'Failed to capture location';

      if (error instanceof LocationError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear location data
   */
  const clearLocation = useCallback(() => {
    locationService.clearCache();
    setState((prev) => ({
      ...prev,
      location: null,
      address: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    requestPermission,
    captureLocation,
    captureLocationWithAddress,
    clearError,
    clearLocation,
  };
}

/**
 * Hook for checking permission status only
 *
 * Useful for UI components that need to show permission prompts
 */
export function useLocationPermission() {
  const [status, setStatus] = useState<PermissionStatus>(
    locationService.currentPermissionStatus
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);

    try {
      const granted = await locationService.requestLocationPermission();
      setStatus(locationService.currentPermissionStatus);
      return granted;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  return {
    status,
    isRequesting,
    isGranted: status === PermissionStatus.GRANTED,
    isDenied: status === PermissionStatus.DENIED,
    isUndetermined: status === PermissionStatus.UNDETERMINED,
    requestPermission,
  };
}

export default useLocation;
