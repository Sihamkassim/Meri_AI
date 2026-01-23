/**
 * Campus AI Services
 * Two separate chatbot integrations:
 * 1. MapChatbot - Uses LangGraph (/api/ai/query) for navigation & directions
 * 2. RAGAssistant - Uses RAG (/api/query) for campus knowledge Q&A
 */

// Base API URL - uses environment variable or defaults to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ============================================
// Types
// ============================================

export interface MapChatResponse {
  answer: string;
  intent: string;
  confidence: string;
  sources: string[];
  reasoning_steps: string[];
}

export interface StreamEvent {
  type: 'reasoning' | 'answer' | 'error' | 'done';
  content?: string;
  sources?: string[];
}

export interface RAGResponse {
  question: string;
  answer: string;
  sources: Array<{
    content: string;
    url?: string;
    title?: string;
    score?: number;
  }>;
  confidence: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Map Chatbot Service (LangGraph)
// For navigation, directions, and nearby services
// ============================================

export class MapChatbotService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Query the LangGraph-based AI for navigation and campus directions
   * Uses /api/ai/query POST endpoint
   */
  async chat(
    query: string,
    options?: {
      latitude?: number;
      longitude?: number;
      mode?: 'walking' | 'taxi' | 'urgent';
      urgency?: 'normal' | 'high';
    }
  ): Promise<MapChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          latitude: options?.latitude,
          longitude: options?.longitude,
          mode: options?.mode || 'walking',
          urgency: options?.urgency || 'normal',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[MapChatbot] Error:', error);
      throw error;
    }
  }

  /**
   * Stream response from LangGraph using GET endpoint with query params
   * Example: /api/ai/query/stream?query=take+me+to+library&mode=walking&latitude=8.564168&longitude=39.289311
   * 
   * @param query - The user's question
   * @param options - Location and mode options
   * @param onEvent - Callback for each SSE event (reasoning, answer, error, done)
   */
  async chatStream(
    query: string,
    options?: {
      latitude?: number;
      longitude?: number;
      mode?: 'walking' | 'taxi' | 'urgent';
      urgency?: 'normal' | 'high';
    },
    onEvent?: (event: StreamEvent) => void
  ): Promise<MapChatResponse> {
    // Build query parameters
    const params = new URLSearchParams({
      query: query,
      mode: options?.mode || 'walking',
      urgency: options?.urgency || 'normal',
    });

    if (options?.latitude !== undefined) {
      params.append('latitude', options.latitude.toString());
    }
    if (options?.longitude !== undefined) {
      params.append('longitude', options.longitude.toString());
    }

    const url = `${this.baseUrl}/api/ai/query/stream?${params.toString()}`;
    console.log('[MapChatbot] Streaming from:', url);

    const response: MapChatResponse = {
      answer: '',
      intent: '',
      confidence: 'medium',
      sources: [],
      reasoning_steps: [],
    };

    try {
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}`);
      }

      const reader = fetchResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data) as StreamEvent;
              
              // Handle different event types
              switch (event.type) {
                case 'reasoning':
                  if (event.content) {
                    response.reasoning_steps.push(event.content);
                    onEvent?.({ type: 'reasoning', content: event.content });
                  }
                  break;
                  
                case 'answer':
                  if (event.content) {
                    response.answer = event.content;
                    response.sources = event.sources || [];
                    onEvent?.({ type: 'answer', content: event.content, sources: event.sources });
                  }
                  break;
                  
                case 'error':
                  onEvent?.({ type: 'error', content: event.content });
                  throw new Error(event.content || 'Unknown error');
                  
                case 'done':
                  onEvent?.({ type: 'done' });
                  break;
              }
            } catch (parseError) {
              // Skip non-JSON lines
              console.debug('[MapChatbot] Skipping non-JSON line:', data);
            }
          }
        }
      }

      return response;
    } catch (error) {
      console.error('[MapChatbot] Stream error:', error);
      throw error;
    }
  }
}

// ============================================
// RAG Assistant Service
// For campus knowledge Q&A using vector search
// ============================================

export class RAGAssistantService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Query the RAG engine for campus knowledge
   * Uses /api/query endpoint
   */
  async ask(question: string, maxSources: number = 5): Promise<RAGResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          max_sources: maxSources,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[RAGAssistant] Error:', error);
      throw error;
    }
  }

  /**
   * Stream response from RAG (SSE)
   */
  async *askStream(question: string, maxSources: number = 5): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/query/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          max_sources: maxSources,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) yield parsed.token;
              if (parsed.data) yield parsed.data;
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('[RAGAssistant] Stream error:', error);
      throw error;
    }
  }
}

// ============================================
// Singleton Instances
// ============================================

/** Map Chatbot - for navigation, directions, nearby services (LangGraph) */
export const mapChatbot = new MapChatbotService();

/** RAG Assistant - for campus knowledge Q&A (Vector Search) */
export const ragAssistant = new RAGAssistantService();

// Legacy export for backward compatibility
export const campusAI = {
  getCampusInfo: async (query: string) => {
    const response = await ragAssistant.ask(query);
    return response.answer;
  }
};
