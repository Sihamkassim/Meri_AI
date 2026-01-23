"""
app/core/exceptions.py
Custom application exceptions.
"""
from typing import Optional


class AstuRouteException(Exception):
    """Base exception for ASTU Route AI"""
    
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class DatabaseException(AstuRouteException):
    """Database operation failed"""
    
    def __init__(self, message: str):
        super().__init__(message, code="DATABASE_ERROR")


class AIServiceException(AstuRouteException):
    """AI/Gemini service failed"""
    
    def __init__(self, message: str):
        super().__init__(message, code="AI_SERVICE_ERROR")


class LocationNotFound(AstuRouteException):
    """Location/POI not found"""
    
    def __init__(self, location: str):
        super().__init__(f"Location not found: {location}", code="LOCATION_NOT_FOUND")


class RouteCalculationError(AstuRouteException):
    """Route calculation failed"""
    
    def __init__(self, message: str):
        super().__init__(message, code="ROUTE_ERROR")


class VectorSearchError(AstuRouteException):
    """Vector search operation failed"""
    
    def __init__(self, message: str):
        super().__init__(message, code="VECTOR_SEARCH_ERROR")


# Aliases for backwards compatibility
AIServiceError = AIServiceException
DatabaseError = DatabaseException


class ValidationError(AstuRouteException):
    """Input validation failed"""
    
    def __init__(self, field: str, message: str):
        super().__init__(f"{field}: {message}", code="VALIDATION_ERROR")
