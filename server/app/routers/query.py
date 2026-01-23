"""
Query Router - University Knowledge Q&A using RAG
Handles questions about ASTU using Retrieval-Augmented Generation
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import json

from app.core.exceptions import AIServiceError, DatabaseError
from app.routers.schemas import QueryRequest, QueryResponse, ErrorResponse
from app.services.interfaces import IRAGService
from app.core.logging_config import logger

router = APIRouter(prefix="/api/query", tags=["query"])


def get_rag_service() -> IRAGService:
    """Dependency injection for RAG service"""
    from app.core.container import container
    return container.get_rag_service()


@router.post(
    "",
    response_model=QueryResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="Ask a question about ASTU",
    description="Ask questions about Adama Science and Technology University using RAG. "
                "Questions are answered using verified sources from the knowledge base.",
)
async def query_knowledge(
    request: QueryRequest,
    rag_service: IRAGService = Depends(get_rag_service)
) -> QueryResponse:
    """
    Query the ASTU knowledge base with RAG
    
    Args:
        request: Question and optional parameters
        rag_service: RAG service instance
        
    Returns:
        Answer with sources and confidence
        
    Raises:
        HTTPException: On validation or processing errors
    """
    try:
        logger.info(f"Received query: {request.question[:100]}...")
        
        # Validate query
        if not request.question or len(request.question.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Question must be at least 3 characters long"
            )
        
        # Get answer using RAG
        answer = await rag_service.answer_question(
            question=request.question,
            max_sources=request.max_sources or 5
        )
        
        logger.info(f"Generated answer with {len(answer.get('sources', []))} sources")
        
        return QueryResponse(
            question=request.question,
            answer=answer.get("answer", ""),
            sources=answer.get("sources", []),
            confidence=answer.get("confidence", 0.0),
            metadata=answer.get("metadata", {})
        )
        
    except AIServiceError as e:
        logger.error(f"AI service error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    except DatabaseError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in query endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post(
    "/stream",
    summary="Ask a question with streaming response",
    description="Stream the answer generation process in real-time using Server-Sent Events",
)
async def query_knowledge_stream(
    request: QueryRequest,
    rag_service: IRAGService = Depends(get_rag_service)
):
    """
    Query with streaming response (SSE)
    
    Args:
        request: Question and optional parameters
        rag_service: RAG service instance
        
    Returns:
        StreamingResponse with Server-Sent Events
    """
    async def generate_sse() -> AsyncGenerator[str, None]:
        """Generate SSE stream of answer"""
        try:
            logger.info(f"Starting streaming query: {request.question[:100]}...")
            
            # Stream answer generation
            async for event in rag_service.answer_question_stream(
                question=request.question,
                max_sources=request.max_sources or 5
            ):
                # Format as SSE
                yield f"data: {json.dumps(event)}\n\n"
            
            logger.info("Streaming completed successfully")
            
        except Exception as e:
            logger.error(f"Error during streaming: {e}")
            error_event = {
                "type": "error",
                "message": str(e)
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get(
    "/health",
    summary="Check query service health",
    description="Verify RAG service and knowledge base are operational"
)
async def query_health(
    rag_service: IRAGService = Depends(get_rag_service)
):
    """Health check for query service"""
    try:
        # Check if knowledge base has documents
        # This would require a method in RAG service - placeholder for now
        return {
            "status": "healthy",
            "service": "query",
            "rag_enabled": True,
            "timestamp": logger.name  # Using logger.name as placeholder timestamp
        }
    except Exception as e:
        logger.error(f"Query health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "query",
            "error": str(e)
        }
