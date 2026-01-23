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
    
    async def answer_question(self, question: str, max_sources: int = 5) -> dict:
        """
        Answer a question using RAG pattern.
        
        Process:
        1. Retrieve relevant documents
        2. Build context from documents
        3. Generate answer using Gemini
        
        Args:
            question: User's question
            max_sources: Maximum number of source documents to retrieve (default: 5)
        """
        try:
            ai_logger.info(f"Answering question: {question} (max_sources={max_sources})")
            
            # Retrieve relevant documents
            documents = await self.vector.search_documents(question, limit=max_sources)
            
            # Build context
            context = self._build_context(documents)

            # Generate answer
            prompt = self._build_prompt(question, context)
            answer_text = await self.ai.generate_text(prompt)

            # Build sources list for response (as strings for QueryResponse model)
            sources = []
            for d in documents:
                try:
                    title = getattr(d, "title", None)
                    source = getattr(d, "source", None)
                    # Format as "title (source)" or just use available field
                    if title and source:
                        sources.append(f"{title} ({source})")
                    elif title:
                        sources.append(title)
                    elif source:
                        sources.append(source)
                except Exception:
                    # Fallback if document is a dict
                    if isinstance(d, dict):
                        title = d.get("title")
                        source = d.get("source")
                        if title and source:
                            sources.append(f"{title} ({source})")
                        elif title:
                            sources.append(title)
                        elif source:
                            sources.append(source)

            ai_logger.info(f"Answer generated (len={len(answer_text)})")

            return {
                "answer": answer_text,
                "sources": sources,
                "confidence": 0.0,
                "metadata": {"context_length": len(context)}
            }
            
        except Exception as e:
            raise AIServiceException(f"RAG answer generation failed: {str(e)}")
    
    async def stream_answer(self, question: str, max_sources: int = 5) -> AsyncGenerator[str, None]:
        """
        Stream answer token-by-token.
        
        Useful for real-time UI updates with thinking process.
        
        Args:
            question: User's question
            max_sources: Maximum number of source documents to retrieve (default: 5)
        """
        try:
            ai_logger.info(f"Streaming answer to: {question} (max_sources={max_sources})")
            
            # Retrieve documents
            documents = await self.vector.search_documents(question, limit=max_sources)
            context = self._build_context(documents)
            
            # Stream answer
            prompt = self._build_prompt(question, context)
            async for chunk in self.ai.stream_text(prompt):
                # Wrap streamed chunks as structured events for SSE
                yield {"type": "token", "data": chunk}
            
            ai_logger.info("Answer stream completed")
            
        except Exception as e:
            raise AIServiceException(f"RAG stream failed: {str(e)}")

    # Backwards-compatible wrapper to match IRAGService interface
    async def answer_question_stream(self, question: str, max_sources: int = 5):
        async for ev in self.stream_answer(question, max_sources=max_sources):
            yield ev
    
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
