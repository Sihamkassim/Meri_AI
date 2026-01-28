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
        Search POIs by semantic relevance using Voyage embeddings.
        
        Falls back to category matching if embeddings not available.
        """
        try:
            vector_logger.info(f"Searching POIs for: {query}")
            
            # Try semantic search first
            try:
                # Generate query embedding using POI-specific Voyage key
                query_embedding = await self.ai.generate_embedding(query, use_poi_key=True)
                embedding_str = f"[{','.join(map(str, query_embedding))}]"
                
                # Search with cosine similarity
                results = await self.db.execute_query("""
                    SELECT 
                        id, name, category, latitude, longitude, 
                        description, tags,
                        1 - (description_embedding <=> $1::vector) AS similarity
                    FROM pois
                    WHERE description_embedding IS NOT NULL
                    ORDER BY description_embedding <=> $1::vector
                    LIMIT $2
                """, embedding_str, limit)
                
                if results:
                    pois = [
                        POI(
                            id=r["id"],
                            name=r["name"],
                            category=r["category"],
                            latitude=r["latitude"],
                            longitude=r["longitude"],
                            description=r.get("description"),
                            tags=r.get("tags"),
                            similarity=r["similarity"]
                        )
                        for r in results
                    ]
                    vector_logger.info(f"Found {len(pois)} POIs via semantic search (best: {pois[0].similarity:.2f})")
                    return pois
                    
            except Exception as e:
                vector_logger.warning(f"Semantic POI search failed, falling back to category matching: {e}")
            
            # Fallback: category keyword matching
            keywords = query.lower().split()
            pois = []
            for keyword in keywords:
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
            
            vector_logger.info(f"Found {len(pois)} POIs via keyword matching")
            return pois[:limit]
            
        except Exception as e:
            raise VectorSearchError(f"POI search failed: {str(e)}")
