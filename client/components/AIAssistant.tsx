'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Terminal } from 'lucide-react';
import { campusAI } from '../services/geminiService';
import { ChatMessage } from '../types';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'ASTU Infrastructure Intelligence active. How may I assist your campus navigation or information request?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    setInput('');
    setIsLoading(true);

    try {
      const response = await campusAI.getCampusInfo(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "An uplink error occurred. Please consult physical signage or university security.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
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
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700'
                : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800 shadow-lg'
                }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Querying Campus Graph...</span>
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
