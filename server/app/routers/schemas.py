"""
app/routers/schemas.py
Request and response schemas for API.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


class QueryRequest(BaseModel):
    """University Q&A query request"""
    question: str = Field(..., description="Question about ASTU")
    stream: bool = Field(default=False, description="Stream response token-by-token")


class QueryResponse(BaseModel):
    """Q&A response"""
    question: str
    answer: str
    sources: Optional[List[str]] = None


class RouteRequest(BaseModel):
    """Navigation route request"""
    start: str = Field(..., description="Starting location name")
    end: str = Field(..., description="Destination location name")
    urgency: str = Field(default="normal", description="normal | exam | accessibility")


class RouteStepResponse(BaseModel):
    """Single route step"""
    order: int
    instruction: str
    distance_km: float
    latitude: float
    longitude: float
    poi_name: Optional[str] = None


class RouteResponse(BaseModel):
    """Route response"""
    start_name: str
    end_name: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    total_distance_km: float
    steps: List[RouteStepResponse]
    urgency_mode: str
    estimated_time_minutes: int


class NearbyServicesRequest(BaseModel):
    """Nearby services search request"""
    latitude: float = Field(..., description="User's latitude")
    longitude: float = Field(..., description="User's longitude")
    service_type: str = Field(..., description="Service category: mosque, pharmacy, salon, etc.")
    radius_km: float = Field(default=5.0, description="Search radius in kilometers")


class NearbyServiceResponse(BaseModel):
    """Single nearby service"""
    name: str
    category: str
    distance_km: float
    latitude: float
    longitude: float
    description: Optional[str] = None


class NearbyServicesResponse(BaseModel):
    """Nearby services search response"""
    category: str
    location: dict
    services: List[NearbyServiceResponse]
    count: int
    max_distance_km: float


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    code: str
    detail: Optional[str] = None
