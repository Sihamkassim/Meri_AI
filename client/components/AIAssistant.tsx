'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal, Zap } from 'lucide-react';
import { backendAPI } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'ASTU Infrastructure Intelligence active. Connected to LangGraph reasoning system. How may I assist your campus navigation or information request?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  const [showReasoning, setShowReasoning] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, reasoningSteps]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    const userQuery = input;
    setInput('');
    setIsLoading(true);
    setReasoningSteps([]);

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Start SSE streaming from backend
      eventSourceRef.current = backendAPI.streamAIQuery(
        userQuery,
        // onReasoning
        (step: string) => {
          setReasoningSteps(prev => [...prev, step]);
        },
        // onAnswer
        (answer: string) => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: answer,
              timestamp: Date.now(),
              reasoning: [...reasoningSteps]
            }
          ]);
          setReasoningSteps([]);
          setIsLoading(false);
        },
        // onError
        (error: string) => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `⚠️ ${error}. Please try again or consult physical signage.`,
              timestamp: Date.now()
            }
          ]);
          setReasoningSteps([]);
          setIsLoading(false);
        },
        // onDone
        () => {
          setIsLoading(false);
          eventSourceRef.current = null;
        }
      );
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Connection to backend AI service failed. Please ensure the server is running.",
          timestamp: Date.now()
        }
      ]);
      setIsLoading(false);
      setReasoningSteps([]);
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-[500px] md:h-[600px] overflow-hidden">
      {/* Terminal Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Terminal size={18} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">AI Guidance Module</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">System Link Active</span>
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
              <div className="flex flex-col gap-2 max-w-full">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                  : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800 shadow-lg'
                  }`}>
                  {msg.content}
                </div>
                {msg.reasoning && msg.reasoning.length > 0 && showReasoning && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-emerald-500 font-bold mb-2">
                      <Zap size={12} />
                      <span>AI Reasoning Process</span>
                    </div>
                    {msg.reasoning.map((step, idx) => (
                      <div key={idx} className="text-slate-500 flex gap-2">
                        <span className="text-emerald-500">→</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Processing via LangGraph...</span>
            </div>
            {reasoningSteps.length > 0 && showReasoning && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1 max-w-[90%]">
                <div className="flex items-center gap-2 text-emerald-500 font-bold mb-2">
                  <Zap size={12} className="animate-pulse" />
                  <span>Live Reasoning Stream</span>
                </div>
                {reasoningSteps.map((step, idx) => (
                  <div key={idx} className="text-slate-400 flex gap-2 animate-in fade-in duration-200">
                    <span className="text-emerald-500">→</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-800">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {['Where is the library?', 'Nearest mosque', 'How to get to Block 57?', 'Registration office'].map((suggestion, idx) => (
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
            placeholder="Ask for directions or building info..."
            className="flex-grow px-5 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-90 shadow-lg shadow-emerald-500/20"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
