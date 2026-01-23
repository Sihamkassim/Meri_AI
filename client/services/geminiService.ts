import { SSEEvent, RouteResponse, NearbyService } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class BackendAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Stream AI query responses using Server-Sent Events
   * Connects to backend LangGraph reasoning system
   */
  streamAIQuery(
    query: string,
    onReasoning: (step: string) => void,
    onAnswer: (answer: string) => void,
    onError: (error: string) => void,
    onDone: () => void
  ): EventSource {
    const url = `${this.baseUrl}/api/ai/query/stream?query=${encodeURIComponent(query)}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('reasoning', (event) => {
      try {
        const data = JSON.parse(event.data);
        onReasoning(data.step || event.data);
      } catch {
        onReasoning(event.data);
      }
    });

    eventSource.addEventListener('answer', (event) => {
      try {
        const data = JSON.parse(event.data);
        onAnswer(data.answer || event.data);
      } catch {
        onAnswer(event.data);
      }
    });

    eventSource.addEventListener('error', (event) => {
      const errorData = event as MessageEvent;
      try {
        const data = JSON.parse(errorData.data);
        onError(data.error || 'An error occurred');
      } catch {
        onError('Connection error occurred');
      }
      eventSource.close();
    });

    eventSource.addEventListener('done', () => {
      onDone();
      eventSource.close();
    });

    eventSource.onerror = () => {
      onError('Connection to AI service lost');
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Stream route calculation with reasoning
   */
  streamRoute(
    start: string,
    end: string,
    mode: 'walking' | 'taxi' | 'urgent',
    onReasoning: (step: string) => void,
    onRoute: (route: RouteResponse) => void,
    onError: (error: string) => void,
    onDone: () => void
  ): EventSource {
    const url = `${this.baseUrl}/api/route/stream?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&mode=${mode}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('reasoning', (event) => {
      onReasoning(event.data);
    });

    eventSource.addEventListener('route', (event) => {
      try {
        const route: RouteResponse = JSON.parse(event.data);
        onRoute(route);
      } catch (error) {
        onError('Failed to parse route data');
      }
    });

    eventSource.addEventListener('error', (event) => {
      const errorData = event as MessageEvent;
      try {
        const data = JSON.parse(errorData.data);
        onError(data.error || 'Route calculation failed');
      } catch {
        onError('Route calculation error');
      }
      eventSource.close();
    });

    eventSource.addEventListener('done', () => {
      onDone();
      eventSource.close();
    });

    return eventSource;
  }

  /**
   * Get nearby services
   */
  async getNearbyServices(
    latitude: number,
    longitude: number,
    category?: string,
    radius: number = 5.0
  ): Promise<NearbyService[]> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
      });
      
      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`${this.baseUrl}/api/nearby/services?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.services || [];
    } catch (error) {
      console.error('Failed to fetch nearby services:', error);
      throw error;
    }
  }

  /**
   * Calculate route (non-streaming)
   */
  async calculateRoute(
    start: string,
    end: string,
    mode: 'walking' | 'taxi' | 'urgent' = 'walking'
  ): Promise<RouteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/route/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start, end, mode }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to calculate route:', error);
      throw error;
    }
  }

  /**
   * Standard query (non-streaming)
   */
  async query(question: string): Promise<{ answer: string; sources?: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/query/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to query AI:', error);
      throw error;
    }
  }
}

export const backendAPI = new BackendAPIService();
