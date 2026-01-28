'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import MapDisplay with no SSR to avoid Leaflet issues
const MapDisplay = dynamic(() => import('./MapDisplay'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full border-t-8 border-t-emerald-600">
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading map...</div>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  selectedNodeId?: string;
  routeCoords?: Array<{ lat: number; lng: number }>;
  startCoords?: { lat: number; lon: number; name: string };
  endCoords?: { lat: number; lon: number; name: string };
}

const MapWrapper: React.FC<MapWrapperProps> = ({ selectedNodeId, routeCoords, startCoords, endCoords }) => {
  console.log('[MapWrapper] Props received:', { selectedNodeId, routeCoords, startCoords, endCoords });
  
  // Use a stable key to prevent re-initialization
  return (
    <div key="map-wrapper-stable" style={{ height: '100%', width: '100%' }}>
      <MapDisplay 
        selectedNodeId={selectedNodeId} 
        routeCoords={routeCoords}
        startCoords={startCoords}
        endCoords={endCoords}
      />
    </div>
  );
};

export default MapWrapper;
