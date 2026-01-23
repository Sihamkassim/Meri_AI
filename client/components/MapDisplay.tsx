'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CampusNode, UserLocation } from '../types';
import { Layers, Maximize2, Navigation2, Info, MapPin, Globe, Map as MapIcon, Locate, Loader2 } from 'lucide-react';

// Marker Icons setup (Academic style)
const createIcon = (color: string) => L.divIcon({
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 2px rgba(0,0,0,0.05);"></div>`,
  className: 'custom-div-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// User location icon with pulsing animation
const userLocationIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 20px; height: 20px;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background-color: rgba(37, 99, 235, 0.2); border-radius: 50%; animation: pulse 2s ease-in-out infinite;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background-color: #2563eb; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.5); }
      }
    </style>
  `,
  className: 'user-location-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const icons: Record<string, L.DivIcon> = {
  academic: createIcon('#059669'), // Emerald
  administrative: createIcon('#475569'), // Slate
  residential: createIcon('#0891b2'), // Cyan
  amenity: createIcon('#9333ea'), // Purple
  gate: createIcon('#dc2626'), // Red
  service: createIcon('#f59e0b'), // Amber - for city services
  building: createIcon('#3b82f6'), // Blue - for buildings
  library: createIcon('#8b5cf6'), // Violet - for libraries
  general: createIcon('#64748b'), // Slate gray - for general
  default: createIcon('#059669'), // Default fallback
};

interface MapDisplayProps {
  selectedNodeId?: string;
}

// Component to handle map view updates and auto-fit to POIs
const MapController: React.FC<{ selectedNode?: CampusNode; nodes: CampusNode[] }> = ({ selectedNode, nodes }) => {
  const map = useMap();
  
  // Fit bounds to show all POIs when they first load
  useEffect(() => {
    if (nodes.length > 0 && !selectedNode) {
      const bounds = L.latLngBounds(nodes.map(n => [n.y, n.x] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [nodes.length, map]);
  
  // Fly to selected node
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
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [campusNodes, setCampusNodes] = useState<CampusNode[]>([]);
  const [campusBoundary, setCampusBoundary] = useState<[number, number][]>([]);
  const [loadingMap, setLoadingMap] = useState(true);

  console.log('[MapDisplay] Component mounted/rendered');

  const selectedNode = campusNodes.find(n => n.id === selectedNodeId);
  
  // Fetch campus map data from backend - using same endpoint as admin dashboard
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const fetchUrl = `${apiUrl}/api/admin/pois`;
    
    console.log('[MapDisplay] Fetching POIs from:', fetchUrl);
    setLoadingMap(true);
    
    fetch(fetchUrl)
      .then(res => {
        console.log('[MapDisplay] Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log('[MapDisplay] Received POI data:', data);
        
        // Transform POIs to CampusNode format (matching admin.js response format)
        const nodes: CampusNode[] = (data.pois || []).map((poi: any) => ({
          id: String(poi.id),
          name: poi.name || 'Unknown',
          description: poi.description || '',
          category: poi.category || 'academic',
          x: poi.longitude,  // longitude = x
          y: poi.latitude,   // latitude = y
        }));
        
        console.log('[MapDisplay] Transformed nodes:', nodes);
        setCampusNodes(nodes);
        
        // Calculate campus boundary from POIs with padding
        if (nodes.length > 0) {
          const lats = nodes.map((n: CampusNode) => n.y);
          const lngs = nodes.map((n: CampusNode) => n.x);
          const minLat = Math.min(...lats) - 0.005;
          const maxLat = Math.max(...lats) + 0.005;
          const minLng = Math.min(...lngs) - 0.005;
          const maxLng = Math.max(...lngs) + 0.005;
          setCampusBoundary([
            [minLat, minLng],
            [minLat, maxLng],
            [maxLat, maxLng],
            [maxLat, minLng],
          ]);
        } else {
          // Default campus boundary fallback
          setCampusBoundary([
            [8.5400, 39.2680],
            [8.5400, 39.2950],
            [8.5650, 39.2950],
            [8.5650, 39.2680],
          ]);
        }
        setLoadingMap(false);
      })
      .catch(error => {
        console.error('[MapDisplay] Failed to fetch POIs:', error);
        // Fallback to empty data
        setCampusNodes([]);
        setCampusBoundary([]);
        setLoadingMap(false);
      });
  }, []);

  // Request user location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      // Request initial location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationError(null);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          setLocationError(errorMessage);
          console.warn('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  }, []);

  // Watch user location continuously when tracking is enabled
  useEffect(() => {
    if (!trackingLocation || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.warn('Geolocation watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    // Cleanup watch on unmount or when tracking disabled
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingLocation]);

  const handleLocateMe = () => {
    if (userLocation) {
      setTrackingLocation(!trackingLocation);
    } else if ('geolocation' in navigator) {
      // Retry getting location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationError(null);
          setTrackingLocation(true);
        },
        (error) => {
          alert('Unable to get your location. Please check browser permissions.');
        }
      );
    }
  };

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


  const filteredNodes = filter === 'all'
    ? campusNodes
    : campusNodes.filter(n => n.category === filter);

  // Calculate map center from POIs
  const mapCenter: [number, number] = campusNodes.length > 0 
    ? [
        campusNodes.reduce((sum, n) => sum + n.y, 0) / campusNodes.length,
        campusNodes.reduce((sum, n) => sum + n.x, 0) / campusNodes.length
      ]
    : [8.5520, 39.2850]; // Default ASTU center

  // Simple route simulation between first two connected nodes
  const activeRouteCoords: [number, number][] = selectedNodeId === 'library'
    ? [[8.5420, 39.2710], [8.5415, 39.2700], [8.5410, 39.2680], [8.5400, 39.2695]]
    : [];

  if (loadingMap) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 rounded-3xl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-slate-600 font-medium">Loading campus map...</p>
        <p className="text-slate-400 text-sm mt-1">Fetching POI data from server</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-full border-t-8 border-t-emerald-600">
      {/* Header Panel */}
      <div className="p-4 md:p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            Campus Intelligence Map
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Data</span>
            </span>
            {campusNodes.length > 0 && (
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {campusNodes.length} POIs
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-600 flex-1 sm:flex-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Facilities ({campusNodes.length})</option>
            <option value="building">Buildings</option>
            <option value="library">Libraries</option>
            <option value="academic">Academic Blocks</option>
            <option value="administrative">Administration</option>
            <option value="residential">Residential</option>
            <option value="amenity">Amenities</option>
            <option value="gate">Entry Gates</option>
            <option value="service">City Services</option>
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
          center={mapCenter}
          zoom={15}
          minZoom={13}
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
              icon={icons[node.category] || icons.default}
            >
              <Popup maxWidth={280} minWidth={220}>
                <div className="p-2 min-w-[200px] max-w-[260px]">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      {node.category}
                    </span>
                    <Navigation2 size={14} className="text-slate-400" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 mb-2 leading-tight">{node.name}</h3>
                  
                  {/* Description */}
                  {node.description && (
                    <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {node.description.length > 150 
                          ? `${node.description.substring(0, 150)}...` 
                          : node.description}
                      </p>
                    </div>
                  )}
                  
                  {/* Coordinates (subtle) */}
                  <div className="text-[10px] text-slate-400 mb-3 flex items-center gap-1">
                    <MapPin size={10} />
                    <span>{node.y.toFixed(5)}, {node.x.toFixed(5)}</span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button className="flex-grow py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">
                      <Navigation2 size={12} />
                      Get Directions
                    </button>
                    <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-slate-700 transition-colors">
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userLocationIcon}
            >
              <Popup>
                <div className="p-1 min-w-[140px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Locate size={14} className="text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Your Location</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-1">
                    Accuracy: ±{Math.round(userLocation.accuracy)}m
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

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

          <MapController selectedNode={selectedNode} nodes={campusNodes} />
        </MapContainer>

        {/* Map Type Selector & Location Button */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-[1000] flex flex-col gap-2">
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
          
          <button
            onClick={handleLocateMe}
            title={trackingLocation ? "Stop tracking location" : "Find my location"}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold bg-white/95 backdrop-blur-md border rounded-lg sm:rounded-xl shadow-lg outline-none transition-all flex items-center justify-center gap-2 hover:bg-white ${
              trackingLocation 
                ? 'border-blue-500 text-blue-600' 
                : locationError 
                  ? 'border-red-200 text-red-400 cursor-not-allowed' 
                  : 'border-slate-200 text-slate-600'
            }`}
            disabled={!!locationError && !userLocation}
          >
            <Locate size={14} className={trackingLocation ? 'animate-pulse' : ''} />
            {trackingLocation && <span className="hidden sm:inline">Tracking</span>}
          </button>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 z-[1000] hidden sm:flex flex-col gap-2">
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


