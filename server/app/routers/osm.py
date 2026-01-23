"""
OSM Router - OpenStreetMap route calculation
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.osm_service import OSMService
from app.core.logging_config import logger

router = APIRouter(prefix="/api/osm", tags=["OSM"])


class RouteRequest(BaseModel):
    """OSM route request"""
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    mode: Optional[str] = "walking"


def get_osm_service() -> OSMService:
    """Get OSM service instance"""
    from app.core.container import container
    return container.get_osm_service()


@router.post("/route", summary="Calculate OSM Route")
async def calculate_osm_route(
    request: RouteRequest,
    osm: OSMService = Depends(get_osm_service)
):
    """
    Calculate real route using OpenStreetMap data
    
    Args:
        request: Route request with start/end coordinates
        osm: OSM service instance
        
    Returns:
        Route with distance, duration, and turn-by-turn instructions
    """
    logger.info(f"[OSM Route] Calculating from ({request.start_lat}, {request.start_lng}) to ({request.end_lat}, {request.end_lng})")
    
    try:
        result = osm.get_route(
            request.start_lat,
            request.start_lng,
            request.end_lat,
            request.end_lng,
            request.mode
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Route not found")
        
        return result
        
    except Exception as e:
        logger.error(f"[OSM Route] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="OSM Graph Stats")
async def get_osm_stats(osm: OSMService = Depends(get_osm_service)):
    """Get OSM campus graph statistics"""
    return osm.get_campus_stats()
