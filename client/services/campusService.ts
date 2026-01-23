
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
