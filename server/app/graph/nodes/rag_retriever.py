"""
Node 4: RAG Retriever Node
Retrieves verified ASTU knowledge from vector database
"""
from typing import Dict, Any
from app.graph.state import GraphState
from app.services.interfaces import IVectorService
from app.core.logging_config import logger


async def rag_retriever_node(state: GraphState, vector_service: IVectorService) -> Dict[str, Any]:
    """
    Retrieve verified ASTU documents using semantic search
    
    Args:
        state: Current graph state
        vector_service: Vector search service
        
    Returns:
        Updated state with retrieved documents
    """
    logger.info("[RAG_RetrieverNode] Retrieving ASTU knowledge...")
    
    user_query = state["user_query"]
    
    try:
        # Semantic search for relevant documents
        results = await vector_service.search(
            query=user_query,
            top_k=5,
            threshold=0.7
        )
        
        if not results:
            logger.warning("[RAG_RetrieverNode] No documents found")
            return {
                "retrieved_documents": [],
                "reasoning_stream": state.get("reasoning_stream", []) + ["No verified information found"]
            }
        
        # Format retrieved documents
        documents = []
        for idx, result in enumerate(results, 1):
            documents.append({
                "source_id": f"source_{idx}",
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {}),
                "similarity": result.get("similarity", 0.0)
            })
        
        logger.info(f"[RAG_RetrieverNode] Retrieved {len(documents)} documents")
        
        reasoning_stream = state.get("reasoning_stream", [])
        reasoning_stream.append(f"Found {len(documents)} relevant ASTU documents")
        
        return {
            "retrieved_documents": documents,
            "reasoning_stream": reasoning_stream
        }
        
    except Exception as e:
        logger.error(f"[RAG_RetrieverNode] Error: {e}")
        return {
            "retrieved_documents": [],
            "error": f"Retrieval failed: {str(e)}"
        }
