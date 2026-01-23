'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Navigation, X, MessageCircle, Route, MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { mapChatbot, MapChatResponse, StreamEvent } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: string;
  reasoning_steps?: string[];
  sources?: string[];
  isStreaming?: boolean;
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
  onRouteGenerated?: (route: { start: string; end: string; steps: string[] }) => void;
}

// Default ASTU campus coordinates
const DEFAULT_LATITUDE = 8.564168;
const DEFAULT_LONGITUDE = 39.289311;

const MapChatbot: React.FC<MapChatbotProps> = ({
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  selectedNodeName,
  mode = 'walking',
  onRouteGenerated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your ASTU Navigation Assistant. Ask me for directions, nearby services, or how to get anywhere on campus! 🗺️',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentReasoning, setCurrentReasoning] = useState<string[]>([]);
  const [showReasoning, setShowReasoning] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, currentReasoning]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    const userQuery = input;
    setInput('');
    setIsLoading(true);
    setCurrentReasoning([]);

    // Add a streaming placeholder message
    const streamingMsgId = Date.now();
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      timestamp: streamingMsgId,
      isStreaming: true,
      reasoning_steps: []
    }]);

    try {
      // Use streaming endpoint with real-time updates
      const response = await mapChatbot.chatStream(
        userQuery,
        {
          latitude,
          longitude,
          mode,
          urgency: mode === 'urgent' ? 'high' : 'normal'
        },
        (event: StreamEvent) => {
          // Handle streaming events
          if (event.type === 'reasoning' && event.content) {
            setCurrentReasoning(prev => [...prev, event.content!]);
            // Update the streaming message with reasoning
            setMessages(prev => prev.map(msg => 
              msg.timestamp === streamingMsgId 
                ? { ...msg, reasoning_steps: [...(msg.reasoning_steps || []), event.content!] }
                : msg
            ));
          }
        }
      );

      // Replace streaming message with final response
      setMessages(prev => prev.map(msg => 
        msg.timestamp === streamingMsgId 
          ? {
              ...msg,
              content: response.answer,
              intent: response.intent,
              reasoning_steps: response.reasoning_steps,
              sources: response.sources,
              isStreaming: false
            }
          : msg
      ));

      // If the response contains navigation info, notify parent
      if (response.intent === 'NAVIGATION' && onRouteGenerated) {
        onRouteGenerated({
          start: 'Current Location',
          end: selectedNodeName || 'Destination',
          steps: response.reasoning_steps || []
        });
      }

    } catch (error) {
      console.error('[MapChatbot] Error:', error);
      // Replace streaming message with error
      setMessages(prev => prev.map(msg => 
        msg.timestamp === streamingMsgId 
          ? {
              ...msg,
              content: 'I\'m having trouble getting that information. Please try again or check the map directly.',
              isStreaming: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setCurrentReasoning([]);
    }
  };

  const getIntentBadge = (intent?: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      'NAVIGATION': { color: 'bg-emerald-500', icon: <Route size={10} />, label: 'Directions' },
      'NEARBY_SERVICE': { color: 'bg-purple-500', icon: <MapPin size={10} />, label: 'Nearby' },
      'UNIVERSITY_INFO': { color: 'bg-blue-500', icon: <Bot size={10} />, label: 'Info' },
      'MIXED': { color: 'bg-amber-500', icon: <Navigation size={10} />, label: 'Mixed' }
    };
    return badges[intent || ''] || badges['UNIVERSITY_INFO'];
  };

  // Floating button when chat is closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[1100] p-4 bg-emerald-600 text-white rounded-full shadow-2xl shadow-emerald-500/30 hover:bg-emerald-500 hover:scale-110 transition-all duration-300 group"
        aria-label="Open navigation assistant"
      >
        <MessageCircle size={24} className="group-hover:hidden" />
        <Navigation size={24} className="hidden group-hover:block" />
        
        {/* Pulse indicator */}
        <span className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-[1100] w-[360px] max-w-[calc(100vw-48px)] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl shadow-slate-900/50 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-[480px] max-h-[70vh]'
      }`}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-2xl flex items-center justify-between cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
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
      </div>

      {!isMinimized && (
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
                    {msg.role === 'user' ? <User size={12} /> : msg.isStreaming ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    {/* Message content or streaming indicator */}
                    {msg.isStreaming && !msg.content ? (
                      <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 rounded-tl-sm">
                        {/* Show live reasoning steps during streaming */}
                        {msg.reasoning_steps && msg.reasoning_steps.length > 0 ? (
                          <div className="space-y-1">
                            <div className="text-[9px] text-emerald-400 uppercase font-bold mb-1 flex items-center gap-1">
                              <Loader2 size={10} className="animate-spin" />
                              Processing...
                            </div>
                            {msg.reasoning_steps.map((step, idx) => (
                              <div key={idx} className="text-[10px] text-slate-400 flex items-start gap-1">
                                <span className="text-emerald-500">→</span>
                                {step}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase tracking-wider">Thinking...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-700 text-white rounded-tr-sm'
                          : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    
                    {/* Intent badge and reasoning toggle for assistant messages */}
                    {msg.role === 'assistant' && msg.intent && !msg.isStreaming && (
                      <div className="flex items-center gap-2 ml-1">
                        {(() => {
                          const badge = getIntentBadge(msg.intent);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${badge.color} text-white text-[9px] font-bold rounded-full uppercase`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          );
                        })()}
                        
                        {msg.reasoning_steps && msg.reasoning_steps.length > 0 && (
                          <button 
                            onClick={() => setShowReasoning(showReasoning === i ? null : i)}
                            className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {showReasoning === i ? 'Hide reasoning' : 'Show reasoning'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Reasoning steps */}
                    {showReasoning === i && msg.reasoning_steps && !msg.isStreaming && (
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
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MapChatbot;
