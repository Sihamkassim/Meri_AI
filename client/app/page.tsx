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
  
  // Route visualization state
  const [routeData, setRouteData] = React.useState<{
    coords?: Array<{ lat: number; lng: number }>;
    start?: { lat: number; lon: number; name: string };
    end?: { lat: number; lon: number; name: string };
  }>({});

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
          <main className="flex-grow pt-28 max-w-7xl mx-auto px-4 lg:px-8 pb-14 w-full animate-in slide-in-from-bottom-4 duration-500">
            <div className="h-[520px] lg:h-[720px] rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
              <MapWrapper 
                selectedNodeId={selectedDestId} 
                routeCoords={routeData.coords}
                startCoords={routeData.start}
                endCoords={routeData.end}
              />
            </div>
            {/* Floating MapChatbot for navigation queries (LangGraph) */}
            <MapChatbot 
              selectedNodeName={selectedDestId ? CAMPUS_NODES.find(n => n.id === selectedDestId)?.name : undefined}
              mode="walking"
              onRouteGenerated={(data) => {
                setRouteData({
                  coords: data.route_coords,
                  start: data.start_coordinates,
                  end: data.end_coordinates,
                });
              }}
            />
          </main>
        );

      case AppRoute.ASSISTANT:
        return (
          <main className="flex-grow pt-28 max-w-4xl mx-auto px-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
              <h1 className="text-3xl font-extrabold text-slate-900">
                Campus Intelligence
              </h1>
              <p className="text-slate-600 mt-1 mb-6">
                Ask Meri anything about ASTU locations.
              </p>
              <AIAssistant />
            </div>
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