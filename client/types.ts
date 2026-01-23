
export interface CampusNode {
  id: string;
  name: string;
  description: string;
  category: string; // Any category from database
  x: number;
  y: number;
}

export interface RouteEdge {
  from: string;
  to: string;
  weight: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  reasoning?: string[];
}

// SSE Event Types
export interface SSEEvent {
  type: 'reasoning' | 'answer' | 'error' | 'done';
  data: any;
}

export interface ReasoningStep {
  step: string;
  timestamp: string;
}

export interface AIResponse {
  answer: string;
  sources?: string[];
  reasoning?: ReasoningStep[];
}

// API Response Types
export interface RouteResponse {
  route: {
    coordinates: [number, number][];
    distance: number;
    duration: number;
    instructions: string[];
  };
  reasoning?: string[];
}

export interface NearbyService {
  id: string;
  name: string;
  category: string;
  distance: number;
  latitude: number;
  longitude: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export enum AppRoute {
  HOME = '/',
  MAP = '/map',
  INFO = '/info',
  ASSISTANT = '/assistant',
  DIRECTORY = '/directory'
}
