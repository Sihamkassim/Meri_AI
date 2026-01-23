"""
app/services/interfaces.py
Abstract service interfaces (contracts).
Defines the contract that all implementations must follow.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, AsyncGenerator
from models import POI, Document


class IDatabase(ABC):
    """Abstract database interface"""
    
    @abstractmethod
    def connect(self) -> Any:
        """Establish database connection"""
        pass
    
    @abstractmethod
    def disconnect(self) -> None:
        """Close database connection"""
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """Test connectivity"""
        pass
    
    @abstractmethod
    def insert_poi(self, poi: POI) -> int:
        """Insert POI and return ID"""
        pass
    
    @abstractmethod
    def get_pois_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Fetch POIs by category"""
        pass
    
    @abstractmethod
    def get_nearby_pois(self, latitude: float, longitude: float, 
                       radius_km: float = 5, limit: int = 10) -> List[Dict]:
        """Find POIs near location"""
        pass
    
    @abstractmethod
    def insert_document(self, doc: Document) -> int:
        """Store document with embedding"""
        pass
    
    @abstractmethod
    def semantic_search(self, query_embedding: List[float], 
                       limit: int = 5, threshold: float = 0.5) -> List[Dict]:
        """Vector similarity search"""
        pass


class IAIService(ABC):
    """Abstract AI service interface"""
    
    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate text embedding"""
        pass
    
    @abstractmethod
    async def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """Generate text response"""
        pass
    
    @abstractmethod
    async def stream_text(self, prompt: str, temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """Stream text response token-by-token"""
        pass


class IVectorService(ABC):
    """Abstract vector search service"""
    
    @abstractmethod
    async def search_documents(self, query: str, limit: int = 5) -> List[Document]:
        """Search knowledge base by semantic similarity"""
        pass
    
    @abstractmethod
    async def search_pois(self, query: str, limit: int = 10) -> List[POI]:
        """Search POIs by semantic relevance"""
        pass


class IRoutingService(ABC):
    """Abstract routing/navigation service"""
    
    @abstractmethod
    async def find_route(self, start_name: str, end_name: str, 
                        urgency: str = "normal") -> Dict[str, Any]:
        """Calculate route between two locations"""
        pass
    
    @abstractmethod
    async def find_nearby_services(self, latitude: float, longitude: float,
                                   service_type: str, radius_km: float = 5) -> List[Dict]:
        """Find nearby services by type"""
        pass


class ICacheService(ABC):
    """Abstract cache service"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value"""
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """Store value with TTL"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete cached value"""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        pass


class IRAGService(ABC):
    """Abstract RAG (Retrieval-Augmented Generation) service"""
    
    @abstractmethod
    async def answer_question(self, question: str, max_sources: int = 5) -> Dict[str, Any]:
        """Answer question using RAG"""
        pass
    
    @abstractmethod
    async def answer_question_stream(self, question: str, max_sources: int = 5):
        """Stream answer generation"""
        pass
