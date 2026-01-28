import { useState, useCallback, useRef, useEffect } from 'react';

export interface StreamingMessage {
  type: 'reasoning' | 'answer' | 'error' | 'done';
  content: any;
}

export interface AIStreamResponse {
  intent?: string;
  confidence?: string;
  final_answer?: string;
  sources_used?: any[];
  route_summary?: string;
  route_steps?: string[];
  distance_estimate?: string;
  start_coordinates?: { lat: number; lon: number; name: string };
  end_coordinates?: { lat: number; lon: number; name: string };
  route_coords?: Array<{ lat: number; lng: number }>;
}

export interface UseAIStreamingOptions {
  onReasoning?: (step: string) => void;
  onAnswer?: (data: AIStreamResponse) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export function useAIStreaming(options: UseAIStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [answer, setAnswer] = useState<AIStreamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startStream = useCallback((
    query: string,
    params: {
      mode?: string;
      urgency?: string;
      latitude?: number;
      longitude?: number;
    } = {}
  ) => {
    // Close any existing stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset state
    setIsStreaming(true);
    setReasoningSteps([]);
    setAnswer(null);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const searchParams = new URLSearchParams({
      query,
      mode: params.mode || 'walking',
      urgency: params.urgency || 'normal',
    });

    if (params.latitude) searchParams.append('latitude', params.latitude.toString());
    if (params.longitude) searchParams.append('longitude', params.longitude.toString());

    const url = `${apiUrl}/api/ai/query/stream?${searchParams.toString()}`;
    console.log('[useAIStreaming] Starting stream:', url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: StreamingMessage = JSON.parse(event.data);

        if (data.type === 'reasoning') {
          const step = data.content as string;
          setReasoningSteps(prev => [...prev, step]);
          options.onReasoning?.(step);
        } 
        else if (data.type === 'answer') {
          const response = data.content as AIStreamResponse;
          setAnswer(response);
          options.onAnswer?.(response);
        } 
        else if (data.type === 'error') {
          const errMsg = data.content as string;
          setError(errMsg);
          setIsStreaming(false);
          options.onError?.(errMsg);
          eventSource.close();
        } 
        else if (data.type === 'done') {
          setIsStreaming(false);
          options.onDone?.();
          eventSource.close();
        }
      } catch (err) {
        console.error('[useAIStreaming] Parse error:', err);
        setError('Failed to parse server response');
        setIsStreaming(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (err) => {
      console.error('[useAIStreaming] EventSource error:', err);
      setError('Connection to server lost');
      setIsStreaming(false);
      options.onError?.('Connection to server lost');
      eventSource.close();
    };

  }, [options]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    reasoningSteps,
    answer,
    error,
    startStream,
    stopStream,
  };
}
