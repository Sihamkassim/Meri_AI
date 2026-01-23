'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { CAMPUS_NODES } from '../constants';

const Hero: React.FC = () => {
  const [query, setQuery] = useState('');
  const handleSearchAction = useAppStore((state) => state.handleSearch);
  const setSelectedDestId = useAppStore((state) => state.setSelectedDestId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Find matching node
      const found = CAMPUS_NODES.find(n =>
        n.name.toLowerCase().includes(query.toLowerCase()) ||
        n.category.toLowerCase().includes(query.toLowerCase())
      );

      if (found) {
        setSelectedDestId(found.id);
      }

      handleSearchAction(query);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 md:pt-32 pb-16 md:pb-24">
      <div className="max-w-3xl">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-6 block">
          Official Campus Navigator
        </span>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-tight md:leading-none mb-8 md:mb-10">
          Intelligent routing for <br />
          <span className="text-emerald-600">ASTU Campus.</span>
        </h1>

        <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-xl mb-10 md:mb-12">
          Find any facility or department across the Adama Science and Technology University with our official navigation engine.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-0 max-w-2xl mb-16 md:mb-24 group">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where do you want to go?"
              className="w-full pl-16 pr-6 py-4 md:py-5 bg-white border border-slate-200 rounded-2xl sm:rounded-r-none sm:rounded-l-2xl focus:ring-0 focus:border-slate-300 outline-none text-slate-900 text-lg shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="px-10 py-4 md:py-5 bg-slate-800 text-white rounded-2xl sm:rounded-l-none sm:rounded-r-2xl font-bold hover:bg-slate-900 transition-all text-lg active:scale-[0.98] sm:active:scale-95"
          >
            Find Route
          </button>
        </form>

        <div className="flex flex-wrap gap-x-16 gap-y-4 pt-12 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">100% Campus Coverage</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Live AI Reasoning</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Academic Data</span>
        </div>
      </div>
    </div>
  );
};

export default Hero;