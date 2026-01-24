"""
Node 7: Response Composer Node
Merges outputs and creates final user-facing response with streaming support
"""
from typing import Dict, Any, List
from app.graph.state import GraphState
from app.core.logging_config import logger


async def response_composer_node(state: GraphState) -> Dict[str, Any]:
    """
    Compose final response by merging RAG and/or Geo outputs
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with final answer and reasoning stream
    """
    logger.info("[ResponseComposerNode] Composing final response...")
    
    intent = state.get("intent", "UNIVERSITY_INFO")
    final_answer = ""
    sources = []
    reasoning_stream = state.get("reasoning_stream", []).copy()
    
    # Compose based on intent
    if intent == "NAVIGATION":
        final_answer = _compose_navigation_response(state)
        reasoning_stream.append("Here is your recommended path")
        
    elif intent == "NEARBY_SERVICE":
        final_answer = _compose_nearby_response(state)
        reasoning_stream.append("Here are the nearby services")
        
    elif intent == "UNIVERSITY_INFO":
        final_answer = state.get("rag_answer", "No information available")
        sources = state.get("rag_sources", [])
        reasoning_stream.append("Answer based on verified ASTU sources")
        
    elif intent == "MIXED":
        # Combine both RAG and Geo
        rag_part = state.get("rag_answer", "")
        geo_part = _compose_navigation_response(state)
        
        final_answer = f"{rag_part}\n\n{geo_part}"
        sources = state.get("rag_sources", [])
        reasoning_stream.append("Combined information and navigation guidance")
    
    else:
        final_answer = "I'm not sure how to help with that. Please try rephrasing your question."
        reasoning_stream.append("Unable to classify request")
    
    logger.info(f"[ResponseComposerNode] Composed {intent} response")
    
    # Pass through geospatial data for frontend visualization
    response_data = {
        "final_answer": final_answer,
        "sources_used": sources,
        "reasoning_stream": reasoning_stream,
        # Pass through vital metadata for frontend
        "intent": intent,
        "start_coordinates": state.get("start_coordinates"),
        "end_coordinates": state.get("end_coordinates"),
        "distance_estimate": state.get("distance_estimate"),
        "route_coords": state.get("route_coords"),
        # Confidence metrics
        "rag_confidence": state.get("rag_confidence"),
        "geo_confidence": state.get("geo_confidence")
    }
        # Debug logging for route_coords
    route_coords_from_state = state.get("route_coords")
    logger.info(f"[ResponseComposerNode] route_coords from state: {type(route_coords_from_state)} with {len(route_coords_from_state) if route_coords_from_state and isinstance(route_coords_from_state, list) else 0} waypoints")
        # Debug logging
    route_coords_from_state = state.get("route_coords")
    logger.info(f"[ResponseComposerNode] route_coords from state: {type(route_coords_from_state)} = {route_coords_from_state[:2] if route_coords_from_state and isinstance(route_coords_from_state, list) else route_coords_from_state}")
    logger.info(f"[ResponseComposerNode] response_data keys: {list(response_data.keys())}")
    
    return response_data


def _compose_navigation_response(state: GraphState) -> str:
    """Compose navigation response"""
    summary = state.get("route_summary", "No route available")
    distance = state.get("distance_estimate", "Unknown distance")
    steps = state.get("route_steps", [])
    reasoning = state.get("geo_reasoning", [])
    
    response = f"**{summary}**\n\n"
    response += f"**Estimated Distance:** {distance}\n\n"
    
    if steps:
        response += "**Route Steps:**\n"
        for step in steps:
            response += f"- {step}\n"
    
    if reasoning:
        response += "\n**Why this route:**\n"
        for reason in reasoning:
            response += f"- {reason}\n"
    
    return response.strip()


def _compose_nearby_response(state: GraphState) -> str:
    """Compose nearby services response"""
    category = state.get("service_category", "services")
    services = state.get("nearby_services", [])
    summary = state.get("route_summary", f"No {category} found nearby")
    
    if not services:
        return summary
    
    response = f"**{summary}**\n\n"
    response += f"**Top {category.title()}s near ASTU:**\n\n"
    
    for idx, service in enumerate(services[:5], 1):
        name = service.get("name", "Unknown")
        distance = service.get("distance_km", "Unknown")
        response += f"{idx}. **{name}** - {distance}km away\n"
    
    return response.strip()
