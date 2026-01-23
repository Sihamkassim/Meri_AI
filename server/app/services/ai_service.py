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
    """Gemini AI service using Google's API"""
    
    def __init__(self):
        self.api_key = settings.ai_api_key
        self.model = settings.ai_model
        self.embedding_model = settings.embedding_model
        self.timeout = settings.ai_stream_timeout
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        self._client = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-load async client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout
            )
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
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text using Gemini.
        Note: Gemini currently uses OpenAI-compatible embedding endpoint.
        """
        try:
            client = await self._get_client()
            
            response = await client.post(
                f"{self.base_url}/embeddings",
                json={
                    "model": self.embedding_model,
                    "input": text
                },
                params={"key": self.api_key}
            )
            
            if response.status_code != 200:
                raise AIServiceException(
                    f"Embedding generation failed: {response.text}"
                )
            
            data = response.json()
            embedding = data["data"][0]["embedding"]
            ai_logger.info(f"Generated embedding for text (len={len(text)})")
            return embedding
            
        except httpx.RequestError as e:
            raise AIServiceException(f"Embedding request failed: {str(e)}")
    
    async def generate_text(self, prompt: str, temperature: float = 0.7) -> str:
        """
        Generate text response from Gemini.
        """
        try:
            client = await self._get_client()
            
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "stream": False
                },
                params={"key": self.api_key}
            )
            
            if response.status_code != 200:
                raise AIServiceException(
                    f"Text generation failed: {response.text}"
                )
            
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            ai_logger.info(f"Generated text response (len={len(text)})")
            return text
            
        except httpx.RequestError as e:
            raise AIServiceException(f"Text generation request failed: {str(e)}")
    
    async def stream_text(self, prompt: str, temperature: float = 0.7) -> AsyncGenerator[str, None]:
        """
        Stream text response from Gemini token-by-token.
        """
        try:
            client = await self._get_client()
            
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "stream": True
                },
                params={"key": self.api_key}
            ) as response:
                if response.status_code != 200:
                    raise AIServiceException(
                        f"Stream generation failed: {response.status_code}"
                    )
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            import json
                            chunk = json.loads(line[6:])
                            if chunk["choices"][0]["delta"].get("content"):
                                yield chunk["choices"][0]["delta"]["content"]
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                
                ai_logger.info("Stream text generation completed")
                
        except httpx.RequestError as e:
            raise AIServiceException(f"Stream request failed: {str(e)}")
