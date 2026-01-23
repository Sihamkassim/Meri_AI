"""
app/services/vector_service.py
Vector search service using pgvector and embeddings.
"""
from typing import List
from app.services.interfaces import IVectorService, IAIService, IDatabase
from app.core.exceptions import VectorSearchError
from app.core.logging_config import vector_logger
from models import Document, POI


class VectorSearchService(IVectorService):
    """Vector semantic search using pgvector"""
    
    def __init__(self, db_service: IDatabase, ai_service: IAIService):
        """
        Initialize with dependencies.
        Args:
            db_service: Database service for vector operations
            ai_service: AI service for generating embeddings
        """
        self.db = db_service
        self.ai = ai_service
    
    async def search_documents(self, query: str, limit: int = 5) -> List[Document]:
        """
        Search knowledge base documents by semantic similarity.
        
        Process:
        1. Generate embedding for query using AI
        2. Search pgvector index in database
        3. Return top matches
        """
        try:
            vector_logger.info(f"Searching documents for: {query[:50]}...")
            
            # Generate query embedding
            query_embedding = await self.ai.generate_embedding(query)
            
            # Search database
            results = self.db.semantic_search(query_embedding, limit=limit)
            
            documents = [
                Document(
                    id=r["id"],
                    title=r["title"],
                    content=r["content"],
                    source=r.get("source"),
                    tags=r.get("tags")
                )
                for r in results
            ]
            
            vector_logger.info(f"Found {len(documents)} documents")
            return documents
            
        except Exception as e:
            raise VectorSearchError(f"Document search failed: {str(e)}")
    
    async def search_pois(self, query: str, limit: int = 10) -> List[POI]:
        """
        Search POIs by semantic relevance.
        
        Note: For MVP, uses category/tag matching.
        Future: Can be enhanced with full vector search on POI descriptions.
        """
        try:
            vector_logger.info(f"Searching POIs for: {query}")
            
            # For now, search by category keywords
            # Example: "laboratory" -> category "lab"
            keywords = query.lower().split()
            
            pois = []
            for keyword in keywords:
                # Search by category
                matching = self.db.get_pois_by_category(keyword, limit=limit)
                pois.extend([
                    POI(
                        id=p["id"],
                        name=p["name"],
                        category=p["category"],
                        latitude=p["latitude"],
                        longitude=p["longitude"],
                        description=p.get("description"),
                        tags=p.get("tags")
                    )
                    for p in matching
                ])
            
            vector_logger.info(f"Found {len(pois)} POIs")
            return pois[:limit]
            
        except Exception as e:
            raise VectorSearchError(f"POI search failed: {str(e)}")
