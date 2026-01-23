"""
Unified AI Router using LangGraph workflow
Handles all user queries through intelligent 7-node system
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
from pydantic import BaseModel
import json

from app.graph.workflow import AstuRouteGraph
from app.core.logging_config import logger
from app.routers.schemas import ErrorResponse


router = APIRouter(prefix="/api/ai", tags=["AI"])


# Request/Response Models
class AIQueryRequest(BaseModel):
    """Unified AI query request"""
    query: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    mode: Optional[str] = "walking"
    urgency: Optional[str] = "normal"


class AIQueryResponse(BaseModel):
    """Unified AI query response"""
    answer: str
    intent: str
    confidence: str
    sources: list[str] = []
    reasoning_steps: list[str] = []


# Dependency injection
def get_graph() -> AstuRouteGraph:
    """Get LangGraph workflow instance"""
    from app.core.container import container
    return container.get_graph()


@router.post(
    "/query",
    response_model=AIQueryResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Unified AI Query",
    description="Ask any question - navigation, nearby services, or ASTU information. "
                "The system automatically routes to the appropriate pipeline using LangGraph.",
)
async def ai_query(
    request: AIQueryRequest,
    graph: AstuRouteGraph = Depends(get_graph)
) -> AIQueryResponse:
    """
    Unified AI query endpoint using LangGraph workflow
    
    Automatically handles:
    - Campus navigation (NAVIGATION intent)
    - Nearby service discovery (NEARBY_SERVICE intent)
    - ASTU knowledge questions (UNIVERSITY_INFO intent)
    - Mixed queries (MIXED intent)
    
    Args:
        request: User query with optional location and context
        graph: LangGraph workflow instance
        
    Returns:
        AI-generated response with reasoning
    """
    logger.info(f"[AI Query] Received: {request.query[:100]}...")
    
    try:
        # Execute LangGraph workflow
        result = await graph.execute({
            "user_query": request.query,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "mode": request.mode,
            "urgency": request.urgency
        })
        
        # Extract response
        return AIQueryResponse(
            answer=result.get("final_answer", "Unable to process request"),
            intent=result.get("intent", "UNKNOWN"),
            confidence=result.get("rag_confidence") or result.get("geo_confidence", "medium"),
            sources=result.get("sources_used", []),
            reasoning_steps=result.get("reasoning_stream", [])
        )
        
    except Exception as e:
        logger.error(f"[AI Query] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/query/stream",
    summary="Streaming AI Query",
    description="Same as /query but with Server-Sent Events streaming for real-time reasoning visibility",
)
async def ai_query_stream(
    request: AIQueryRequest,
    graph: AstuRouteGraph = Depends(get_graph)
) -> StreamingResponse:
    """
    Streaming AI query with real-time reasoning updates
    
    Streams reasoning steps as they happen using SSE
    """
    logger.info(f"[AI Query Stream] Received: {request.query[:100]}...")
    
    async def generate() -> AsyncGenerator[str, None]:
        """Generate SSE stream"""
        try:
            # Stream workflow execution
            async for event in graph.stream_execute({
                "user_query": request.query,
                "latitude": request.latitude,
                "longitude": request.longitude,
                "mode": request.mode,
                "urgency": request.urgency
            }):
                # Send reasoning updates
                if event["type"] == "reasoning":
                    for step in event["data"]:
                        yield f"data: {json.dumps({'type': 'reasoning', 'content': step})}\n\n"
                
                # Send final answer
                elif event["type"] == "answer":
                    yield f"data: {json.dumps({'type': 'answer', 'content': event['data'], 'sources': event.get('sources', [])})}\n\n"
                
                # Send errors
                elif event["type"] == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': event['data']})}\n\n"
            
            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"[AI Query Stream] Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get(
    "/health",
    summary="Check AI service health",
    description="Verify LangGraph workflow is operational"
)
async def ai_health(graph: AstuRouteGraph = Depends(get_graph)):
    """Health check for AI service"""
    return {
        "status": "healthy",
        "service": "LangGraph AI Pipeline",
        "nodes": [
            "UserInputNode",
            "IntentClassifierNode",
            "RoutingDecisionNode",
            "RAG_RetrieverNode",
            "RAG_GeneratorNode",
            "GeoReasoningNode",
            "ResponseComposerNode"
        ],
        "enabled": True
    }
