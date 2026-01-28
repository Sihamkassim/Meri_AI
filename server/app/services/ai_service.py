"""
app/services/ai_service.py
Google Gemini AI service implementation.
"""
import httpx
import asyncio
from typing import AsyncGenerator, List
from config import settings
from app.core.exceptions import AIServiceException
from app.core.logging_config import ai_logger
from app.services.interfaces import IAIService


class GeminiAIService(IAIService):
    """Gemini AI service using Google's native API for text, Voyage AI for embeddings"""
    
    def __init__(self):
        self.api_key = settings.ai_api_key
        self.model = settings.ai_model
        self.voyage_api_key = settings.voyage_api_key  # For document embeddings
        self.voyage_poi_api_key = settings.voyage_poi_api_key  # For POI embeddings
        self.embedding_model = "voyage-2"  # Voyage AI model
        self.timeout = settings.ai_stream_timeout
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.voyage_url = "https://api.voyageai.com/v1"
        self._client = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-load async client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def close(self):
        """Close async client"""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def generate_embedding(self, text: str, use_poi_key: bool = False) -> List[float]:
        """
        Generate embedding for text using Voyage AI.
        Returns 1024-dimensional vector from voyage-2 model (optimized for RAG).
        
        Args:
            text: Text to embed
            use_poi_key: If True, uses VOYAGE_POI_API_KEY for POI embeddings
        """
        try:
            client = await self._get_client()
            
            # Select appropriate API key
            api_key = self.voyage_poi_api_key if use_poi_key else self.voyage_api_key
            
            if not api_key:
                raise AIServiceException(
                    f"{'POI' if use_poi_key else 'Document'} Voyage API key not configured"
                )
            
            response = await client.post(
                f"{self.voyage_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.embedding_model,
                    "input": text
                }
            )
            
            if response.status_code != 200:
                raise AIServiceException(
                    f"Voyage embedding generation failed: {response.text}"
                )
            
            data = response.json()
            embedding = data["data"][0]["embedding"]
            key_type = "POI" if use_poi_key else "DOC"
            ai_logger.info(f"Generated Voyage embedding [{key_type}] (dim={len(embedding)}) for text (len={len(text)})")
            return embedding
            
        except httpx.RequestError as e:
            raise AIServiceException(f"Voyage embedding request failed: {str(e)}")
    
    async def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """
        Generate text response from Gemini using native API.
        """
        try:
            client = await self._get_client()
            
            # Gemini API format: /v1beta/models/{model}:generateContent?key=API_KEY
            response = await client.post(
                f"{self.base_url}/models/{self.model}:generateContent",
                params={"key": self.api_key},
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": 2048
                    }
                }
            )
            
            # Log response details for debugging
            ai_logger.info(f"Gemini API status: {response.status_code}")
            
            if response.status_code != 200:
                error_text = response.text
                ai_logger.error(f"Gemini API error: {error_text}")
                raise AIServiceException(
                    f"Text generation failed (status {response.status_code}): {error_text}"
                )
            
            data = response.json()
            ai_logger.debug(f"Gemini response: {data}")
            
            # Check if response has candidates
            if "candidates" not in data or len(data["candidates"]) == 0:
                raise AIServiceException(
                    f"No candidates in Gemini response: {data}"
                )
            
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            ai_logger.info(f"Generated text response (len={len(text)})")
            return text
            
        except httpx.RequestError as e:
            ai_logger.error(f"HTTP request failed: {str(e)}")
            raise AIServiceException(f"Text generation request failed: {str(e)}")
        except KeyError as e:
            ai_logger.error(f"Unexpected response format: {str(e)}")
            raise AIServiceException(f"Invalid response from Gemini: {str(e)}")
        except Exception as e:
            ai_logger.error(f"Unexpected error: {str(e)}")
            raise AIServiceException(f"Text generation error: {str(e)}")
    
    async def stream_text(self, prompt: str, temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """
        Stream text response from Gemini using native streaming API.
        """
        try:
            client = await self._get_client()
            
            async with client.stream(
                "POST",
                f"{self.base_url}/models/{self.model}:streamGenerateContent",
                params={"key": self.api_key, "alt": "sse"},
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": 2048
                    }
                }
            ) as response:
                if response.status_code != 200:
                    raise AIServiceException(
                        f"Stream generation failed: {response.status_code}"
                    )
                
                import json
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            chunk = json.loads(line[6:])
                            if "candidates" in chunk and len(chunk["candidates"]) > 0:
                                content = chunk["candidates"][0].get("content", {})
                                if "parts" in content and len(content["parts"]) > 0:
                                    text = content["parts"][0].get("text", "")
                                    if text:
                                        yield text
                        except (json.JSONDecodeError, KeyError, IndexError) as e:
                            ai_logger.warning(f"Failed to parse chunk: {e}")
                            continue
                
                ai_logger.info("Stream text generation completed")
                
        except httpx.RequestError as e:
            raise AIServiceException(f"Stream request failed: {str(e)}")

            raise AIServiceException(f"Stream request failed: {str(e)}")
