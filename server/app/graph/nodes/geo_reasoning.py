"""
Node 6: Geo Reasoning Node
Handles campus navigation and nearby service discovery with semantic POI matching
"""
import json
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import GraphState, GeoResponse
from app.graph.prompts.templates import (
    GEO_REASONING_SYSTEM,
    GEO_REASONING_USER,
    MODEL_CONFIGS
)
from app.services.interfaces import IRoutingService, IVectorService
from app.graph.nodes.geo_helpers import (
    extract_locations_from_query,
    haversine_distance,
    calculate_bearing,
    bearing_to_direction
)
from app.core.logging_config import logger
from config import settings


async def geo_reasoning_node(
    state: GraphState,
    routing_service: IRoutingService,
    vector_service: IVectorService  # NEW: for semantic POI search
) -> Dict[str, Any]:
    """
    Handle campus navigation and nearby service discovery
    
    Args:
        state: Current graph state
        routing_service: Routing service for geospatial queries
        vector_service: Vector service for semantic POI search
        
    Returns:
        Updated state with geospatial reasoning
    """
    intent = state.get("intent", "NAVIGATION")
    logger.info(f"[GeoReasoningNode] Processing {intent} request...")
    
    # Handle NEARBY_SERVICE separately
    if intent == "NEARBY_SERVICE":
        return await _handle_nearby_service(state, routing_service)
    
    # Handle NAVIGATION with semantic POI matching
    return await _handle_navigation(state, routing_service, vector_service)


async def _handle_nearby_service(
    state: GraphState,
    routing_service: IRoutingService
) -> Dict[str, Any]:
    """Handle nearby service discovery"""
    logger.info("[GeoReasoningNode] Searching for nearby services...")
    
    try:
        # Extract service category from query with synonym mapping
        query = state["user_query"].lower()
        
        # Category mappings with synonyms
        category_mappings = {
            "mosque": ["mosque", "masjid", "prayer hall"],
            "cafe": ["cafe", "cafeteria", "coffee shop"],
            "pharmacy": ["pharmacy", "drugstore", "medicine"],
            "restaurant": ["restaurant", "food", "dining"],
            "hospital": ["hospital", "medical center", "emergency"],
            "clinic": ["clinic", "health center", "medical"],
            "bank": ["bank", "banking"],
            "atm": ["atm", "cash machine"],
            "salon": ["salon", "barber", "hair"],
            "market": ["market", "shop", "store"],
        }
        
        category = None
        for main_category, synonyms in category_mappings.items():
            for synonym in synonyms:
                if synonym in query:
                    category = main_category
                    break
            if category:
                break
        
        if not category:
            # Try to detect from POI search if no keyword match
            logger.warning(f"[GeoReasoningNode] Could not extract category from query: '{query}'")
            category = "service"  # Generic fallback
        
        logger.info(f"[GeoReasoningNode] Detected service category: {category}")
        
        # Get nearby services
        services = await routing_service.find_nearby_services(
            latitude=state.get("latitude", 8.5569),
            longitude=state.get("longitude", 39.2911),
            service_type=category,
            radius_km=5.0
        )
        
        # Format response
        if services:
            service_names = [s.get("name", "Unknown") for s in services[:3]]
            summary = f"Found {len(services)} {category}(s) near ASTU"
            steps = [
                f"{idx+1}. {s.get('name', 'Unknown')} - {s.get('distance_km', 'Unknown')}km away"
                for idx, s in enumerate(services[:5])
            ]
        else:
            summary = f"No {category}(s) found within 5km of ASTU"
            steps = ["Try searching with a different category or larger radius"]
        
        reasoning_stream = state.get("reasoning_stream", [])
        reasoning_stream.append(f"Searched for nearby {category}(s)")
        reasoning_stream.append(summary)
        
        return {
            "nearby_services": services,
            "service_category": category,
            "route_summary": summary,
            "route_steps": steps,
            "geo_reasoning": [f"Used ASTU location as reference point"],
            "geo_confidence": "high" if services else "low",
            "reasoning_stream": reasoning_stream
        }
        
    except Exception as e:
        logger.error(f"[GeoReasoningNode] Nearby service error: {e}")
        return {
            "error": f"Nearby service search failed: {str(e)}",
            "geo_confidence": "low"
        }


async def _handle_navigation(
    state: GraphState,
    routing_service: IRoutingService,
    vector_service: IVectorService  # NEW
) -> Dict[str, Any]:
    """
    Handle campus navigation with semantic POI matching (NO LLM HALLUCINATION)
    
    Flow:
    1. Extract locations from query using semantic search
    2. Calculate actual route between POIs
    3. Generate human-readable directions
    """
    logger.info("[GeoReasoningNode] Using semantic POI matching for navigation...")
    
    try:
        # Extract start and end locations using semantic search
        start_poi, end_poi = await extract_locations_from_query(
            query=state["user_query"],
            vector_service=vector_service,
            current_lat=state.get("latitude"),
            current_lon=state.get("longitude")
        )
        
        # Update reasoning stream
        reasoning_stream = state.get("reasoning_stream", [])
        reasoning_stream.append("Extracting locations from query using semantic search...")
        
        # If no destination found, return error
        if not end_poi:
            return {
                "route_summary": "Could not identify destination location in query",
                "route_steps": [
                    "Please specify a campus destination (e.g., 'library', 'lab', 'block 8')",
                    "Try: 'take me to the library' or 'where is the computer lab?'"
                ],
                "geo_reasoning": ["No destination POI found in query"],
                "geo_confidence": "low",
                "reasoning_stream": reasoning_stream + ["❌ No destination identified"]
            }
        
        reasoning_stream.append(f"✅ Destination: {end_poi.name}")
        
        # If no start location, use current GPS or default to ASTU entrance
        if not start_poi:
            current_lat = state.get("latitude", 8.5569)
            current_lon = state.get("longitude", 39.2911)
            
            # Try to find nearest POI to current location
            from app.graph.nodes.geo_helpers import find_nearest_poi
            start_poi = await find_nearest_poi(vector_service, current_lat, current_lon)
            
            if start_poi:
                reasoning_stream.append(f"✅ Start: {start_poi.name} (nearest to your location)")
            else:
                # Create a virtual "Current Location" POI
                from app.services.interfaces import POI
                start_poi = POI(
                    id=0,
                    name="Your Current Location",
                    category="virtual",
                    latitude=current_lat,
                    longitude=current_lon,
                    description="Your GPS coordinates"
                )
                reasoning_stream.append(f"✅ Start: Your current GPS location")
        else:
            reasoning_stream.append(f"✅ Start: {start_poi.name}")
        
        # Try to get OSM route with actual walking path
        osm_route = None
        route_coords = None
        try:
            logger.info(f"[GeoReasoningNode] Requesting OSM route from ({start_poi.latitude}, {start_poi.longitude}) to ({end_poi.latitude}, {end_poi.longitude})")
            # NOTE: get_route is synchronous, not async
            osm_route = routing_service.get_route(
                start_lat=start_poi.latitude,
                start_lng=start_poi.longitude,
                end_lat=end_poi.latitude,
                end_lng=end_poi.longitude,
                mode="walking"
            )
            if osm_route and osm_route.get("route_coords"):
                route_coords = osm_route["route_coords"]
                reasoning_stream.append(f"🗺️ Using OSM walking route ({len(route_coords)} waypoints)")
                logger.info(f"[GeoReasoningNode] ✓ OSM route found with {len(route_coords)} waypoints")
            else:
                logger.warning(f"[GeoReasoningNode] OSM returned None or no route_coords")
                reasoning_stream.append("⚠️ OSM routing unavailable, using straight line")
        except Exception as e:
            logger.error(f"[GeoReasoningNode] OSM routing failed: {type(e).__name__}: {e}", exc_info=True)
            reasoning_stream.append(f"⚠️ OSM routing failed: {str(e)[:50]}, using straight line")
        
        # Calculate distance and direction
        if osm_route:
            # Use OSM calculated distance
            distance_km = osm_route["distance_km"]
            distance_meters = osm_route["distance_meters"]
            time_minutes = int(osm_route["duration_minutes"])
            route_steps = osm_route.get("instructions", [])
        else:
            # Fallback to haversine distance
            distance_km = haversine_distance(
                start_poi.latitude, start_poi.longitude,
                end_poi.latitude, end_poi.longitude
            )
            distance_meters = int(distance_km * 1000)
            
            bearing = calculate_bearing(
                start_poi.latitude, start_poi.longitude,
                end_poi.latitude, end_poi.longitude
            )
            direction = bearing_to_direction(bearing)
            
            # Calculate walking time
            walking_speed_kmh = 5.0  # Average walking speed
            time_minutes = int((distance_km / walking_speed_kmh) * 60)
        
        # Adjust for urgency
        urgency = state.get("urgency", "normal")
        if urgency == "exam":
            time_minutes = int(time_minutes * 0.8)  # 20% faster
            reasoning_stream.append("⚡ Exam mode: Optimized for speed")
        elif urgency == "accessibility":
            time_minutes = int(time_minutes * 1.3)  # 30% slower
            reasoning_stream.append("♿ Accessibility mode: Easier routes")
        
        time_minutes = max(1, time_minutes)  # At least 1 minute
        
        # Generate route steps based on whether we have OSM route
        if osm_route and route_steps:
            # Use OSM turn-by-turn instructions if available
            pass  # route_steps already set from osm_route
        else:
            # Fallback to simple direction-based steps
            route_steps = [
                f"Start at {start_poi.name}",
                f"Head {direction} for {distance_meters}m",
                f"Arrive at {end_poi.name}"
            ]
            
            if distance_km < 0.1:  # Less than 100m
                route_steps = [
                    f"{end_poi.name} is very close to {start_poi.name}",
                    f"Walk {distance_meters}m {direction}"
                ]
        
        # Create summary
        summary = f"Route from {start_poi.name} to {end_poi.name}: {distance_km:.2f}km, ~{time_minutes} min walk"
        reasoning_stream.append(f"📍 Distance: {distance_km:.2f}km")
        reasoning_stream.append(f"⏱️ Estimated time: {time_minutes} minutes")
        
        # Return structured response with coordinates for map visualization
        return {
            "route_summary": summary,
            "distance_estimate": f"{distance_km:.2f}km",
            "route_steps": route_steps,
            "geo_reasoning": [
                f"Matched start location to: {start_poi.name}",
                f"Matched destination to: {end_poi.name}",
                f"Calculated distance: {distance_km:.2f}km",
                f"Route type: {'OSM walking path' if osm_route else 'straight line estimate'}",
                f"Applied urgency mode: {urgency}"
            ],
            "geo_confidence": "high",
            "reasoning_stream": reasoning_stream,
            # Coordinates for map visualization
            "start_coordinates": {
                "lat": start_poi.latitude,
                "lon": start_poi.longitude,
                "name": start_poi.name
            },
            "end_coordinates": {
                "lat": end_poi.latitude,
                "lon": end_poi.longitude,
                "name": end_poi.name
            },
            # NEW: Add route_coords array for actual path drawing
            "route_coords": route_coords if route_coords else [
                {"lat": start_poi.latitude, "lng": start_poi.longitude},
                {"lat": end_poi.latitude, "lng": end_poi.longitude}
            ]
        }
        
        # Debug logging
        logger.info(f"[GeoReasoningNode] Returning navigation result with route_coords: {len(route_coords) if route_coords else 0} waypoints")
        
    except Exception as e:
        logger.error(f"[GeoReasoningNode] Navigation error: {e}")
        return {
            "route_summary": "Unable to calculate route",
            "route_steps": [str(e)],
            "geo_reasoning": [f"Error: {str(e)}"],
            "geo_confidence": "low",
            "error": f"Navigation failed: {str(e)}"
        }
