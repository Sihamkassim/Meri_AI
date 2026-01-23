"""
Node 3: Routing Decision Node
Decides which pipeline to execute based on intent
"""
from typing import Literal
from app.graph.state import GraphState
from app.core.logging_config import logger


def routing_decision_node(state: GraphState) -> Literal["geo", "rag", "both"]:
    """
    Decide which pipeline(s) to run based on classified intent
    
    This is a conditional edge function for LangGraph
    
    Args:
        state: Current graph state
        
    Returns:
        "geo" for geospatial pipeline
        "rag" for RAG pipeline
        "both" for mixed queries
    """
    intent = state.get("intent", "UNIVERSITY_INFO")
    
    logger.info(f"[RoutingDecisionNode] Intent: {intent}")
    
    if intent == "NAVIGATION":
        logger.info("[RoutingDecisionNode] Routing to GeoReasoning pipeline")
        return "geo"
    elif intent == "NEARBY_SERVICE":
        logger.info("[RoutingDecisionNode] Routing to GeoReasoning pipeline")
        return "geo"
    elif intent == "UNIVERSITY_INFO":
        logger.info("[RoutingDecisionNode] Routing to RAG pipeline")
        return "rag"
    elif intent == "MIXED":
        logger.info("[RoutingDecisionNode] Routing to BOTH pipelines")
        return "both"
    else:
        # Default to RAG
        logger.warning(f"[RoutingDecisionNode] Unknown intent: {intent}, defaulting to RAG")
        return "rag"
