"use client";

import React from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import MapWrapper from "../components/MapWrapper";
import AIAssistant from "../components/AIAssistant";
import Footer from "../components/Footer";
import InstallPWA from "../components/InstallPWA";
import { AppRoute } from "../types";
import { CAMPUS_NODES } from "../constants";
import { useAppStore } from "../store/useAppStore";

// Dynamically import MapChatbot to avoid SSR issues
const MapChatbot = dynamic(() => import("../components/MapChatbot"), {
  ssr: false,
});

const HOME_BG_IMAGE_URL = "/astu.jpg";

export default function Home() {
  const currentRoute = useAppStore((s) => s.currentRoute);
  const selectedDestId = useAppStore((s) => s.selectedDestId);
  const setCurrentRoute = useAppStore((s) => s.setCurrentRoute);
  const navigateToDestination = useAppStore((s) => s.navigateToDestination);

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.HOME:
        return (
          <main className="flex-grow pt-28 flex items-center justify-center animate-in fade-in duration-700">
            <Hero />
          </main>
        );

      case AppRoute.MAP:
        return (
          <main className="flex-grow pt-24 max-w-[95rem] mx-auto px-4 lg:px-6 pb-8 w-full animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] lg:h-[85vh] min-h-[600px]">
              {/* Left Side: Map - Span 8 */}
              <div className="lg:col-span-8 h-full rounded-[32px] overflow-hidden bg-white/90 backdrop-blur-3xl border border-white/60 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.3)] relative z-10">
                <MapWrapper selectedNodeId={selectedDestId} />
              </div>

              {/* Right Side: AI Assistant - Span 4 (Increased width) */}
              <div className="lg:col-span-4 h-full rounded-[32px] overflow-hidden bg-slate-900 border border-slate-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] relative z-10 flex flex-col">
                <MapChatbot
                  selectedNodeName={selectedDestId ? CAMPUS_NODES.find(n => n.id === selectedDestId)?.name : undefined}
                  mode="walking"
                  embedded={true}
                />
              </div>
            </div>
          </main>
        );

      case AppRoute.ASSISTANT:
        return (
          <main className="flex-grow pt-28 max-w-4xl mx-auto px-4 animate-in fade-in duration-500 mt-4">
            {/* <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
              <h1 className="text-3xl font-extrabold text-slate-900">
                Campus Intelligence
              </h1>
              <p className="text-slate-600 mt-1 mb-6">
                Ask Meri anything about ASTU locations.
              </p> */}
              <AIAssistant />
            {/* </div> */}
          </main>
        );

      case AppRoute.DIRECTORY:
        return (
          <main className="flex-grow pt-28 max-w-6xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
            <div className="text-center mb-14">
              <h1 className="text-4xl font-extrabold text-slate-900">
                Campus Directory
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
                Find blocks, labs, and facilities instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CAMPUS_NODES.map((node) => (
                <div
                  key={node.id}
                  onClick={() => navigateToDestination(node.id)}
                  className="cursor-pointer bg-white rounded-3xl border border-slate-200 p-6 shadow hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <span className="inline-block mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    {node.category}
                  </span>

                  <h3 className="text-lg font-bold text-slate-900">
                    {node.name}
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {node.description}
                  </p>
                </div>
              ))}
            </div>
          </main>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HOME_BG_IMAGE_URL})`,
            // UPDATED: No blur on home (0px), very slight blur elsewhere (1px)
            filter:
              currentRoute === AppRoute.HOME ? "blur(0px)" : "blur(1px)",
            transition: "filter 0.5s ease-in-out",
          }}
        />
        <div className="absolute inset-0 bg-white/30" />
      </div>

      <Navbar onNavigate={setCurrentRoute} currentRoute={currentRoute} />
      {renderContent()}
      <Footer />
      <InstallPWA />
    </div>
  );
}