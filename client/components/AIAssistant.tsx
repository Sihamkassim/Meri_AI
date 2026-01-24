'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Zap } from 'lucide-react';
import { useRAGStreaming } from '../hooks/useRAGStreaming';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Array<{ title?: string; content: string; similarity?: number }>;
  confidence?: number;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Welcome to the ASTU Knowledge Assistant! 📚\n\nI can help you with:\n• Academic programs & requirements\n• University policies & regulations\n• Student services & facilities\n• Campus history & information\n\nAsk me anything about ASTU!', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [showSources, setShowSources] = useState<number | null>(null);
  const [showReasoning, setShowReasoning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isStreaming, reasoningSteps, answer, error, startStream } = useRAGStreaming({
    onAnswer: (data) => {
      // Add AI response to messages
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer || 'No answer generated',
        timestamp: Date.now(),
        sources: data.sources,
        confidence: data.confidence,
      };
      setMessages(prev => [...prev, aiMessage]);
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
  }, [messages, reasoningSteps]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    
    const question = input;
    setInput('');

    // Start RAG-only streaming
    startStream(question);
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl flex flex-col h-[500px] md:h-[600px] overflow-hidden">
      {/* Terminal Header */}
      <div className="px-6 py-4 bg-slate-900  flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <BookOpen size={18} className="text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">ASTU Knowledge Assistant</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                {isStreaming ? 'Searching...' : 'RAG Engine'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowReasoning(!showReasoning)}
          className="text-xs text-slate-500 hover:text-emerald-400 transition"
        >
          {showReasoning ? '🧠 Hide' : '🧠 Show'} Reasoning
        </button>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`mt-1 p-2 rounded-xl flex-shrink-0 h-fit ${
                msg.role === 'user' ? 'bg-slate-800 text-slate-400' : 'bg-blue-500 text-white'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                    : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800 shadow-lg'
                }`}>
                  {msg.content}
                </div>
                
                {/* Confidence Badge */}
                {msg.role === 'assistant' && msg.confidence && (
                  <div className="flex items-center gap-2 ml-1">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Confidence: {Math.round(msg.confidence * 100)}%
                    </span>
                  </div>
                )}

                {/* Sources toggle */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="ml-1">
                    <button 
                      onClick={() => setShowSources(showSources === i ? null : i)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <BookOpen size={10} />
                      {showSources === i ? 'Hide' : 'Show'} {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                    </button>
                    
                    {showSources === i && (
                      <div className="mt-2 space-y-2">
                        {msg.sources.map((source: any, idx: number) => (
                          <div key={idx} className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
                            {source.title && (
                              <div className="font-medium text-emerald-400 mb-1">{source.title}</div>
                            )}
                            <div className="text-slate-400 line-clamp-2">{source.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Live Streaming Indicator */}
        {isStreaming && (
          <div className="flex justify-start flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Processing...</span>
            </div>

            {/* Live Reasoning Steps */}
            {reasoningSteps.length > 0 && showReasoning && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1 max-w-[90%]">
                <div className="flex items-center gap-2 text-emerald-500 font-bold mb-2">
                  <Zap size={12} className="animate-pulse" />
                  <span>Live Reasoning Stream</span>
                </div>
                {reasoningSteps.map((step, idx) => (
                  <div key={idx} className="text-slate-400 flex gap-2 animate-in fade-in duration-200">
                    <span className="text-emerald-500 flex-shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-sm text-red-400">
            ❌ {error}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-800">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {['Admission requirements', 'Academic programs', 'Student services', 'Campus facilities'].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 text-[10px] font-bold bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 hover:text-emerald-400 transition-all border border-slate-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        <div className="relative flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about navigation, academics, facilities..."
            className="flex-grow px-5 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90 shadow-lg shadow-blue-500/20"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          Powered by Voyage AI • Real-time Streaming • Knowledge Base Search
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
