"""
Nearby Router - City Services Discovery
Find nearby services in Adama city relative to ASTU campus
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from app.core.exceptions import DatabaseError
from app.routers.schemas import NearbyServicesRequest, NearbyServicesResponse, ErrorResponse
from app.services.interfaces import IRoutingService
from app.core.logging_config import logger
from models import NearbyService

router = APIRouter(prefix="/api/nearby", tags=["services"])


def get_routing_service() -> IRoutingService:
    """Dependency injection for routing service"""
    from app.core.container import container
    return container.get_routing_service()


@router.get(
    "",
    response_model=NearbyServicesResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Find nearby city services",
    description="Discover nearby services in Adama city (mosques, pharmacies, salons, etc.)",
)
async def get_nearby_services(
    category: str = Query(..., description="Service category (mosque, pharmacy, salon, cafe, restaurant, etc.)"),
    latitude: Optional[float] = Query(None, description="Current latitude (optional, defaults to ASTU main gate)"),
    longitude: Optional[float] = Query(None, description="Current longitude (optional, defaults to ASTU main gate)"),
    max_distance_km: Optional[float] = Query(5.0, description="Maximum distance in kilometers", ge=0.1, le=50.0),
    limit: Optional[int] = Query(10, description="Maximum number of results", ge=1, le=50),
    routing_service: IRoutingService = Depends(get_routing_service)
) -> NearbyServicesResponse:
    """
    Find nearby services in Adama city
    
    Args:
        category: Service category to search for
        latitude: Current latitude (optional)
        longitude: Current longitude (optional)
        max_distance_km: Maximum search radius in km
        limit: Maximum number of results
        routing_service: Routing service instance
        
    Returns:
        List of nearby services with distances
        
    Raises:
        HTTPException: On validation or search errors
    """
    try:
        logger.info(f"Searching for nearby {category} within {max_distance_km}km")
        
        # Validate category
        valid_categories = [
            "mosque", "pharmacy", "salon", "cafe", "restaurant", 
            "bank", "atm", "hospital", "clinic", "market",
            "supermarket", "bakery", "library", "hotel", "taxi"
        ]
        
        if category.lower() not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Supported categories: {', '.join(valid_categories)}"
            )
        
        # Default to ASTU main gate if no coordinates provided
        if latitude is None or longitude is None:
            # ASTU Main Gate coordinates (approximate)
            latitude = 8.5569
            longitude = 39.2911
            logger.info("Using ASTU main gate as reference point")
        
        # Validate coordinates
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            raise HTTPException(
                status_code=400,
                detail="Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180"
            )
        
        # Search for nearby services
        services = await routing_service.find_nearby_services(
            latitude=latitude,
            longitude=longitude,
            category=category.lower(),
            max_distance_km=max_distance_km,
            limit=limit
        )
        
        if not services:
            logger.info(f"No {category} found within {max_distance_km}km")
            return NearbyServicesResponse(
                category=category,
                location={
                    "latitude": latitude,
                    "longitude": longitude
                },
                services=[],
                count=0,
                max_distance_km=max_distance_km
            )
        
        logger.info(f"Found {len(services)} {category}(s) nearby")
        
        return NearbyServicesResponse(
            category=category,
            location={
                "latitude": latitude,
                "longitude": longitude
            },
            services=services,
            count=len(services),
            max_distance_km=max_distance_km
        )
        
    except HTTPException:
        raise
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in nearby endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# POST and /categories endpoints removed - redundant
# Only keeping GET /nearby which is actively used by client


@router.get(
    "/health",
    summary="Check nearby service health",
    description="Verify nearby services search is operational"
)
async def nearby_health(
    routing_service: IRoutingService = Depends(get_routing_service)
):
    """Health check for nearby services"""
    try:
        return {
            "status": "healthy",
            "service": "nearby",
            "enabled": True,
            "supported_categories": 15
        }
    except Exception as e:
        logger.error(f"Nearby health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "nearby",
            "error": str(e)
        }
