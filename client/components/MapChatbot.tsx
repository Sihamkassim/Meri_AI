'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Navigation, X, MessageCircle, Route, MapPin, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { useNavigationStreaming, NavigationResponse } from '../hooks/useNavigationStreaming';
import { formatAIResponse } from '../utils/formatResponse';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  reasoning_steps?: string[];
  route_coords?: Array<{ lat: number; lng: number }>;
  distance?: string;
}

export interface MapChatbotProps {
  latitude?: number;
  longitude?: number;
  selectedNodeName?: string;
  mode?: 'walking' | 'taxi' | 'urgent';
  onRouteGenerated?: (route: NavigationResponse) => void;
  embedded?: boolean;
}

// Default ASTU Main Gate coordinates
const DEFAULT_LATITUDE = 8.55686;
const DEFAULT_LONGITUDE = 39.29108;

// Campus area boundaries (approximate OSM edges for Adama/ASTU area)
const CAMPUS_BOUNDS = {
  minLat: 8.52,
  maxLat: 8.60,
  minLng: 39.25,
  maxLng: 39.32
};

// Check if coordinates are within campus area
const isWithinCampusArea = (lat: number, lng: number): boolean => {
  return lat >= CAMPUS_BOUNDS.minLat && 
         lat <= CAMPUS_BOUNDS.maxLat && 
         lng >= CAMPUS_BOUNDS.minLng && 
         lng <= CAMPUS_BOUNDS.maxLng;
};

export const MapChatbot: React.FC<MapChatbotProps> = ({
  latitude,
  longitude,
  selectedNodeName,
  mode = 'walking',
  onRouteGenerated,
  embedded = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [navOffset, setNavOffset] = useState(80);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'actual' | 'outside-range' | 'denied' | 'default'>('loading');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '🗺️ Hi! I\'m your ASTU Navigation Assistant!\n\nAsk me:\n• "How do I get to the library?"\n• "Route from Block 57 to ICT Center"\n• "Where is Borchamu Building?"\n\nI\'ll show you the walking path on the map!',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState<number | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<'normal' | 'high'>('normal');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user's actual location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Only use user location if within campus area
          if (isWithinCampusArea(lat, lng)) {
            setUserLocation({ lat, lng });
            setLocationStatus('actual');
            console.log(`User location within campus area: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            console.log(`User location outside campus area (${lat.toFixed(5)}, ${lng.toFixed(5)}), using default main gate location`);
            setUserLocation({ lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE });
            setLocationStatus('outside-range');
          }
        },
        (error) => {
          console.warn('Could not get user location:', error.message, '- Using default main gate location');
          setUserLocation({ lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE });
          setLocationStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      // Fallback to default if geolocation not supported
      setUserLocation({ lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE });
      setLocationStatus('default');
    }
  }, []);

  // Detect mobile / small screens to change embedded behavior
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)') : null;
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    if (mq) {
      setIsMobile(mq.matches);
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler as any);
      else if (typeof mq.addListener === 'function') mq.addListener(handler as any);
    }
    return () => {
      if (mq) {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', handler as any);
        else if (typeof mq.removeListener === 'function') mq.removeListener(handler as any);
      }
    };
  }, []);

  // Measure top navigation height so overlay can avoid overlapping it
  useEffect(() => {
    const measure = () => {
      try {
        const nav = document.querySelector('nav');
        if (nav instanceof HTMLElement) {
          const h = Math.round(nav.getBoundingClientRect().height || 0);
          setNavOffset(h || 80);
          return;
        }
      } catch (e) {
        // ignore
      }
      setNavOffset(80);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

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

  // Listen for navigation events from map markers
  useEffect(() => {
    const handleNavigateToPOI = (event: any) => {
      const { poiName } = event.detail;
      if (poiName) {
        setInput(`How do I get to ${poiName}?`);
        setIsOpen(true);
        setIsMinimized(false);
      }
    };

    window.addEventListener('navigate-to-poi', handleNavigateToPOI);
    return () => window.removeEventListener('navigate-to-poi', handleNavigateToPOI);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    const userQuery = input;
    setInput('');

    // Use provided coordinates or user location, fallback to defaults
    const currentLat = latitude || userLocation?.lat || DEFAULT_LATITUDE;
    const currentLng = longitude || userLocation?.lng || DEFAULT_LONGITUDE;

    // Start SSE streaming with current location
    startStream(userQuery, {
      latitude: currentLat,
      longitude: currentLng,
      mode: mode,
      urgency: selectedUrgency,
    });
  };

  // Floating button when chat is closed (Only if NOT embedded)
  // Floating button when chat is closed
  // - if not embedded: always show floating icon
  // - if embedded AND mobile: show floating icon instead of embedded panel
  if ((!embedded && !isOpen) || (embedded && isMobile && !isOpen)) {
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
          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Ask Meri AI</span>
          <span className="text-sm font-bold">AI Assistant</span>
        </div>

        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
      </button>
    );
  }

  // Styles for embedded vs floating
  // Adjust container classes: when embedded on mobile and open, show as centered overlay/fullscreen
  const containerClasses = embedded
    ? (isMobile
      ? `relative fixed z-[1200] left-3 right-3 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl shadow-slate-900/60 flex flex-col transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[80vh] max-h-[90vh]'}`
      : "relative flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden")
    : `relative fixed bottom-6 right-6 z-[1100] w-[360px] max-w-[calc(100vw-48px)] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl shadow-slate-900/50 flex flex-col transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[480px] max-h-[70vh]'
    }`;

  // If embedded on mobile, compute an inline style so overlay sits below the nav
  const containerStyle: React.CSSProperties | undefined = (embedded && isMobile)
    ? {
        top: `${navOffset + 12}px`,
        left: '12px',
        right: '12px',
        bottom: '16px',
        position: 'fixed'
      }
    : undefined;

  return (
    <>
      {/* Backdrop to prevent map interaction when overlay is open on mobile */}
      {embedded && isMobile && isOpen && (
        <div
          style={{
            position: 'fixed',
            top: navOffset + 8,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 1100
          }}
        />
      )}

    <div className={containerClasses} style={containerStyle}>
      {/* Header */}
      <div
        className={`px-3 py-2 pr-12 bg-gradient-to-r from-emerald-600 to-emerald-700 flex items-center justify-between ${
          // Only add rounded top if NOT embedded (or if you want rounding in embedded too, but usually parent handles it)
          !embedded ? "rounded-t-3xl" : "rounded-t-2xl"
          }`}
      >
        <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <Navigation size={14} className="text-white" />
          </div>
          <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Navigation Assistant</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  
                  
                </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Urgency Level Dropdown */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[9px] text-emerald-100 font-medium uppercase tracking-wide">Urgency:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value as 'normal' | 'high')}
              className="text-[10px] font-medium bg-white/10 text-white border border-white/10 px-2 py-0.5 rounded-md outline-none hover:bg-white/20 transition-colors cursor-pointer"
            >
              <option value="normal" className="bg-slate-800 text-white">Normal</option>
              <option value="high" className="bg-slate-800 text-white">High</option>
            </select>
          </div>

          {/* Show controls when not embedded, or when embedded on small screens (overlay) */}
          {(!embedded || isMobile) && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close assistant"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}
        </div>

      {/* Sticky chevron (collapse) button positioned top-right inside container */}
      {(!embedded || isMobile) && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
          className="absolute top-3 right-3 z-[1250] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label={isMinimized ? 'Expand assistant' : 'Collapse assistant'}
        >
          {isMinimized ? <ChevronDown size={18} className="text-white" /> : <ChevronUp size={18} className="text-white" />}
        </button>
      )}
      </div>

      {!isMinimized && (
        <>
          {/* Location Context Banner */}
          {selectedNodeName || userLocation || (latitude && longitude) ? (
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-emerald-400" />
                <div className="flex-1">
                  {selectedNodeName ? (
                    <span className="text-[10px] text-slate-400">Selected: {selectedNodeName}</span>
                  ) : userLocation ? (
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">
                        {locationStatus === 'actual' 
                          ? `Your Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                          : `ASTU Main Gate: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                        }
                      </span>
                      {(locationStatus === 'outside-range' || locationStatus === 'denied' || locationStatus === 'default') && (
                        <span className="text-[9px] text-amber-400/70 block">
                          {locationStatus === 'outside-range' 
                            ? '⚠️ Your location is far from campus - using main gate as starting point'
                            : locationStatus === 'denied'
                            ? '⚠️ Location access denied - using main gate as starting point'
                            : '⚠️ Using main gate as default starting point'
                          }
                        </span>
                      )}
                    </div>
                  ) : latitude && longitude ? (
                    <span className="text-[10px] text-slate-400">
                      Location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Getting location...</span>
                  )}
                </div>
              </div>
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
                    <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-700 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
                    }`}>
                      {msg.role === 'assistant' ? formatAIResponse(msg.content) : msg.content}
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
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded-xl whitespace-nowrap transition-colors border border-slate-700"
              >
                {action.text}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
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
    </>
  );
};

export default MapChatbot;
