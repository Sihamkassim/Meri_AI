"""
app/services/cache_service.py
Redis-based caching service.
"""
import json
from typing import Optional, Any
from app.services.interfaces import ICacheService
from app.core.logging_config import logger
from config import settings

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class RedisCacheService(ICacheService):
    """Redis caching service with TTL support"""
    
    def __init__(self):
        self.redis_url = settings.redis_url
        self._client = None
        self.available = REDIS_AVAILABLE and self.redis_url is not None
    
    async def _get_client(self):
        """Lazy-load Redis client"""
        if not self.available:
            logger.warning("Redis not configured, caching disabled")
            return None
        
        if self._client is None:
            try:
                self._client = await aioredis.from_url(
                    self.redis_url,
                    encoding="utf8",
                    decode_responses=True
                )
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.available = False
                return None
        
        return self._client
    
    async def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value"""
        if not self.available:
            return None
        
        try:
            client = await self._get_client()
            if not client:
                return None
            
            value = await client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed for {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """Store value with TTL"""
        if not self.available:
            return False
        
        try:
            client = await self._get_client()
            if not client:
                return False
            
            await client.setex(
                key,
                ttl_seconds,
                json.dumps(value)
            )
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete cached value"""
        if not self.available:
            return False
        
        try:
            client = await self._get_client()
            if not client:
                return False
            
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.available:
            return False
        
        try:
            client = await self._get_client()
            if not client:
                return False
            
            return await client.exists(key) > 0
        except Exception as e:
            logger.warning(f"Cache exists check failed for {key}: {e}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            self._client = None


class MemoryCacheService(ICacheService):
    """In-memory cache (fallback when Redis unavailable)"""
    
    def __init__(self):
        self._cache: dict = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value"""
        return self._cache.get(key)
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        """Store value (TTL ignored in memory cache)"""
        self._cache[key] = value
        return True
    
    async def delete(self, key: str) -> bool:
        """Delete cached value"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        return key in self._cache
    
    async def close(self):
        """Clear cache"""
        self._cache.clear()
