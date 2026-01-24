'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CAMPUS_NODES } from '../constants';
import { CampusNode } from '../types';
import { Layers, Maximize2, Navigation2, Info, MapPin, Globe, Map as MapIcon } from 'lucide-react';

// Marker Icons setup (Academic style)
const createIcon = (color: string) => L.divIcon({
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 2px rgba(0,0,0,0.05);"></div>`,
  className: 'custom-div-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const icons = {
  academic: createIcon('#059669'), // Emerald
  administrative: createIcon('#475569'), // Slate
  residential: createIcon('#0891b2'), // Cyan
  amenity: createIcon('#9333ea'), // Purple
  gate: createIcon('#dc2626'), // Red
};

interface MapDisplayProps {
  selectedNodeId?: string;
}

// Component to handle map view updates
const MapController: React.FC<{ selectedNode?: CampusNode }> = ({ selectedNode }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedNode) {
      map.flyTo([selectedNode.y, selectedNode.x], 18, { duration: 1.5 });
    }
  }, [selectedNode, map]);
  return null;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ selectedNodeId }) => {
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [routeMode, setRouteMode] = useState<'walking' | 'taxi' | 'urgent'>('walking');
  const [mapType, setMapType] = useState<'default' | 'street' | 'satellite' | 'terrain'>('default');

  const selectedNode = CAMPUS_NODES.find(n => n.id === selectedNodeId);

  // Map tile configurations
  const mapTiles = {
    default: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com">Esri</a>'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="http://viewfinderpanoramas.org">SRTM</a>'
    }
  };

  // ASTU Campus Boundary (Conceptual approximation for visualization)
  const campusBoundary: [number, number][] = [
    [8.5440, 39.2640],
    [8.5440, 39.2740],
    [8.5360, 39.2740],
    [8.5360, 39.2640],
  ];

  const filteredNodes = filter === 'all'
    ? CAMPUS_NODES
    : CAMPUS_NODES.filter(n => n.category === filter);

  // Simple route simulation between first two connected nodes
  const activeRouteCoords: [number, number][] = selectedNodeId === 'library'
    ? [[8.5420, 39.2710], [8.5415, 39.2700], [8.5410, 39.2680], [8.5400, 39.2695]]
    : [];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full ">
      {/* Header Panel */}
      <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            Campus Intelligence Map
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PostGIS Linked | Active Stream</span>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-600"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Facilities</option>
            <option value="academic">Academic Blocks</option>
            <option value="administrative">Administration</option>
            <option value="amenity">Amenities</option>
            <option value="gate">Entry Gates</option>
          </select>

          <select
            className="text-xs font-bold bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg outline-none text-emerald-700"
            value={routeMode}
            onChange={(e) => setRouteMode(e.target.value as any)}
          >
            <option value="walking">Walking</option>
            <option value="taxi">Taxi (External)</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-grow min-h-[400px]">
        <MapContainer
          center={[8.5402, 39.2693]}
          zoom={16}
          minZoom={15}
          maxZoom={19}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution={mapTiles[mapType].attribution}
            url={mapTiles[mapType].url}
          />

          {/* Campus Highlight */}
          <Polygon
            positions={campusBoundary}
            pathOptions={{
              fillColor: '#10b981',
              fillOpacity: 0.03,
              color: '#10b981',
              weight: 1,
              dashArray: '5, 10'
            }}
          />

          {/* Markers */}
          {filteredNodes.map(node => (
            <Marker
              key={node.id}
              position={[node.y, node.x]}
              icon={icons[node.category] || icons.academic}
            >
              <Popup>
                <div className="p-1 min-w-[160px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {node.category}
                    </span>
                    <Navigation2 size={12} className="text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{node.name}</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mb-3">{node.description}</p>
                  <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                    <button className="flex-grow py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-md hover:bg-slate-900 transition-colors">
                      Route Here
                    </button>
                    <button className="p-1.5 bg-slate-50 text-slate-400 rounded-md hover:text-slate-600">
                      <Info size={12} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active Route Visualization */}
          {activeRouteCoords.length > 0 && (
            <Polyline
              positions={activeRouteCoords}
              pathOptions={{
                color: '#059669',
                weight: 5,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          <MapController selectedNode={selectedNode} />
        </MapContainer>

        {/* Map Type Selector */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-[1000]">
          <select
            value={mapType}
            onChange={(e) => setMapType(e.target.value as any)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg sm:rounded-xl shadow-lg outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-slate-700 cursor-pointer hover:bg-white"
          >
            <option value="default">🗺️ Default</option>
            <option value="street">🛣️ Street</option>
            <option value="satellite">🛰️ Satellite</option>
            <option value="terrain">🏔️ Terrain</option>
          </select>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-[1000] flex flex-col gap-2 hidden sm:flex">
          <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-4 rounded-2xl shadow-xl shadow-slate-200/20 max-w-[180px]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Map Legend</h4>
            <div className="space-y-2">
              <LegendItem color="#059669" label="Academic" />
              <LegendItem color="#475569" label="Admin" />
              <LegendItem color="#dc2626" label="Entry Gate" />
              <LegendItem color="#9333ea" label="City Service" />
            </div>
          </div>
        </div>

        {/* Distance Indicator (Simplified) */}
        {selectedNodeId && (
          <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-[1000]">
            <div className="bg-slate-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-2xl flex items-center gap-2 sm:gap-3 animate-in slide-in-from-left-4">
              <div className="p-1 sm:p-1.5 bg-emerald-500 rounded-md sm:rounded-lg">
                <MapPin size={12} className="text-white" />
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-400">Distance</div>
                <div className="text-xs sm:text-sm font-bold">420m <span className="text-slate-400 font-normal hidden xs:inline">| 6 min</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Source: PostGIS / Supabase GeoStore
          </div>
        </div>
        <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
          <Maximize2 size={14} />
          Full System View
        </button>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string, label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-3">
    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
  </div>
);

export default MapDisplay;


