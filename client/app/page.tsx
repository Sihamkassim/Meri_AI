'use client';

import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import MapWrapper from '../components/MapWrapper';
import AIAssistant from '../components/AIAssistant';
import Footer from '../components/Footer';
import InstallPWA from '../components/InstallPWA';
import { AppRoute } from '../types';
import { CAMPUS_NODES } from '../constants';
import { useAppStore } from '../store/useAppStore';

export default function Home() {
  const currentRoute = useAppStore((state) => state.currentRoute);
  const selectedDestId = useAppStore((state) => state.selectedDestId);
  const setCurrentRoute = useAppStore((state) => state.setCurrentRoute);
  const handleSearch = useAppStore((state) => state.handleSearch);
  const navigateToDestination = useAppStore((state) => state.navigateToDestination);

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.HOME:
        return (
          <main className="flex-grow flex items-center animate-in fade-in duration-500">
            <Hero />
          </main>
        );

      case AppRoute.MAP:
        return (
          <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12 w-full animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 h-full">
              <div className="lg:col-span-8 h-[400px] sm:h-[500px] lg:h-[700px] rounded-3xl overflow-hidden shadow-lg">
                <MapWrapper selectedNodeId={selectedDestId} />
              </div>
              <div className="lg:col-span-4 h-auto lg:h-[700px]">
                <AIAssistant />
              </div>
            </div>
          </main>
        );

      case AppRoute.ASSISTANT:
        return (
          <main className="flex-grow max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 w-full animate-in fade-in duration-500">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Campus Intelligence Assistant</h1>
              <p className="text-slate-500 text-sm">Official guidance system for navigation and facility information.</p>
            </div>
            <AIAssistant />
          </main>
        );

      case AppRoute.DIRECTORY:
        return (
          <main className="flex-grow max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 w-full animate-in fade-in duration-500">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Campus Directory</h1>
            <p className="text-slate-500 mb-8 md:mb-12">Registry of all officially indexed facilities and departments.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAMPUS_NODES.map(node => (
                <div
                  key={node.id}
                  className="p-5 md:p-6 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => navigateToDestination(node.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {node.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-base md:text-lg">{node.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{node.description}</p>
                </div>
              ))}
            </div>
          </main>
        );

      default:
        return (
          <main className="flex-grow flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900">Resource Not Found</h1>
            <button
              onClick={() => setCurrentRoute(AppRoute.HOME)}
              className="mt-4 text-emerald-600 font-bold underline"
            >
              Return to Home
            </button>
          </main>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar onNavigate={setCurrentRoute} currentRoute={currentRoute} />
      {renderContent()}
      <Footer />
      <InstallPWA />
    </div>
  );
}
