"""
app/services/rag_service.py
Retrieval-Augmented Generation service for university Q&A.
"""
from typing import AsyncGenerator, List
from app.services.interfaces import IVectorService, IAIService
from app.core.exceptions import AIServiceException
from app.core.logging_config import ai_logger


class RAGService:
    """Retrieval-Augmented Generation for knowledge-based Q&A"""
    
    def __init__(self, vector_service: IVectorService, ai_service: IAIService):
        """
        Initialize with dependencies.
        Args:
            vector_service: For retrieving relevant documents
            ai_service: For generating answers
        """
        self.vector = vector_service
        self.ai = ai_service
    
    async def answer_question(self, question: str) -> str:
        """
        Answer a question using RAG pattern.
        
        Process:
        1. Retrieve relevant documents
        2. Build context from documents
        3. Generate answer using Gemini
        """
        try:
            ai_logger.info(f"Answering question: {question}")
            
            # Retrieve relevant documents
            documents = await self.vector.search_documents(question, limit=3)
            
            # Build context
            context = self._build_context(documents)
            
            # Generate answer
            prompt = self._build_prompt(question, context)
            answer = await self.ai.generate_text(prompt)
            
            ai_logger.info(f"Answer generated (len={len(answer)})")
            return answer
            
        except Exception as e:
            raise AIServiceException(f"RAG answer generation failed: {str(e)}")
    
    async def stream_answer(self, question: str) -> AsyncGenerator[str, None]:
        """
        Stream answer token-by-token.
        
        Useful for real-time UI updates with thinking process.
        """
        try:
            ai_logger.info(f"Streaming answer to: {question}")
            
            # Retrieve documents
            documents = await self.vector.search_documents(question, limit=3)
            context = self._build_context(documents)
            
            # Stream answer
            prompt = self._build_prompt(question, context)
            async for chunk in self.ai.stream_text(prompt):
                yield chunk
            
            ai_logger.info("Answer stream completed")
            
        except Exception as e:
            raise AIServiceException(f"RAG stream failed: {str(e)}")
    
    def _build_context(self, documents: List) -> str:
        """Build context string from retrieved documents"""
        if not documents:
            return "No relevant documents found."
        
        context_parts = []
        for i, doc in enumerate(documents, 1):
            context_parts.append(
                f"Document {i} ({doc.source or 'Unknown'}):\n{doc.content}\n"
            )
        
        return "\n".join(context_parts)
    
    def _build_prompt(self, question: str, context: str) -> str:
        """Build prompt for Gemini"""
        return f"""You are a helpful assistant for Adama Science and Technology University (ASTU).
Answer the following question based on the provided context.

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:
"""
