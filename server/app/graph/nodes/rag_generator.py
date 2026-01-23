"""
Node 5: RAG Generator Node
Generates grounded answers using only retrieved documents
"""
import json
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import GraphState, RAGResponse
from app.graph.prompts.templates import (
    RAG_SYSTEM_PROMPT,
    RAG_USER_PROMPT,
    RAG_NO_ANSWER,
    MODEL_CONFIGS
)
from app.core.logging_config import logger
from config import settings


async def rag_generator_node(state: GraphState) -> Dict[str, Any]:
    """
    Generate grounded answer using only retrieved documents
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with RAG answer
    """
    logger.info("[RAG_GeneratorNode] Generating answer from sources...")
    
    retrieved_documents = state.get("retrieved_documents", [])
    
    # If no documents, return fallback
    if not retrieved_documents:
        logger.warning("[RAG_GeneratorNode] No documents to generate from")
        return {
            "rag_answer": RAG_NO_ANSWER["answer"],
            "rag_sources": RAG_NO_ANSWER["sources_used"],
            "rag_confidence": RAG_NO_ANSWER["confidence"],
            "reasoning_stream": state.get("reasoning_stream", []) + ["Unable to provide verified answer"]
        }
    
    # Initialize LLM with low temperature for accuracy
    llm = ChatGoogleGenerativeAI(
        model=MODEL_CONFIGS["rag_generator"]["model"],
        temperature=MODEL_CONFIGS["rag_generator"]["temperature"],
        google_api_key=settings.ai_api_key
    )
    
    # Format retrieved documents
    docs_text = "\n\n".join([
        f"[{doc['source_id']}] {doc['content']}"
        for doc in retrieved_documents
    ])
    
    # Prepare messages
    user_prompt = RAG_USER_PROMPT.format(
        user_query=state["user_query"],
        retrieved_documents=docs_text
    )
    messages = [
        SystemMessage(content=RAG_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt)
    ]
    
    try:
        # Generate answer
        response = await llm.ainvoke(messages)
        content = response.content
        
        # Parse JSON response
        if isinstance(content, str):
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            result = json.loads(content)
        else:
            result = content
        
        # Validate with Pydantic
        rag_response = RAGResponse(**result)
        
        logger.info(f"[RAG_GeneratorNode] Generated answer with {rag_response.confidence} confidence")
        
        reasoning_stream = state.get("reasoning_stream", [])
        reasoning_stream.append("Generated answer from verified ASTU sources")
        
        return {
            "rag_answer": rag_response.answer,
            "rag_sources": rag_response.sources_used,
            "rag_confidence": rag_response.confidence,
            "reasoning_stream": reasoning_stream
        }
        
    except Exception as e:
        logger.error(f"[RAG_GeneratorNode] Error: {e}")
        return {
            "rag_answer": RAG_NO_ANSWER["answer"],
            "rag_sources": RAG_NO_ANSWER["sources_used"],
            "rag_confidence": "low",
            "error": f"Generation failed: {str(e)}"
        }
