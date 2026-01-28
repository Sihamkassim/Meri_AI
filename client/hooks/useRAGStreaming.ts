import { useState, useCallback, useRef, useEffect } from 'react';

export interface RAGStreamMessage {
  type: 'reasoning' | 'answer' | 'error' | 'done' | 'token';
  content?: any;
  data?: string;
}

export interface RAGResponse {
  answer?: string;
  sources?: Array<{
    title?: string;
    content: string;
    similarity?: number;
  }>;
  confidence?: number;
}

export interface UseRAGStreamingOptions {
  onReasoning?: (step: string) => void;
  onAnswer?: (data: RAGResponse) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
}

export function useRAGStreaming(options: UseRAGStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [answer, setAnswer] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStream = useCallback(async (question: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsStreaming(true);
    setReasoningSteps([]);
    setAnswer(null)
    setStreamingText('');;
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const url = `${apiUrl}/api/query`;

    console.log('[useRAGStreaming] Starting RAG query:', url);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Set the answer directly from the response
      const ragResponse: RAGResponse = {
        answer: data.answer,
        sources: data.sources,
        confidence: data.confidence,
      };
      
      setAnswer(ragResponse);
      setIsStreaming(false);
      options.onAnswer?.(ragResponse);
      options.onDone?.();

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[useRAGStreaming] Request aborted');
      } else {
        console.error('[useRAGStreaming] Fetch error:', err);
        setError(err.message || 'Connection failed');
        setIsStreaming(false);
        options.onError?.(err.message || 'Connection failed');
      }
    }
  }, [options]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    reasoningSteps,
    answer,
    error,
    streamingText,
    startStream,
    stopStream,
  };
}
