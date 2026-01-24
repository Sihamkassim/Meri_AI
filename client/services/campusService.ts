
import { CampusNode } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export interface NearbyService {
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    description?: string;
    distance_km?: number;
}

export interface AIResponse {
    answer: string;
    intent: string;
    confidence: string;
    sources: string[];
    reasoning_steps: string[];
}

export const campusService = {
    async getNearbyServices(category: string, lat?: number, lon?: number): Promise<NearbyService[]> {
        try {
            const url = new URL(`${API_URL}/api/nearby`);
            url.searchParams.append('category', category);
            if (lat) url.searchParams.append('latitude', lat.toString());
            if (lon) url.searchParams.append('longitude', lon.toString());

            const response = await fetch(url.toString());
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.services || [];
        } catch (error) {
            console.error('Error fetching nearby services:', error);
            return [];
        }
    },

    /**
     * Stream navigation with live location updates via SSE
     * Recalculates route as user moves
     */
    streamNavigationWithLocation(
        currentLat: number,
        currentLng: number,
        destination: string,
        mode: string = 'walking',
        onMessage: (event: any) => void,
        onError?: (error: Error) => void
    ): EventSource {
        const url = new URL(`${API_URL}/api/location/navigate/stream`);
        url.searchParams.append('current_lat', currentLat.toString());
        url.searchParams.append('current_lng', currentLng.toString());
        url.searchParams.append('destination', destination);
        url.searchParams.append('mode', mode);

        const eventSource = new EventSource(url.toString());

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
                if (data.type === 'done' || data.type === 'error') {
                    eventSource.close();
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            eventSource.close();
            if (onError) onError(new Error('Navigation stream disconnected'));
        };

        return eventSource;
    },

    /**
     * Update current location and get route recalculation
     */
    async updateLocation(
        currentLat: number,
        currentLng: number,
        destinationLat?: number,
        destinationLng?: number,
        destinationName?: string,
        mode: string = 'walking'
    ): Promise<any> {
        try {
            const url = new URL(`${API_URL}/api/location/update`);
            url.searchParams.append('latitude', currentLat.toString());
            url.searchParams.append('longitude', currentLng.toString());
            if (destinationLat) url.searchParams.append('destination_lat', destinationLat.toString());
            if (destinationLng) url.searchParams.append('destination_lng', destinationLng.toString());
            if (destinationName) url.searchParams.append('destination_name', destinationName);
            url.searchParams.append('mode', mode);

            const response = await fetch(url.toString(), { method: 'POST' });
            if (!response.ok) throw new Error('Location update failed');
            return await response.json();
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    },

    async queryAI(query: string, lat?: number, lon?: number): Promise<AIResponse> {
        try {
            const response = await fetch(`${API_URL}/api/ai/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    latitude: lat,
                    longitude: lon
                }),
            });
            if (!response.ok) throw new Error('AI query failed');
            return await response.json();
        } catch (error) {
            console.error('Error querying AI:', error);
            throw error;
        }
    }
};
