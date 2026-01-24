'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Navigation, X, MessageCircle, Route, MapPin, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { useNavigationStreaming, NavigationResponse } from '../hooks/useNavigationStreaming';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  reasoning_steps?: string[];
  route_coords?: Array<{ lat: number; lng: number }>;
  distance?: string;
}

interface MapChatbotProps {
  /** Current user latitude (from geolocation or map center) */
  latitude?: number;
  /** Current user longitude */
  longitude?: number;
  /** Currently selected node name for context */
  selectedNodeName?: string;
  /** Travel mode preference */
  mode?: 'walking' | 'taxi' | 'urgent';
  /** Callback when route is generated */
  onRouteGenerated?: (route: NavigationResponse) => void;
}

// Default ASTU campus coordinates
const DEFAULT_LATITUDE = 8.564168;
const DEFAULT_LONGITUDE = 39.289311;

const MapChatbot: React.FC<MapChatbotProps> = ({
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  selectedNodeName,
  mode = 'walking',
  onRouteGenerated,
  embedded = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '🗺️ Hi! I\'m your ASTU Navigation Assistant!\n\nAsk me:\n• "How do I get to the library?"\n• "Route from Block 57 to ICT Center"\n• "Where is the nearest mosque?"\n\nI\'ll show you the walking path on the map!',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isStreaming, reasoningSteps, answer, error, startStream } = useNavigationStreaming({
    onAnswer: (data) => {
      console.log('[MapChatbot] Received navigation answer:', data);
      
      // Use the full answer from backend (contains complete route details)
      const content = data.answer || data.route_summary || data.final_answer || 'Route calculated - check the map!';
      
      // Add AI response to messages
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: content,
        timestamp: Date.now(),
        reasoning_steps: reasoningSteps,
        route_coords: data.route_coords,
        distance: data.distance_estimate,
      };
      setMessages(prev => [...prev, aiMessage]);

      // Trigger route visualization
      if (onRouteGenerated) {
        onRouteGenerated(data);
      }
    },
    onError: (errMsg) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${errMsg}`,
        timestamp: Date.now(),
      }]);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, reasoningSteps]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    const userQuery = input;
    setInput('');

    // Start SSE streaming with current location
    startStream(userQuery, {
      latitude,
      longitude,
      mode,
      urgency: mode === 'urgent' ? 'high' : 'normal',
    });
  };

  // Floating button when chat is closed (Only if NOT embedded)
  if (!embedded && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[1100] pl-4 pr-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-full shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 group flex items-center gap-3 "
        aria-label="Open navigation assistant"
      >
        <div className="relative">
          <MessageCircle size={24} className="group-hover:opacity-0 transition-opacity duration-300 absolute inset-0" />
          <Navigation size={24} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 rotate-45 group-hover:rotate-0" />
          {/* Static icon to hold space */}
          <div className="w-6 h-6" />
        </div>

        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Ask Meri</span>
          <span className="text-sm font-bold">AI Assistant</span>
        </div>

        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
      </button>
    );
  }

  // Styles for embedded vs floating
  const containerClasses = embedded
    ? "flex flex-col h-full bg-slate-900 overflow-hidden" // Embedded: Fill parent, no rounded corners (handled by parent)
    : `fixed bottom-6 right-6 z-[1100] w-[360px] max-w-[calc(100vw-48px)] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl shadow-slate-900/50 flex flex-col transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[480px] max-h-[70vh]'
    }`;

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div
        className={`px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 flex items-center justify-between ${
          // Only add rounded top if NOT embedded (or if you want rounding in embedded too, but usually parent handles it)
          !embedded ? "rounded-t-2xl cursor-pointer" : ""
          }`}
        onClick={() => !embedded && setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Navigation size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Navigation Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              <span className="text-[9px] text-emerald-100 uppercase tracking-wider">LangGraph Active</span>
            </div>
          </div>
        </div>

        {/* Only show controls if NOT embedded */}
        {!embedded && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isMinimized ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {(!isMinimized || embedded) && (
        <>
          {/* Location Context Banner */}
          {(latitude && longitude) || selectedNodeName ? (
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
              <MapPin size={12} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400">
                {selectedNodeName
                  ? `Selected: ${selectedNodeName}`
                  : latitude && longitude
                    ? `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    : 'No location set'
                }
              </span>
            </div>
          ) : null}

          {/* Messages */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-1.5 rounded-lg flex-shrink-0 h-fit ${
                    msg.role === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    {/* Message content */}
                    <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-slate-700 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                    }`}>
                      {msg.content}
                    </div>
                    
                    {/* Distance Badge */}
                    {msg.role === 'assistant' && msg.distance && (
                      <div className="flex items-center gap-2 ml-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-full uppercase">
                          <Route size={10} />
                          {msg.distance}
                        </span>
                      </div>
                    )}
                    
                    {/* Reasoning steps toggle */}
                    {msg.role === 'assistant' && msg.reasoning_steps && msg.reasoning_steps.length > 0 && (
                      <button 
                        onClick={() => setShowReasoning(showReasoning === i ? null : i)}
                        className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors ml-1"
                      >
                        {showReasoning === i ? 'Hide reasoning' : 'Show reasoning'}
                      </button>
                    )}

                    {/* Reasoning steps */}
                    {showReasoning === i && msg.reasoning_steps && (
                      <div className="ml-1 mt-1 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Reasoning Steps:</div>
                        <ol className="text-[10px] text-slate-400 space-y-1 list-decimal list-inside">
                          {msg.reasoning_steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Live Streaming Indicator */}
            {isStreaming && reasoningSteps.length > 0 && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="p-1.5 rounded-lg flex-shrink-0 h-fit bg-emerald-500 text-white">
                    <Loader2 size={12} className="animate-spin" />
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 rounded-tl-sm">
                    <div className="space-y-1">
                      <div className="text-[9px] text-emerald-400 uppercase font-bold mb-1 flex items-center gap-1">
                        <Zap size={10} className="animate-pulse" />
                        Live Reasoning Stream
                      </div>
                      {reasoningSteps.map((step, idx) => (
                        <div key={idx} className="text-[10px] text-slate-400 flex items-start gap-1 animate-in fade-in duration-200">
                          <span className="text-emerald-500">{idx + 1}.</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-slate-700/50 flex gap-2 overflow-x-auto custom-scrollbar">
            {[
              { text: '📍 Nearest cafe', query: 'Where is the nearest cafe?' },
              { text: '🚶 To library', query: 'How do I get to the library?' },
              { text: '🏥 Emergency', query: 'Where is the health center?' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => setInput(action.query)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-lg whitespace-nowrap transition-colors border border-slate-700"
              >
                {action.text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for directions..."
                className="flex-grow px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MapChatbot;
