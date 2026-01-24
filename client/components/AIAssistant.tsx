'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal, BookOpen } from 'lucide-react';
import { ragAssistant, RAGResponse } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: RAGResponse['sources'];
  confidence?: number;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Welcome to the ASTU Knowledge Assistant! I can answer questions about Adama Science and Technology University - academics, facilities, history, and more. How can I help you?', 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await ragAssistant.ask(question);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer, 
        timestamp: Date.now(),
        sources: response.sources,
        confidence: response.confidence
      }]);
    } catch (error) {
      console.error('[AIAssistant] Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting to the knowledge base. Please try again in a moment.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">RAG Engine Active</span>
            </div>
          </div>
        </div>
        <Sparkles size={16} className="text-slate-600" />
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
            <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`mt-1 p-2 rounded-xl flex-shrink-0 h-fit ${msg.role === 'user' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500 text-white'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className="flex flex-col gap-2">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                  : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800 shadow-lg'
                  }`}>
                  {msg.content}
                </div>
                
                {/* Sources toggle for assistant messages */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="ml-1">
                    <button 
                      onClick={() => setShowSources(showSources === i ? null : i)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <BookOpen size={10} />
                      {showSources === i ? 'Hide' : 'Show'} {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                      {msg.confidence && (
                        <span className="ml-2 text-slate-500">
                          ({Math.round(msg.confidence * 100)}% confidence)
                        </span>
                      )}
                    </button>
                    
                    {showSources === i && (
                      <div className="mt-2 space-y-2">
                        {msg.sources.map((source, idx) => (
                          <div key={idx} className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
                            {source.title && (
                              <div className="font-medium text-emerald-400 mb-1">{source.title}</div>
                            )}
                            <div className="text-slate-400 line-clamp-2">{source.content}</div>
                            {source.url && (
                              <a href={source.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-emerald-400 hover:underline mt-1 inline-block">
                                View source →
                              </a>
                            )}
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
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-emerald-700 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Searching Knowledge Base...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="relative flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about ASTU academics, facilities, history..."
            className="flex-grow px-5 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90 shadow-lg shadow-blue-500/20"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          Powered by RAG • Answers based on official ASTU documents
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
