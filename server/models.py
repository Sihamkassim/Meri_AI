"""
Data models for ASTU Route AI.
Pydantic models for database entities and API validation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class POI(BaseModel):
    """Point of Interest (building, landmark, service)"""
    id: Optional[int] = None
    name: str
    category: str  # e.g., "building", "office", "service", "landmark", "lab", "classroom"
    latitude: float
    longitude: float
    description: Optional[str] = None
    # Detailed location information
    building: Optional[str] = None  # e.g., "Engineering Block"
    block_num: Optional[str] = None  # e.g., "A", "B", "C"
    floor: Optional[int] = None  # Floor number
    room_num: Optional[str] = None  # e.g., "201", "Lab-3"
    capacity: Optional[int] = None  # Room capacity
    facilities: Optional[List[str]] = None  # e.g., ["projector", "whiteboard"]
    tags: Optional[List[str]] = None
    osm_id: Optional[int] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Document(BaseModel):
    """University knowledge base document"""
    id: Optional[int] = None
    title: str
    content: str
    source: Optional[str] = None  # e.g., "astu-website", "handbook"
    tags: Optional[List[str]] = None
    embedding: Optional[List[float]] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RouteStep(BaseModel):
    """Step in a navigation route"""
    order: int
    instruction: str
    distance_km: float
    latitude: float
    longitude: float
    poi_name: Optional[str] = None


class Route(BaseModel):
    """Navigation route response"""
    start_name: str
    end_name: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    total_distance_km: float
    steps: List[RouteStep]
    urgency_mode: str = "normal"  # "normal", "exam", "accessibility"
    estimated_time_minutes: int
    
    class Config:
        from_attributes = True


class SSEMessage(BaseModel):
    """Server-Sent Event message"""
    event: str  # "reasoning", "step", "complete", "error"
    data: str
    
    def to_sse_format(self) -> str:
        """Format as SSE compatible string"""
        return f"event: {self.event}\ndata: {self.data}\n\n"


class NearbyService(BaseModel):
    """Nearby service response"""
    name: str
    category: str
    distance_km: float
    latitude: float
    longitude: float
    description: Optional[str] = None
    tags: Optional[List[str]] = None
