/**
 * Location Tracking Hook for Real-time Navigation
 * Continuously tracks user location and updates route via SSE
 */

import { useState, useEffect, useRef } from 'react';
import { campusService } from '../services/campusService';

interface LocationTrackingState {
    currentLocation: { lat: number; lng: number } | null;
    destination: string | null;
    route: any | null;
    distanceRemaining: string | null;
    routeCoords: Array<{ lat: number; lng: number }>;
    isTracking: boolean;
    error: string | null;
}

interface UseLocationTrackingOptions {
    updateInterval?: number; // ms between location updates
    destination?: string;
    destinationLat?: number;
    destinationLng?: number;
    mode?: 'walking' | 'taxi';
    onRouteUpdate?: (route: any) => void;
}

export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
    const {
        updateInterval = 5000, // Update every 5 seconds
        destination,
        destinationLat,
        destinationLng,
        mode = 'walking',
        onRouteUpdate
    } = options;

    const [state, setState] = useState<LocationTrackingState>({
        currentLocation: null,
        destination: null,
        route: null,
        distanceRemaining: null,
        routeCoords: [],
        isTracking: false,
        error: null
    });

    const watchIdRef = useRef<number | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Start tracking user location
    const startTracking = (dest?: string) => {
        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'Geolocation not supported' }));
            return;
        }

        const targetDestination = dest || destination;
        if (!targetDestination) {
            setState(prev => ({ ...prev, error: 'No destination specified' }));
            return;
        }

        setState(prev => ({
            ...prev,
            isTracking: true,
            destination: targetDestination,
            error: null
        }));

        // Watch position continuously
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setState(prev => ({ ...prev, currentLocation: newLocation }));

                // Update route via API
                updateRoute(newLocation.lat, newLocation.lng, targetDestination);
            },
            (error) => {
                console.error('Geolocation error:', error);
                setState(prev => ({
                    ...prev,
                    error: `Location error: ${error.message}`,
                    isTracking: false
                }));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    // Update route calculation
    const updateRoute = async (lat: number, lng: number, dest: string) => {
        try {
            const result = await campusService.updateLocation(
                lat,
                lng,
                destinationLat,
                destinationLng,
                dest,
                mode
            );

            if (result.status === 'success') {
                setState(prev => ({
                    ...prev,
                    route: result.route,
                    distanceRemaining: result.distance_remaining,
                    routeCoords: result.route_coords || []
                }));

                if (onRouteUpdate) {
                    onRouteUpdate(result);
                }
            }
        } catch (error) {
            console.error('Route update failed:', error);
        }
    };

    // Stop tracking
    const stopTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setState(prev => ({ ...prev, isTracking: false }));
    };

    // Use SSE streaming for navigation (alternative to polling)
    const startStreamingNavigation = (dest?: string) => {
        const targetDestination = dest || destination;
        if (!targetDestination) {
            setState(prev => ({ ...prev, error: 'No destination specified' }));
            return;
        }

        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'Geolocation not supported' }));
            return;
        }

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setState(prev => ({
                    ...prev,
                    isTracking: true,
                    destination: targetDestination,
                    currentLocation: { lat, lng },
                    error: null
                }));

                // Start SSE stream
                eventSourceRef.current = campusService.streamNavigationWithLocation(
                    lat,
                    lng,
                    targetDestination,
                    mode,
                    (event) => {
                        if (event.type === 'answer') {
                            setState(prev => ({
                                ...prev,
                                route: event.content
                            }));
                        } else if (event.type === 'error') {
                            setState(prev => ({
                                ...prev,
                                error: event.content,
                                isTracking: false
                            }));
                        }
                    },
                    (error) => {
                        setState(prev => ({
                            ...prev,
                            error: error.message,
                            isTracking: false
                        }));
                    }
                );

                // Continue watching position for updates
                watchIdRef.current = navigator.geolocation.watchPosition(
                    (pos) => {
                        setState(prev => ({
                            ...prev,
                            currentLocation: {
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude
                            }
                        }));
                    },
                    undefined,
                    { enableHighAccuracy: true }
                );
            },
            (error) => {
                setState(prev => ({
                    ...prev,
                    error: `Location error: ${error.message}`
                }));
            }
        );
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, []);

    return {
        ...state,
        startTracking,
        stopTracking,
        startStreamingNavigation,
        updateRoute: (lat: number, lng: number) => {
            if (state.destination) {
                updateRoute(lat, lng, state.destination);
            }
        }
    };
}
