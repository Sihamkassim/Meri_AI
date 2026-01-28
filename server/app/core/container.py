"""
app/core/container.py
Dependency injection container using service locator pattern.
Centralizes all service creation and lifecycle management.
"""
from typing import Optional
from database import Database
from app.services.ai_service import GeminiAIService
from app.services.cache_service import RedisCacheService, MemoryCacheService
from app.services.vector_service import VectorSearchService
from app.services.routing_service import RoutingService
from app.services.rag_service import RAGService
from app.services.osm_service import OSMService
from app.graph.workflow import AstuRouteGraph


class ServiceContainer:
    """Service container for dependency injection"""
    
    def __init__(self):
        self._db: Optional[Database] = None
        self._ai: Optional[GeminiAIService] = None
        self._cache: Optional[object] = None
        self._vector: Optional[VectorSearchService] = None
        self._routing: Optional[RoutingService] = None
        self._rag: Optional[RAGService] = None
        self._osm: Optional[OSMService] = None
        self._graph: Optional[AstuRouteGraph] = None
    
    # Database Service
    def get_database(self) -> Database:
        """Get or create database service"""
        if self._db is None:
            self._db = Database()
        return self._db
    
    # AI Service
    def get_ai_service(self) -> GeminiAIService:
        """Get or create AI service"""
        if self._ai is None:
            self._ai = GeminiAIService()
        return self._ai
    
    # Cache Service
    def get_cache_service(self):
        """Get or create cache service (Redis or fallback to Memory)"""
        if self._cache is None:
            redis_cache = RedisCacheService()
            # Use Redis if available, else memory
            self._cache = redis_cache if redis_cache.available else MemoryCacheService()
        return self._cache
    
    # Vector Service
    def get_vector_service(self) -> VectorSearchService:
        """Get or create vector service"""
        if self._vector is None:
            db = self.get_database()
            ai = self.get_ai_service()
            self._vector = VectorSearchService(db, ai)
        return self._vector
    
    # Routing Service
    def get_routing_service(self) -> RoutingService:
        """Get or create routing service"""
        if self._routing is None:
            db = self.get_database()
            vector = self.get_vector_service()
            osm = self.get_osm_service()  # Inject OSM service
            self._routing = RoutingService(db, vector, osm)
        return self._routing
    
    # RAG Service
    def get_rag_service(self) -> RAGService:
        """Get or create RAG service"""
        if self._rag is None:
            vector = self.get_vector_service()
            ai = self.get_ai_service()
            self._rag = RAGService(vector, ai)
        return self._rag
    
    # OSM Service
    def get_osm_service(self) -> OSMService:
        """Get or create OSM service"""
        if self._osm is None:
            self._osm = OSMService()
        return self._osm
    
    # LangGraph Workflow
    def get_graph(self) -> AstuRouteGraph:
        """Get or create LangGraph workflow"""
        if self._graph is None:
            vector = self.get_vector_service()
            routing = self.get_routing_service()
            self._graph = AstuRouteGraph(vector, routing)
        return self._graph
    
    async def shutdown(self):
        """Clean up all services"""
        if self._db:
            self._db.disconnect()
        
        if self._ai:
            await self._ai.close()
        
        if self._cache and hasattr(self._cache, 'close'):
            await self._cache.close()
    
    def reset(self):
        """Reset all services (useful for testing)"""
        self._db = None
        self._ai = None
        self._cache = None
        self._vector = None
        self._routing = None
        self._rag = None
        self._osm = None
        self._graph = None


# Global container instance
container = ServiceContainer()
Container = ServiceContainer
