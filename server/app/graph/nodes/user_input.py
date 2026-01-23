"""
Node 1: User Input Node
Normalizes raw user input
"""
from typing import Dict, Any
from app.graph.state import GraphState
from app.core.logging_config import logger


async def user_input_node(state: GraphState) -> Dict[str, Any]:
    """
    Entry point to the graph - normalizes raw user input
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with normalized input
    """
    logger.info(f"[UserInputNode] Processing query: {state['user_query'][:50]}...")
    
    # Default values
    updates = {
        "mode": state.get("mode", "walking"),
        "urgency": state.get("urgency", "normal"),
        "reasoning_stream": ["Understanding your question..."]
    }
    
    # Validate coordinates
    if state.get("latitude") and state.get("longitude"):
        logger.info(f"[UserInputNode] Location provided: ({state['latitude']}, {state['longitude']})")
    else:
        # Default to ASTU main gate
        logger.info("[UserInputNode] No location provided, using ASTU main gate")
        updates["latitude"] = 8.5569
        updates["longitude"] = 39.2911
    
    return updates
