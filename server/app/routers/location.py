"""
Location streaming router for real-time position updates
Provides SSE endpoint for continuous location tracking during navigation
"""
import json
import asyncio
from typing import AsyncGenerator, Optional
from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.core.logging_config import logger
from app.core.container import Container
from app.graph.workflow import AstuRouteGraph

router = APIRouter(prefix="/api/location", tags=["Location"])


class LocationUpdate(BaseModel):
    """Location update model"""
    current_lat: float
    current_lng: float
    destination: str
    mode: str = "walking"
    urgency: str = "normal"


def get_graph() -> AstuRouteGraph:
    """Dependency to get graph instance"""
    return Container().get_graph()


@router.get(
    "/navigate/stream",
    summary="Stream Navigation with Live Location",
    description="SSE endpoint that recalculates route as user's location updates",
)
async def navigate_stream(
    current_lat: float = Query(..., description="Current latitude"),
    current_lng: float = Query(..., description="Current longitude"),
    destination: str = Query(..., description="Destination name or query"),
    mode: str = Query("walking", description="Travel mode"),
    urgency: str = Query("normal", description="Urgency level"),
    graph: AstuRouteGraph = Depends(get_graph)
) -> StreamingResponse:
    """
    Stream navigation with real-time route recalculation
    
    Client repeatedly calls this with updated GPS position
    Server calculates route and streams result
    """
    
    async def generate() -> AsyncGenerator[str, None]:
        """Generate SSE stream for navigation"""
        try:
            logger.info(f"[Navigate Stream] From ({current_lat}, {current_lng}) to '{destination}'")
            
            # Build navigation query
            query = f"How do I get to {destination}?"
            
            # Stream workflow execution
            async for event in graph.stream_execute({
                "user_query": query,
                "latitude": current_lat,
                "longitude": current_lng,
                "mode": mode,
                "urgency": urgency
            }):
                # Send reasoning updates
                if event["type"] == "reasoning":
                    for step in event["data"]:
                        yield f"data: {json.dumps({'type': 'reasoning', 'content': step})}\n\n"
                
                # Send final answer with route
                elif event["type"] == "answer":
                    yield f"data: {json.dumps({'type': 'answer', 'content': event['data'], 'sources': event.get('sources', [])})}\n\n"
                
                # Send errors
                elif event["type"] == "error":
                    yield f"data: {json.dumps({'type': 'error', 'content': event['data']})}\n\n"
            
            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except asyncio.CancelledError:
            logger.info("[Navigate Stream] Client disconnected")
        except Exception as e:
            logger.error(f"[Navigate Stream] Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post(
    "/update",
    summary="Update Current Location",
    description="Update user's current location and get route calculation"
)
async def update_location(
    latitude: float = Query(..., description="Current latitude"),
    longitude: float = Query(..., description="Current longitude"),
    destination_lat: Optional[float] = Query(None, description="Destination latitude"),
    destination_lng: Optional[float] = Query(None, description="Destination longitude"),
    destination_name: Optional[str] = Query(None, description="Destination POI name"),
    mode: str = Query("walking", description="Travel mode"),
    graph: AstuRouteGraph = Depends(get_graph)
):
    """
    Update user location and calculate route to destination
    
    Returns updated route information
    """
    try:
        if not destination_lat or not destination_lng:
            return {
                "status": "success",
                "message": "Location updated",
                "current_location": {"lat": latitude, "lng": longitude}
            }
        
        # Execute navigation query with updated location
        result = await graph.execute({
            "user_query": f"Navigate to {destination_name or 'destination'}",
            "latitude": latitude,
            "longitude": longitude,
            "mode": mode,
            "urgency": "normal",
            "intent": "NAVIGATION"  # Force navigation intent
        })
        
        return {
            "status": "success",
            "current_location": {"lat": latitude, "lng": longitude},
            "route": result.get("final_answer", {}),
            "distance_remaining": result.get("distance_estimate"),
            "route_coords": result.get("route_coords", [])
        }
        
    except Exception as e:
        logger.error(f"[Location Update] Error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
