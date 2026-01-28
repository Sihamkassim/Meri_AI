"""
OSM (OpenStreetMap) Service for real route calculation
Uses OSMnx for ASTU campus navigation
"""
import osmnx as ox
import networkx as nx
from typing import List, Dict, Any, Optional, Tuple
from geopy.distance import geodesic
from app.core.logging_config import logger


class OSMService:
    """OpenStreetMap service for route calculation"""
    
    # ASTU campus center point and radius
    ASTU_CENTER = (8.5570, 39.2915)  # Main gate area
    CAMPUS_RADIUS = 1000  # 1km radius around campus
    
    def __init__(self):
        """Initialize OSM service"""
        self.graph = None
        self.campus_graph_loaded = False
        logger.info("[OSMService] Initialized")
    
    def load_campus_graph(self) -> bool:
        """
        Load ASTU campus road network from OSM
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("[OSMService] Loading ASTU campus graph from OpenStreetMap...")
            
            # Download road network around ASTU campus center (1km radius)
            self.graph = ox.graph_from_point(
                center_point=self.ASTU_CENTER,
                dist=self.CAMPUS_RADIUS,
                network_type="walk",  # Walking network
                simplify=True
            )
            
            self.campus_graph_loaded = True
            logger.info(f"[OSMService] ✓ Loaded {len(self.graph.nodes)} nodes, {len(self.graph.edges)} edges")
            return True
            
        except Exception as e:
            logger.error(f"[OSMService] Failed to load campus graph: {e}")
            self.campus_graph_loaded = False
            return False
    
    def get_route(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float,
        mode: str = "walking"
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate route between two points using OSM
        
        Args:
            start_lat: Starting latitude
            start_lng: Starting longitude
            end_lat: Ending latitude
            end_lng: Ending longitude
            mode: Travel mode (walking/driving)
            
        Returns:
            Route information or None
        """
        try:
            # Lazy load graph
            if not self.campus_graph_loaded:
                if not self.load_campus_graph():
                    return None
            
            logger.info(f"[OSMService] Calculating route from ({start_lat}, {start_lng}) to ({end_lat}, {end_lng})")
            
            # Check if destination is outside campus (more than 1km from center)
            dest_distance_from_center = geodesic(self.ASTU_CENTER, (end_lat, end_lng)).meters
            is_external_destination = dest_distance_from_center > (self.CAMPUS_RADIUS + 200)
            
            if is_external_destination:
                logger.info(f"[OSMService] Destination is external ({dest_distance_from_center:.0f}m from campus center)")
                return self._route_to_external_destination(start_lat, start_lng, end_lat, end_lng)
            
            # Find nearest nodes
            start_node = ox.distance.nearest_nodes(self.graph, start_lng, start_lat)
            end_node = ox.distance.nearest_nodes(self.graph, end_lng, end_lat)
            
            # Calculate shortest path
            route = nx.shortest_path(
                self.graph,
                start_node,
                end_node,
                weight="length"
            )
            
            # Get route geometry
            route_coords = []
            for node in route:
                node_data = self.graph.nodes[node]
                route_coords.append({
                    "lat": node_data["y"],
                    "lng": node_data["x"]
                })
            
            # Calculate distance
            total_distance = 0
            for i in range(len(route) - 1):
                edge_data = self.graph.get_edge_data(route[i], route[i + 1])
                if edge_data:
                    # Get first edge (there might be multiple edges between nodes)
                    first_edge = list(edge_data.values())[0]
                    total_distance += first_edge.get("length", 0)
            
            # Calculate walking time (average 1.4 m/s)
            walking_time = total_distance / 1.4  # seconds
            
            # Generate turn-by-turn instructions
            instructions = self._generate_instructions(route, self.graph)
            
            result = {
                "distance_meters": round(total_distance, 1),
                "distance_km": round(total_distance / 1000, 2),
                "duration_seconds": round(walking_time),
                "duration_minutes": round(walking_time / 60, 1),
                "route_coords": route_coords,
                "instructions": instructions,
                "nodes_count": len(route)
            }
            
            logger.info(f"[OSMService] ✓ Route calculated: {result['distance_meters']}m, {result['duration_minutes']} min")
            return result
            
        except Exception as e:
            logger.error(f"[OSMService] Route calculation failed: {e}")
            return None
    
    def _generate_instructions(self, route: List, graph) -> List[str]:
        """Generate turn-by-turn instructions"""
        instructions = ["Start from your current location"]
        
        # Simple instructions based on route segments
        segment_count = len(route)
        
        if segment_count <= 2:
            instructions.append("Walk straight to your destination")
        elif segment_count <= 5:
            instructions.append("Continue walking along the path")
        else:
            instructions.append("Follow the walking path")
            instructions.append(f"Continue for approximately {segment_count * 20} meters")
        
        instructions.append("You have arrived at your destination")
        
        return instructions
    
    def _route_to_external_destination(
        self,
        start_lat: float,
        start_lng: float,
        end_lat: float,
        end_lng: float
    ) -> Optional[Dict[str, Any]]:
        """
        Handle routing to destinations outside campus by finding nearest campus exit.
        Routes to campus edge, then provides straight-line guidance to external destination.
        """
        try:
            # Find nearest campus exit (find boundary nodes closest to destination)
            boundary_nodes = []
            for node, data in self.graph.nodes(data=True):
                node_lat, node_lng = data["y"], data["x"]
                # Check if node is near campus boundary
                dist_from_center = geodesic(self.ASTU_CENTER, (node_lat, node_lng)).meters
                if dist_from_center > (self.CAMPUS_RADIUS * 0.85):  # 85% of radius = near edge
                    boundary_nodes.append((node, node_lat, node_lng))
            
            # Find boundary node closest to external destination
            best_exit = None
            min_dist = float('inf')
            for node, node_lat, node_lng in boundary_nodes:
                dist = geodesic((node_lat, node_lng), (end_lat, end_lng)).meters
                if dist < min_dist:
                    min_dist = dist
                    best_exit = (node, node_lat, node_lng)
            
            if not best_exit:
                logger.warning("[OSMService] No suitable campus exit found")
                return None
            
            exit_node, exit_lat, exit_lng = best_exit
            
            # Route from start to campus exit
            start_node = ox.distance.nearest_nodes(self.graph, start_lng, start_lat)
            
            route = nx.shortest_path(
                self.graph,
                start_node,
                exit_node,
                weight="length"
            )
            
            # Calculate distance within campus
            campus_distance = 0
            route_coords = []
            for i, node in enumerate(route):
                node_data = self.graph.nodes[node]
                route_coords.append({
                    "lat": node_data["y"],
                    "lng": node_data["x"]
                })
                if i < len(route) - 1:
                    edge_data = self.graph.get_edge_data(route[i], route[i + 1])
                    if edge_data:
                        first_edge = list(edge_data.values())[0]
                        campus_distance += first_edge.get("length", 0)
            
            # Add external segment (straight line from campus exit to destination)
            external_distance = geodesic((exit_lat, exit_lng), (end_lat, end_lng)).meters
            route_coords.append({"lat": end_lat, "lng": end_lng})
            
            total_distance = campus_distance + external_distance
            walking_time = total_distance / 1.4  # seconds
            
            # Generate instructions
            instructions = [
                "Start from your current location",
                f"Follow the campus path to the nearest exit ({round(campus_distance)}m)",
                "Exit the campus",
                f"Continue straight for approximately {round(external_distance)}m to reach your destination",
                "You have arrived at your destination"
            ]
            
            result = {
                "distance_meters": round(total_distance, 1),
                "distance_km": round(total_distance / 1000, 2),
                "duration_seconds": round(walking_time),
                "duration_minutes": round(walking_time / 60, 1),
                "route_coords": route_coords,
                "instructions": instructions,
                "nodes_count": len(route),
                "external_destination": True,
                "campus_distance_meters": round(campus_distance, 1),
                "external_distance_meters": round(external_distance, 1)
            }
            
            logger.info(f"[OSMService] ✓ Hybrid route: {campus_distance:.0f}m campus + {external_distance:.0f}m external")
            return result
            
        except Exception as e:
            logger.error(f"[OSMService] External route calculation failed: {e}")
            return None
    
    def find_nearby_pois(
        self,
        latitude: float,
        longitude: float,
        tags: Dict[str, Any],
        radius_meters: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Find nearby POIs from OpenStreetMap
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            tags: OSM tags to search for (e.g., {"amenity": "mosque"})
            radius_meters: Search radius in meters
            
        Returns:
            List of POIs
        """
        try:
            logger.info(f"[OSMService] Searching OSM for {tags} within {radius_meters}m")
            
            # Download POIs from OSM
            pois = ox.features_from_point(
                (latitude, longitude),
                tags=tags,
                dist=radius_meters
            )
            
            results = []
            for idx, poi in pois.iterrows():
                # Get name
                name = poi.get("name", "Unknown")
                
                # Get coordinates (centroid for polygons)
                if poi.geometry.geom_type == "Point":
                    poi_lat = poi.geometry.y
                    poi_lng = poi.geometry.x
                else:
                    centroid = poi.geometry.centroid
                    poi_lat = centroid.y
                    poi_lng = centroid.x
                
                # Calculate distance
                distance = geodesic((latitude, longitude), (poi_lat, poi_lng)).kilometers
                
                results.append({
                    "name": name,
                    "latitude": poi_lat,
                    "longitude": poi_lng,
                    "distance_km": round(distance, 2),
                    "osm_id": int(idx) if isinstance(idx, int) else None,
                    "tags": dict(poi.get("tags", {}))
                })
            
            # Sort by distance
            results.sort(key=lambda x: x["distance_km"])
            
            logger.info(f"[OSMService] ✓ Found {len(results)} POIs")
            return results
            
        except Exception as e:
            logger.error(f"[OSMService] POI search failed: {e}")
            return []
    
    def get_campus_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded campus graph"""
        if not self.campus_graph_loaded:
            return {"loaded": False}
        
        return {
            "loaded": True,
            "nodes": len(self.graph.nodes),
            "edges": len(self.graph.edges),
            "bounds": self.ASTU_BOUNDS
        }
