"""
Geo Reasoning Helper Functions
Semantic location extraction and routing logic
"""
import re
import math
from typing import Optional, Tuple
from app.services.interfaces import IVectorService, POI
from app.core.logging_config import logger


async def extract_locations_from_query(
    query: str,
    vector_service: IVectorService,
    current_lat: Optional[float] = None,
    current_lon: Optional[float] = None
) -> Tuple[Optional[POI], Optional[POI]]:
    """
    Extract start and end locations from natural language query using semantic search.
    
    Examples:
        "Take me from library to lab" → (library_poi, lab_poi)
        "How do I get to the mosque?" → (current_location_poi, mosque_poi)
        "Where is Block-8?" → (None, block8_poi)
    
    Args:
        query: User's natural language query
        vector_service: Vector service for semantic POI search
        current_lat: User's current latitude (optional)
        current_lon: User's current longitude (optional)
        
    Returns:
        Tuple of (start_poi, end_poi), either can be None
    """
    logger.info(f"[GeoHelpers] Extracting locations from: {query}")
    
    start_poi = None
    end_poi = None
    
    # Pattern 1: "from X to Y"
    from_to = re.search(r'from\s+(.+?)\s+to\s+(.+?)(?:\?|$|\.)', query, re.IGNORECASE)
    
    if from_to:
        start_name = from_to.group(1).strip()
        end_name = from_to.group(2).strip()
        
        logger.info(f"[GeoHelpers] Detected route: '{start_name}' → '{end_name}'")
        
        # Semantic search for both locations
        start_results = await vector_service.search_pois(start_name, limit=1)
        end_results = await vector_service.search_pois(end_name, limit=1)
        
        start_poi = start_results[0] if start_results else None
        end_poi = end_results[0] if end_results else None
        
        if start_poi:
            logger.info(f"[GeoHelpers] Found start: {start_poi.name} (similarity: {getattr(start_poi, 'similarity', 'N/A')})")
        if end_poi:
            logger.info(f"[GeoHelpers] Found end: {end_poi.name} (similarity: {getattr(end_poi, 'similarity', 'N/A')})")
            
        return start_poi, end_poi
    
    # Pattern 2: "to X", "where is X", "find X", "get to X"
    to_patterns = [
        r'(?:to|where\s+is|find|get\s+to|locate)\s+(?:the\s+)?(.+?)(?:\?|$|\.)',
        r'(?:direction\s+to|navigate\s+to|go\s+to)\s+(?:the\s+)?(.+?)(?:\?|$|\.)'
    ]
    
    for pattern in to_patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            location_name = match.group(1).strip()
            logger.info(f"[GeoHelpers] Detected destination: '{location_name}'")
            
            # Semantic search for destination
            results = await vector_service.search_pois(location_name, limit=1)
            end_poi = results[0] if results else None
            
            if end_poi:
                logger.info(f"[GeoHelpers] Found: {end_poi.name} (similarity: {getattr(end_poi, 'similarity', 'N/A')})")
            
            # If we have current location, find nearest POI as start
            if current_lat and current_lon and end_poi:
                start_poi = await find_nearest_poi(
                    vector_service, current_lat, current_lon
                )
                if start_poi:
                    logger.info(f"[GeoHelpers] Nearest POI to current location: {start_poi.name}")
            
            return start_poi, end_poi
    
    # Pattern 3: Generic query - search for any mentioned location
    logger.info("[GeoHelpers] No specific pattern matched, searching for locations in query")
    results = await vector_service.search_pois(query, limit=1)
    if results:
        end_poi = results[0]
        logger.info(f"[GeoHelpers] Found location: {end_poi.name}")
    
    return start_poi, end_poi


async def find_nearest_poi(
    vector_service: IVectorService,
    lat: float,
    lon: float,
    limit: int = 50
) -> Optional[POI]:
    """
    Find the nearest POI to given coordinates.
    
    Args:
        vector_service: Vector service for POI access
        lat: Latitude
        lon: Longitude
        limit: Number of POIs to consider
        
    Returns:
        Nearest POI or None
    """
    try:
        # Get all campus POIs
        all_pois = await vector_service.search_pois("campus location", limit=limit)
        
        if not all_pois:
            return None
        
        # Calculate distances
        def distance(poi: POI) -> float:
            """Haversine distance in km"""
            R = 6371  # Earth radius in km
            lat1_rad = math.radians(lat)
            lat2_rad = math.radians(poi.latitude)
            delta_lat = math.radians(poi.latitude - lat)
            delta_lon = math.radians(poi.longitude - lon)
            
            a = (math.sin(delta_lat / 2) ** 2 +
                 math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
            c = 2 * math.asin(math.sqrt(a))
            return R * c
        
        nearest = min(all_pois, key=distance)
        dist = distance(nearest)
        logger.info(f"[GeoHelpers] Nearest POI: {nearest.name} ({dist:.2f}km away)")
        return nearest
        
    except Exception as e:
        logger.error(f"[GeoHelpers] Error finding nearest POI: {e}")
        return None


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate bearing between two points in degrees (0-360)"""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lon = math.radians(lon2 - lon1)
    
    x = math.sin(delta_lon) * math.cos(lat2_rad)
    y = (math.cos(lat1_rad) * math.sin(lat2_rad) -
         math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
    
    bearing = math.atan2(x, y)
    return (math.degrees(bearing) + 360) % 360


def bearing_to_direction(bearing: float) -> str:
    """Convert bearing to compass direction"""
    directions = [
        "north", "northeast", "east", "southeast",
        "south", "southwest", "west", "northwest"
    ]
    index = int((bearing + 22.5) / 45) % 8
    return directions[index]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate haversine distance between two points in kilometers"""
    R = 6371  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c
