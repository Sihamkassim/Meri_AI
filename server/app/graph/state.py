"""
State schema for ASTU Route AI LangGraph workflow
"""
from typing import TypedDict, List, Dict, Optional, Literal, Any
from pydantic import BaseModel


class GraphState(TypedDict):
    """State that flows through the LangGraph workflow"""
    
    # User input
    user_query: str
    latitude: Optional[float]
    longitude: Optional[float]
    mode: Literal["walking", "taxi"]
    urgency: Literal["normal", "exam", "accessibility"]
    
    # Intent classification
    intent: Optional[Literal["NAVIGATION", "NEARBY_SERVICE", "UNIVERSITY_INFO", "MIXED"]]
    confidence: Optional[str]
    
    # RAG pipeline
    retrieved_documents: Optional[List[Dict[str, Any]]]
    rag_answer: Optional[str]
    rag_sources: Optional[List[str]]
    rag_confidence: Optional[str]
    
    # Geospatial pipeline
    route_summary: Optional[str]
    distance_estimate: Optional[str]
    route_steps: Optional[List[str]]
    geo_reasoning: Optional[List[str]]
    geo_confidence: Optional[str]
    start_coordinates: Optional[Dict[str, Any]]
    end_coordinates: Optional[Dict[str, Any]]
    
    # Nearby services
    nearby_services: Optional[List[Dict[str, Any]]]
    service_category: Optional[str]
    
    # Response composition
    final_answer: Optional[str]
    reasoning_stream: Optional[List[str]]
    sources_used: Optional[List[str]]
    
    # Error handling
    error: Optional[str]


class IntentClassification(BaseModel):
    """Intent classification response"""
    intent: Literal["NAVIGATION", "NEARBY_SERVICE", "UNIVERSITY_INFO", "MIXED"]


class RAGResponse(BaseModel):
    """RAG generation response"""
    answer: str
    sources_used: List[str]
    confidence: Literal["high", "medium", "low"]


class GeoResponse(BaseModel):
    """Geospatial reasoning response"""
    route_summary: str
    distance_estimate: str
    route_steps: List[str]
    reasoning: List[str]
    confidence: Literal["high", "medium", "low"]
