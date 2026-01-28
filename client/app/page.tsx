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
import { campusService, POI } from "../services/campusService";
import { CampusNode } from "../types";

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

  // Directory page state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("name");
  const [pois, setPois] = React.useState<POI[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch POIs from backend
  React.useEffect(() => {
    const fetchPOIs = async () => {
      try {
        setLoading(true);
        const data = await campusService.getAllPOIs();
        setPois(data);
      } catch (error) {
        console.error('Failed to fetch POIs:', error);
        // Fallback to CAMPUS_NODES if fetch fails
        setPois([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentRoute === AppRoute.DIRECTORY) {
      fetchPOIs();
    }
  }, [currentRoute]);

  // Filter and sort POIs (use real POIs or fallback to CAMPUS_NODES)
  // Use an explicit union type so TypeScript knows nodes can be POI or CampusNode
  const displayNodes: Array<POI | CampusNode> = (pois.length > 0 ? (pois as POI[]) : (CAMPUS_NODES as CampusNode[])) as Array<POI | CampusNode>;
  
  const filteredAndSortedNodes = React.useMemo(() => {
    let filtered = displayNodes;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(search) ||
        (node.description && node.description.toLowerCase().includes(search)) ||
        node.category.toLowerCase().includes(search) ||
        ('type' in node && node.type && node.type.toLowerCase().includes(search))
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(node => 
        node.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "category":
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "distance":
        // For now, keep original order (can add geolocation later)
        break;
    }

    return sorted;
  }, [displayNodes, searchTerm, categoryFilter, sortBy]);

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
                <MapWrapper 
                  selectedNodeId={selectedDestId}
                  routeCoords={routeData.coords}
                  startCoords={routeData.start}
                  endCoords={routeData.end}
                />
              </div>

              {/* Right Side: AI Assistant - Span 4 (Increased width) */}
              <div className="lg:col-span-4 h-full rounded-[32px] overflow-hidden bg-slate-900 border border-slate-800 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] relative z-10 flex flex-col">
                <MapChatbot
                  selectedNodeName={selectedDestId ? CAMPUS_NODES.find(n => n.id === selectedDestId)?.name : undefined}
                  mode="walking"
                  embedded={true}
                  onRouteGenerated={(route) => {
                    console.log('[Page] Route generated callback triggered!');
                    console.log('[Page] Full route object:', route);
                    console.log('[Page] route_coords:', route.route_coords);
                    console.log('[Page] start_coordinates:', route.start_coordinates);
                    console.log('[Page] end_coordinates:', route.end_coordinates);
                    
                    const newRouteData = {
                      coords: route.route_coords,
                      start: route.start_coordinates,
                      end: route.end_coordinates,
                    };
                    
                    console.log('[Page] Setting routeData to:', newRouteData);
                    setRouteData(newRouteData);
                  }}
                />
              </div>
            </div>
          </main>
        );

      case AppRoute.ASSISTANT:
        return (
          <main className="flex-grow flex flex-col pt-20 px-4 pb-4 animate-in fade-in duration-500">
            <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col">
              <AIAssistant />
            </div>
          </main>
        );

      case AppRoute.DIRECTORY:
        return (
          <main className="flex-grow pt-28 max-w-6xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-slate-900">
                Campus Directory
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
                Search, filter, and navigate to any campus location instantly.
              </p>
            </div>

            {/* Enhanced Search & Filter Section */}
            <div className="mb-8 space-y-4">
              {loading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <p className="text-sm text-slate-500 mt-2">Loading locations...</p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Search blocks, labs, cafeterias..."
                    className="w-full px-4 py-3 pl-10 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-sm"
                  />
                  <svg className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>


                {/* Dynamic Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                >
                  <option value="all">All Categories</option>
                  {Array.from(new Set(displayNodes.map(node => node.category)))
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b))
                    .map((cat) => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                  ))}
                </select>

                {/* Sort By */}
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                >
                  <option value="name">Sort: A-Z</option>
                  <option value="distance">Sort: Nearest</option>
                  <option value="category">Sort: Category</option>
                </select>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {filteredAndSortedNodes.length} Locations
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Live Map
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  AI Powered
                </span>
              </div>
            </div>

            {/* Directory Grid with Enhanced Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedNodes.map((rawNode) => {
                const node = rawNode as any;
                return (
                <div
                  key={node.id ?? node.name}
                  className="group cursor-pointer bg-white rounded-3xl border border-slate-200 p-6 shadow hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden relative"
                >
                  {/* Category Badge */}
                  <span className="inline-block mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    {node.category}
                  </span>

                  {/* Location Name */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {node.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2">
                    {node.description}
                  </p>

                  {/* Distance Indicator (if geolocation available) */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>On Campus</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // For POIs with id, use the id. Otherwise use name
                        const locationId = 'id' in node ? node.id : node.name;
                        navigateToDestination(locationId);
                      }}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Navigate
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentRoute(AppRoute.MAP);
                      }}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
                      title="View on Map"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 rounded-3xl border-2 border-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
                );
              })}
            </div>

            {/* Empty State (if no results) */}
            {filteredAndSortedNodes.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-block p-6 bg-slate-100 rounded-full mb-4">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No locations found</h3>
                <p className="text-slate-500 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setSortBy("name");
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all"
                >
                  Reset Filters
                </button>
              </div>
            )}
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
      <InstallPWA showOnlyOnHome={true} currentRoute={currentRoute} />
    </div>
  );
}