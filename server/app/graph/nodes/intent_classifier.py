"""
Node 2: Intent Classifier Node
Classifies user query into NAVIGATION, NEARBY_SERVICE, UNIVERSITY_INFO, or MIXED
"""
import json
from typing import Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import GraphState, IntentClassification
from app.graph.prompts.templates import (
    INTENT_CLASSIFIER_SYSTEM,
    INTENT_CLASSIFIER_USER,
    MODEL_CONFIGS
)
from app.core.logging_config import logger
from config import settings


async def intent_classifier_node(state: GraphState) -> Dict[str, Any]:
    """
    Classify user query into a single intent
    
    Args:
        state: Current graph state
        
    Returns:
        Updated state with intent classification
    """
    logger.info("[IntentClassifierNode] Classifying user intent...")
    
    # Initialize LLM with temperature 0.0 for deterministic classification
    llm = ChatGoogleGenerativeAI(
        model=MODEL_CONFIGS["intent_classifier"]["model"],
        temperature=MODEL_CONFIGS["intent_classifier"]["temperature"],
        google_api_key=settings.ai_api_key
    )
    
    # Prepare messages
    user_prompt = INTENT_CLASSIFIER_USER.format(user_query=state["user_query"])
    messages = [
        SystemMessage(content=INTENT_CLASSIFIER_SYSTEM),
        HumanMessage(content=user_prompt)
    ]
    
    try:
        # Get classification
        response = await llm.ainvoke(messages)
        content = response.content
        
        # Parse JSON response
        if isinstance(content, str):
            # Remove markdown code blocks if present
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
        classification = IntentClassification(**result)
        intent = classification.intent
        
        logger.info(f"[IntentClassifierNode] Classified as: {intent}")
        
        # Update reasoning stream
        reasoning_stream = state.get("reasoning_stream", [])
        if intent == "NAVIGATION":
            reasoning_stream.append("Detected navigation request inside ASTU campus")
        elif intent == "NEARBY_SERVICE":
            reasoning_stream.append("Detected nearby service discovery request")
        elif intent == "UNIVERSITY_INFO":
            reasoning_stream.append("Searching ASTU knowledge base")
        elif intent == "MIXED":
            reasoning_stream.append("Detected combined navigation and information request")
        
        return {
            "intent": intent,
            "confidence": "high",
            "reasoning_stream": reasoning_stream
        }
        
    except Exception as e:
        logger.error(f"[IntentClassifierNode] Error: {e}")
        # Default to UNIVERSITY_INFO on error
        return {
            "intent": "UNIVERSITY_INFO",
            "confidence": "low",
            "error": str(e)
        }
