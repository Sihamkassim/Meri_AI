"""
app/services/routing_service.py
Navigation and routing logic for campus and nearby services.
"""
import math
from typing import Dict, List, Any
from app.services.interfaces import IRoutingService, IDatabase, IVectorService
from app.core.exceptions import LocationNotFound, RouteCalculationError
from app.core.logging_config import routing_logger


class RoutingService(IRoutingService):
    """Campus navigation and routing service"""
    
    def __init__(self, db_service: IDatabase, vector_service: IVectorService):
        """
        Initialize with dependencies.
        Args:
            db_service: Database for POI lookups
            vector_service: Vector search for location fuzzy matching
        """
        self.db = db_service
        self.vector = vector_service
    
    def _haversine_distance(self, lat1: float, lon1: float, 
                           lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in kilometers"""
        R = 6371  # Earth radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _estimate_walking_time(self, distance_km: float) -> int:
        """Estimate walking time in minutes (avg 1.4 m/s)"""
        walking_speed = 1.4 / 1000  # km/minute
        return max(1, int(distance_km / walking_speed))
    
    async def find_route(self, start_name: str, end_name: str, 
                        urgency: str = "normal") -> Dict[str, Any]:
        """
        Calculate route between two locations.
        
        Args:
            start_name: Starting location name
            end_name: Destination location name
            urgency: "normal" | "exam" | "accessibility"
        
        Returns:
            Route with steps, distance, and estimated time
        """
        try:
            routing_logger.info(f"Calculating route: {start_name} -> {end_name}")
            
            # Find start and end POIs
            # In MVP: Direct lookup or search
            start_poi = self._find_poi_by_name(start_name)
            end_poi = self._find_poi_by_name(end_name)
            
            if not start_poi or not end_poi:
                raise LocationNotFound(start_name if not start_poi else end_name)
            
            # Calculate distance
            distance = self._haversine_distance(
                start_poi["latitude"], start_poi["longitude"],
                end_poi["latitude"], end_poi["longitude"]
            )
            
            # Calculate walking time
            walking_time = self._estimate_walking_time(distance)
            
            # Adjust for urgency
            if urgency == "exam":
                walking_time = int(walking_time * 0.8)  # 20% faster
            elif urgency == "accessibility":
                walking_time = int(walking_time * 1.3)  # 30% slower
            
            # Generate route steps (MVP: simple A->B)
            steps = [
                {
                    "order": 1,
                    "instruction": f"Start at {start_poi['name']}",
                    "distance_km": 0,
                    "latitude": start_poi["latitude"],
                    "longitude": start_poi["longitude"],
                    "poi_name": start_poi["name"]
                },
                {
                    "order": 2,
                    "instruction": f"Head towards {end_poi['name']}",
                    "distance_km": distance,
                    "latitude": end_poi["latitude"],
                    "longitude": end_poi["longitude"],
                    "poi_name": end_poi["name"]
                }
            ]
            
            route = {
                "start_name": start_poi["name"],
                "end_name": end_poi["name"],
                "start_lat": start_poi["latitude"],
                "start_lon": start_poi["longitude"],
                "end_lat": end_poi["latitude"],
                "end_lon": end_poi["longitude"],
                "total_distance_km": round(distance, 2),
                "steps": steps,
                "urgency_mode": urgency,
                "estimated_time_minutes": walking_time
            }
            
            routing_logger.info(f"Route calculated: {distance:.2f}km, {walking_time}min")
            return route
            
        except LocationNotFound:
            raise
        except Exception as e:
            raise RouteCalculationError(str(e))
    
    async def find_nearby_services(self, latitude: float, longitude: float,
                                   service_type: str, radius_km: float = 5) -> List[Dict]:
        """
        Find nearby services by type and location.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            service_type: Service category (mosque, pharmacy, salon, etc.)
            radius_km: Search radius
        
        Returns:
            List of nearby services with distance
        """
        try:
            routing_logger.info(f"Finding {service_type} services within {radius_km}km")
            
            # Query database for nearby POIs of type
            pois = self.db.get_nearby_pois(latitude, longitude, radius_km)
            
            # Filter by service type
            filtered = [
                poi for poi in pois 
                if poi.get("category", "").lower() == service_type.lower()
            ]
            
            routing_logger.info(f"Found {len(filtered)} {service_type} services")
            return filtered
            
        except Exception as e:
            raise RouteCalculationError(f"Service search failed: {str(e)}")
    
    def _find_poi_by_name(self, name: str) -> Dict[str, Any]:
        """
        Find POI by name (MVP implementation).
        Future: Use vector search for fuzzy matching.
        """
        # Simple substring search in categories
        categories = name.lower().split()
        
        for category in categories:
            pois = self.db.get_pois_by_category(category, limit=1)
            if pois:
                return pois[0]
        
        # If no exact match, return None (will raise LocationNotFound)
        return None
