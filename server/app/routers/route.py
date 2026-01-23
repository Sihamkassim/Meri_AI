"""
Route Router - Campus Navigation with AI Reasoning
Provides intelligent routing within ASTU campus with streaming reasoning
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Optional
import json

from app.core.exceptions import AIServiceError, DatabaseError
from app.routers.schemas import RouteRequest, RouteResponse, ErrorResponse
from app.services.interfaces import IRoutingService, IAIService
from app.core.logging_config import logger
from models import SSEMessage

router = APIRouter(prefix="/api/route", tags=["navigation"])


def get_routing_service() -> IRoutingService:
    """Dependency injection for routing service"""
    from app.core.container import container
    return container.get_routing_service()


def get_ai_service() -> IAIService:
    """Dependency injection for AI service"""
    from app.core.container import container
    return container.get_ai_service()


@router.post(
    "",
    response_model=RouteResponse,
    responses={
        400: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Get route between two locations",
    description="Calculate route between origin and destination within ASTU campus",
)
async def get_route(
    request: RouteRequest,
    routing_service: IRoutingService = Depends(get_routing_service)
) -> RouteResponse:
    """
    Get route between two locations
    
    Args:
        request: Origin, destination, and routing preferences
        routing_service: Routing service instance
        
    Returns:
        Route with steps, distance, and duration
        
    Raises:
        HTTPException: On validation or routing errors
    """
    try:
        logger.info(f"Route request: {request.origin} -> {request.destination}")
        
        # Validate input
        if not request.origin or not request.destination:
            raise HTTPException(
                status_code=400,
                detail="Both origin and destination are required"
            )
        
        if request.origin == request.destination:
            raise HTTPException(
                status_code=400,
                detail="Origin and destination cannot be the same"
            )
        
        # Generate route
        route = await routing_service.get_route(
            origin=request.origin,
            destination=request.destination,
            mode=request.mode or "walking",
            urgency=request.urgency
        )
        
        if not route:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find route from {request.origin} to {request.destination}"
            )
        
        logger.info(f"Route generated: {route.distance_meters}m, {route.duration_minutes}min")
        
        return RouteResponse(
            origin=request.origin,
            destination=request.destination,
            route=route,
            metadata={
                "mode": request.mode or "walking",
                "urgency": request.urgency or "normal"
            }
        )
        
    except HTTPException:
        raise
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in route endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get(
    "/stream",
    summary="Get route with AI reasoning stream",
    description="Stream AI reasoning process while calculating route using Server-Sent Events",
)
async def get_route_stream(
    origin: str = Query(..., description="Starting location (name or coordinates)"),
    destination: str = Query(..., description="Destination location (name or coordinates)"),
    mode: Optional[str] = Query("walking", description="Transportation mode"),
    urgency: Optional[str] = Query("normal", description="Urgency level (normal, exam, accessibility)"),
    routing_service: IRoutingService = Depends(get_routing_service),
    ai_service: IAIService = Depends(get_ai_service)
):
    """
    Get route with streaming AI reasoning (SSE)
    
    Args:
        origin: Starting location
        destination: Destination location
        mode: Transportation mode
        urgency: Urgency level
        routing_service: Routing service instance
        ai_service: AI service instance
        
    Returns:
        StreamingResponse with Server-Sent Events showing reasoning process
    """
    async def generate_reasoning_stream() -> AsyncGenerator[str, None]:
        """Generate SSE stream with AI reasoning and route"""
        try:
            logger.info(f"Streaming route: {origin} -> {destination}")
            
            # Step 1: Announce start
            yield SSEMessage.format(
                event_type="reasoning",
                message=f"🔍 Planning route from {origin} to {destination}..."
            )
            
            # Step 2: Location lookup
            yield SSEMessage.format(
                event_type="reasoning",
                message=f"📍 Looking up location coordinates..."
            )
            
            # Step 3: Generate route
            route = await routing_service.get_route(
                origin=origin,
                destination=destination,
                mode=mode,
                urgency=urgency
            )
            
            if not route:
                yield SSEMessage.format(
                    event_type="error",
                    message=f"❌ Could not find route between these locations"
                )
                return
            
            # Step 4: Analyze route
            yield SSEMessage.format(
                event_type="reasoning",
                message=f"🧭 Route found: {route.distance_meters}m, estimated {route.duration_minutes} minutes"
            )
            
            # Step 5: Consider urgency
            if urgency == "exam":
                yield SSEMessage.format(
                    event_type="reasoning",
                    message="⚡ Exam mode: Selecting fastest route..."
                )
            elif urgency == "accessibility":
                yield SSEMessage.format(
                    event_type="reasoning",
                    message="♿ Accessibility mode: Avoiding stairs and steep paths..."
                )
            
            # Step 6: Generate AI explanation
            explanation_prompt = f"""Explain this campus route in a friendly, concise way:
From: {origin}
To: {destination}
Distance: {route.distance_meters} meters
Duration: {route.duration_minutes} minutes
Mode: {mode}

Provide helpful tips for navigating ASTU campus. Keep it under 100 words."""
            
            yield SSEMessage.format(
                event_type="reasoning",
                message="🤖 Generating helpful navigation tips..."
            )
            
            # Stream AI explanation
            explanation_text = ""
            async for chunk in ai_service.generate_stream(
                prompt=explanation_prompt,
                temperature=0.7
            ):
                explanation_text += chunk
                yield SSEMessage.format(
                    event_type="explanation",
                    message=chunk
                )
            
            # Step 7: Send final route data
            route_data = {
                "origin": origin,
                "destination": destination,
                "distance_meters": route.distance_meters,
                "duration_minutes": route.duration_minutes,
                "steps": [step.dict() for step in route.steps],
                "explanation": explanation_text
            }
            
            yield SSEMessage.format(
                event_type="route",
                data=route_data
            )
            
            # Step 8: Complete
            yield SSEMessage.format(
                event_type="complete",
                message="✅ Route planning complete!"
            )
            
            logger.info("Streaming route completed successfully")
            
        except Exception as e:
            logger.error(f"Error during route streaming: {e}")
            yield SSEMessage.format(
                event_type="error",
                message=f"Error: {str(e)}"
            )
    
    return StreamingResponse(
        generate_reasoning_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get(
    "/health",
    summary="Check routing service health",
    description="Verify routing service and POI database are operational"
)
async def route_health(
    routing_service: IRoutingService = Depends(get_routing_service)
):
    """Health check for routing service"""
    try:
        return {
            "status": "healthy",
            "service": "routing",
            "enabled": True
        }
    except Exception as e:
        logger.error(f"Route health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "routing",
            "error": str(e)
        }
