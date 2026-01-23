"""
Node 6: Geo Reasoning Node
Handles campus navigation and nearby service discovery
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
from app.services.interfaces import IRoutingService
from app.core.logging_config import logger
from config import settings


async def geo_reasoning_node(
    state: GraphState,
    routing_service: IRoutingService
) -> Dict[str, Any]:
    """
    Handle campus navigation and nearby service discovery
    
    Args:
        state: Current graph state
        routing_service: Routing service for geospatial queries
        
    Returns:
        Updated state with geospatial reasoning
    """
    intent = state.get("intent", "NAVIGATION")
    logger.info(f"[GeoReasoningNode] Processing {intent} request...")
    
    # Handle NEARBY_SERVICE separately
    if intent == "NEARBY_SERVICE":
        return await _handle_nearby_service(state, routing_service)
    
    # Handle NAVIGATION with LLM reasoning
    return await _handle_navigation(state, routing_service)


async def _handle_nearby_service(
    state: GraphState,
    routing_service: IRoutingService
) -> Dict[str, Any]:
    """Handle nearby service discovery"""
    logger.info("[GeoReasoningNode] Searching for nearby services...")
    
    try:
        # Extract service category from query (simple keyword matching)
        query = state["user_query"].lower()
        categories = ["mosque", "pharmacy", "salon", "cafe", "restaurant", 
                     "bank", "atm", "hospital", "clinic", "market"]
        
        category = None
        for cat in categories:
            if cat in query:
                category = cat
                break
        
        if not category:
            category = "mosque"  # Default
        
        # Get nearby services
        services = await routing_service.find_nearby_services(
            latitude=state.get("latitude", 8.5569),
            longitude=state.get("longitude", 39.2911),
            category=category,
            max_distance_km=5.0,
            limit=10
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
    routing_service: IRoutingService
) -> Dict[str, Any]:
    """Handle campus navigation with AI reasoning"""
    logger.info("[GeoReasoningNode] Calculating campus route...")
    
    # Initialize LLM with moderate temperature for stable routing
    llm = ChatGoogleGenerativeAI(
        model=MODEL_CONFIGS["geo_reasoning"]["model"],
        temperature=MODEL_CONFIGS["geo_reasoning"]["temperature"],
        google_api_key=settings.ai_api_key
    )
    
    # Prepare messages
    user_prompt = GEO_REASONING_USER.format(
        lat=state.get("latitude", 8.5569),
        lng=state.get("longitude", 39.2911),
        user_query=state["user_query"],
        mode=state.get("mode", "walking"),
        urgency=state.get("urgency", "normal")
    )
    messages = [
        SystemMessage(content=GEO_REASONING_SYSTEM),
        HumanMessage(content=user_prompt)
    ]
    
    try:
        # Get AI reasoning
        response = await llm.ainvoke(messages)
        content = response.content
        
        # Parse JSON response
        if isinstance(content, str):
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            result = json.loads(content)
        else:
            result = content
        
        # Validate with Pydantic
        geo_response = GeoResponse(**result)
        
        logger.info(f"[GeoReasoningNode] Generated route with {geo_response.confidence} confidence")
        
        reasoning_stream = state.get("reasoning_stream", [])
        reasoning_stream.append("Calculated campus route")
        if state.get("urgency") == "exam":
            reasoning_stream.append("Applied exam urgency mode")
        reasoning_stream.append(geo_response.route_summary)
        
        return {
            "route_summary": geo_response.route_summary,
            "distance_estimate": geo_response.distance_estimate,
            "route_steps": geo_response.route_steps,
            "geo_reasoning": geo_response.reasoning,
            "geo_confidence": geo_response.confidence,
            "reasoning_stream": reasoning_stream
        }
        
    except Exception as e:
        logger.error(f"[GeoReasoningNode] Navigation error: {e}")
        return {
            "route_summary": "Unable to calculate route",
            "route_steps": ["Error occurred while calculating route"],
            "geo_reasoning": [str(e)],
            "geo_confidence": "low",
            "error": f"Navigation failed: {str(e)}"
        }
