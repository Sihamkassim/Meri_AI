'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Zap, History, Trash2 } from 'lucide-react';
import { useRAGStreaming } from '../hooks/useRAGStreaming';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Array<{ title?: string; content: string; similarity?: number }>;
  confidence?: number;
}

const STORAGE_KEY = 'astu-chat-history';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Hello! How can I help you today?', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [showSources, setShowSources] = useState<number | null>(null);
  const [showReasoning, setShowReasoning] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Don't save just the initial message
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

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

    // Validate minimum length
    if (input.trim().length < 3) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Please enter at least 3 characters.',
        timestamp: Date.now(),
      }]);
      return;
    }

    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    
    const question = input;
    setInput('');

    // Start RAG-only streaming
    startStream(question);
  };

  const clearChat = () => {
    const initialMessage: ChatMessage = {
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: Date.now()
    };
    setMessages([initialMessage]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loadHistory = () => {
    setShowHistory(!showHistory);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 rounded-3xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden border border-emerald-500/10">
      {/* Header */}
      <div className="px-6 py-5 bg-slate-900/80 backdrop-blur-sm border-b border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Bot size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Chat with <span className="text-emerald-400">AI</span>
            </h2>
            <p className="text-xs text-slate-400">
              Simply ask your AI chatbot assistant to generate!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadHistory}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="Chat History"
          >
            <History size={18} />
          </button>
          <button 
            onClick={clearChat}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-emerald-400 bg-slate-800/50 hover:bg-emerald-500/10 rounded-lg transition-all border border-slate-700 hover:border-emerald-500/30"
          >
            Clear chat
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-950/30">
        {/* History Panel */}
        {showHistory && (
          <div className="fixed inset-y-0 right-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-emerald-500/30 shadow-2xl z-50 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-400">Chat History</h3>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-slate-400 hover:text-emerald-400 text-xs px-2 py-1 rounded hover:bg-emerald-500/10"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs text-slate-400 mb-4 p-3 bg-slate-800/50 rounded-lg border border-emerald-500/20">
                  <p className="mb-1">📝 {messages.length} messages</p>
                  <p>💾 Auto-saved</p>
                </div>
                
                {messages.map((msg, idx) => (
                  <div key={idx} className={`text-xs p-3 rounded-lg border ${msg.role === 'user' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.role === 'user' ? <User size={10} className="text-emerald-400" /> : <Bot size={10} className="text-emerald-400" />}
                      <span className="font-medium text-emerald-400">{msg.role === 'user' ? 'You' : 'AI'}</span>
                      <span className="text-slate-500 text-[10px] ml-auto">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 line-clamp-3">{msg.content}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-emerald-500/20">
                <button 
                  onClick={clearChat}
                  className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-medium border border-red-500/30"
                >
                  <Trash2 size={14} />
                  Clear All History
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`mt-1 p-2.5 rounded-xl flex-shrink-0 h-fit ${
                msg.role === 'user' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-slate-800/80 text-white rounded-tr-none border border-slate-700/50'
                    : 'bg-slate-900/60 text-slate-200 rounded-tl-none border border-emerald-500/10 shadow-lg'
                }`}>
                  {msg.content}
                </div>
                
                {/* Confidence Badge */}
                {msg.role === 'assistant' && msg.confidence && (
                  <div className="flex items-center gap-2 ml-1">
                    <span className="text-[10px] text-emerald-400/70 font-medium">
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
                          <div key={idx} className="px-3 py-2 bg-slate-800/50 rounded-lg border border-emerald-500/20 text-xs">
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
            <div className="bg-slate-900/60 border border-emerald-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">AI is thinking...</span>
            </div>

            {/* Live Reasoning Steps */}
            {reasoningSteps.length > 0 && showReasoning && (
              <div className="bg-slate-950/50 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1 max-w-[85%]">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <Zap size={12} className="animate-pulse" />
                  <span>Live Reasoning Stream</span>
                </div>
                {reasoningSteps.map((step, idx) => (
                  <div key={idx} className="text-slate-300 flex gap-2 animate-in fade-in duration-200">
                    <span className="text-emerald-400 flex-shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            ❌ {error}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm border-t border-emerald-500/20">
        <div className="relative flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Enter Your Message..."
            className="flex-grow px-5 py-3.5 bg-slate-950/50 border border-emerald-500/20 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm text-white placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-3.5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90 shadow-lg shadow-emerald-500/20"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
