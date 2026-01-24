/**
 * Live Navigation Component
 * Real-time route updates as user moves
 */

'use client';

import { useLocationTracking } from '../hooks/useLocationTracking';
import { useEffect } from 'react';

export default function LiveNavigation({ destination }: { destination: string }) {
    const {
        currentLocation,
        route,
        distanceRemaining,
        routeCoords,
        isTracking,
        error,
        startTracking,
        stopTracking
    } = useLocationTracking({
        destination,
        updateInterval: 5000, // Update every 5 seconds
        onRouteUpdate: (newRoute) => {
            console.log('Route updated:', newRoute);
        }
    });

    useEffect(() => {
        // Auto-start tracking when destination is set
        if (destination) {
            startTracking(destination);
        }

        return () => {
            stopTracking();
        };
    }, [destination]);

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-800">❌ {error}</p>
            </div>
        );
    }

    if (!isTracking) {
        return (
            <div className="text-center p-4">
                <button
                    onClick={() => startTracking(destination)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                    Start Live Navigation
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Current Location */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <h3 className="font-bold text-green-800">📍 Current Location</h3>
                {currentLocation ? (
                    <p className="text-sm text-green-700">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                ) : (
                    <p className="text-sm text-green-700">Detecting...</p>
                )}
            </div>

            {/* Destination */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <h3 className="font-bold text-blue-800">🎯 Destination</h3>
                <p className="text-sm text-blue-700">{destination}</p>
                {distanceRemaining && (
                    <p className="text-sm font-semibold text-blue-900 mt-2">
                        Distance: {distanceRemaining}
                    </p>
                )}
            </div>

            {/* Route Information */}
            {route && (
                <div className="bg-gray-50 border-l-4 border-gray-500 p-4">
                    <h3 className="font-bold text-gray-800">🗺️ Route</h3>
                    <div className="text-sm text-gray-700 whitespace-pre-line mt-2">
                        {route}
                    </div>
                    {routeCoords.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                            {routeCoords.length} waypoints along the path
                        </p>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-2">
                <button
                    onClick={stopTracking}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                    Stop Tracking
                </button>
                <button
                    onClick={() => startTracking(destination)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    Refresh Route
                </button>
            </div>
        </div>
    );
}
