"""
ASTU Route AI LangGraph Workflow
Orchestrates the 7-node intelligent routing system
"""
from typing import Dict, Any, AsyncGenerator
from langgraph.graph import StateGraph, END
from app.graph.state import GraphState
from app.graph.nodes.user_input import user_input_node
from app.graph.nodes.intent_classifier import intent_classifier_node
from app.graph.nodes.routing_decision import routing_decision_node
from app.graph.nodes.rag_retriever import rag_retriever_node
from app.graph.nodes.rag_generator import rag_generator_node
from app.graph.nodes.geo_reasoning import geo_reasoning_node
from app.graph.nodes.response_composer import response_composer_node
from app.services.interfaces import IVectorService, IRoutingService
from app.core.logging_config import logger


class AstuRouteGraph:
    """
    LangGraph workflow for ASTU Route AI
    
    Implements 7-node architecture:
    1. UserInputNode - Normalize input
    2. IntentClassifierNode - Classify intent
    3. RoutingDecisionNode - Branch logic
    4. RAG_RetrieverNode - Knowledge retrieval
    5. RAG_GeneratorNode - Grounded answers
    6. GeoReasoningNode - Navigation logic
    7. ResponseComposerNode - Final output
    """
    
    def __init__(self, vector_service: IVectorService, routing_service: IRoutingService):
        """
        Initialize the workflow graph
        
        Args:
            vector_service: Vector search service for RAG
            routing_service: Routing service for geospatial queries
        """
        self.vector_service = vector_service
        self.routing_service = routing_service
        self.graph = self._build_graph()
        logger.info("[AstuRouteGraph] Workflow initialized")
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        
        # Create graph
        workflow = StateGraph(GraphState)
        
        # Wrapper functions for async nodes
        async def rag_retriever_wrapper(state):
            return await rag_retriever_node(state, self.vector_service)

        async def geo_reasoning_wrapper(state):
            return await geo_reasoning_node(state, self.routing_service, self.vector_service)
        
        # Add nodes
        workflow.add_node("user_input", user_input_node)
        workflow.add_node("intent_classifier", intent_classifier_node)
        workflow.add_node("rag_retriever", rag_retriever_wrapper)
        workflow.add_node("rag_generator", rag_generator_node)
        workflow.add_node("geo_reasoning", geo_reasoning_wrapper)
        workflow.add_node("response_composer", response_composer_node)
        
        # Define edges
        # 1. Start -> UserInput
        workflow.set_entry_point("user_input")
        
        # 2. UserInput -> IntentClassifier
        workflow.add_edge("user_input", "intent_classifier")
        
        # 3. IntentClassifier -> Conditional branching based on routing_decision
        workflow.add_conditional_edges(
            "intent_classifier",
            routing_decision_node,
            {
                "geo": "geo_reasoning",
                "rag": "rag_retriever",
                "both": "rag_retriever"  # Start with RAG, then GEO
            }
        )
        
        # 4. RAG pipeline: Retriever -> Generator -> Check if MIXED
        workflow.add_edge("rag_retriever", "rag_generator")
        workflow.add_conditional_edges(
            "rag_generator",
            lambda state: "geo" if state.get("intent") == "MIXED" else "compose",
            {
                "geo": "geo_reasoning",
                "compose": "response_composer"
            }
        )
        
        # 5. Geo pipeline -> Response Composer
        workflow.add_edge("geo_reasoning", "response_composer")
        
        # 6. Response Composer -> END
        workflow.add_edge("response_composer", END)
        
        # Compile the graph
        return workflow.compile()
    
    async def execute(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the workflow with user input
        
        Args:
            user_input: Dictionary with user_query, latitude, longitude, mode, urgency
            
        Returns:
            Final state with answer and reasoning
        """
        logger.info(f"[AstuRouteGraph] Executing workflow for: {user_input.get('user_query', '')[:50]}...")
        
        try:
            # Run the graph
            result = await self.graph.ainvoke(user_input)
            
            logger.info("[AstuRouteGraph] Workflow completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"[AstuRouteGraph] Workflow error: {e}")
            return {
                "final_answer": "An error occurred while processing your request.",
                "error": str(e),
                "reasoning_stream": ["Error occurred during processing"]
            }
    
    async def stream_execute(self, user_input: Dict[str, Any]) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute the workflow with streaming output
        
        Args:
            user_input: Dictionary with user_query, latitude, longitude, mode, urgency
            
        Yields:
            State updates at each node execution
        """
        logger.info(f"[AstuRouteGraph] Streaming workflow for: {user_input.get('user_query', '')[:50]}...")
        
        try:
            # Stream the graph execution
            async for event in self.graph.astream(user_input):
                # Event is a dict with node name as key
                for node_name, state_update in event.items():
                    logger.debug(f"[AstuRouteGraph] Node '{node_name}' executed")
                    
                    # Yield reasoning updates
                    if "reasoning_stream" in state_update:
                        yield {
                            "type": "reasoning",
                            "node": node_name,
                            "data": state_update["reasoning_stream"]
                        }
                    
                    # Yield final answer when available
                    if "final_answer" in state_update:
                        # Debug logging
                        route_coords_value = state_update.get("route_coords")
                        logger.info(f"[Workflow] route_coords before streaming: {type(route_coords_value)} with {len(route_coords_value) if route_coords_value and isinstance(route_coords_value, list) else 0} waypoints")
                        if route_coords_value and isinstance(route_coords_value, list) and len(route_coords_value) > 0:
                            logger.info(f"[Workflow] First waypoint: {route_coords_value[0]}")
                        
                        # Construct the full answer object for the frontend
                        # If the node returned a dictionary with all the keys (like the updated response_composer),
                        # we should pass that through.
                        answer_payload = {
                            "final_answer": state_update.get("final_answer"),
                            "intent": state_update.get("intent"),
                            "start_coordinates": state_update.get("start_coordinates"),
                            "end_coordinates": state_update.get("end_coordinates"),
                            "distance_estimate": state_update.get("distance_estimate"),
                            "route_coords": state_update.get("route_coords"),
                            "rag_confidence": state_update.get("rag_confidence"),
                            "geo_confidence": state_update.get("geo_confidence"),
                            "sources_used": state_update.get("sources_used", []),
                            # Fallback/Aliases for robustness
                            "answer": state_update.get("final_answer") 
                        }
                        
                        yield {
                            "type": "answer",
                            "node": node_name,
                            "data": answer_payload,
                            "sources": state_update.get("sources_used", [])
                        }
                    
                    # Yield errors
                    if "error" in state_update:
                        yield {
                            "type": "error",
                            "node": node_name,
                            "data": state_update["error"]
                        }
            
            logger.info("[AstuRouteGraph] Streaming workflow completed")
            
        except Exception as e:
            logger.error(f"[AstuRouteGraph] Streaming error: {e}")
            yield {
                "type": "error",
                "node": "workflow",
                "data": str(e)
            }
