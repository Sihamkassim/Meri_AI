"""
Configuration management for ASTU Route AI backend.
Loads environment variables and validates required settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # Supabase Configuration
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: Optional[str] = None
    
    # Database
    database_url: str
    
    # Gemini AI Configuration
    ai_model: str = "gemini-2.5-flash"
    ai_api_key: str
    ai_stream_timeout: int = 30
    embedding_model: str = "text-embedding-004"
    
    # Voyage AI Configuration (for RAG embeddings)
    voyage_api_key: Optional[str] = None
    
    # Server Configuration
    port: int = int(os.getenv("PORT", "4000"))  # Use Render's PORT env var
    host: str = "0.0.0.0"
    node_env: str = "development"
    
    # Redis Cache (Optional)
    redis_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False  # Allow both lowercase and UPPERCASE env vars
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.node_env == "production"
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.node_env == "development"


# Global settings instance
try:
    settings = Settings()
    print("[OK] Settings loaded successfully")
except Exception as e:
    print(f"[ERROR] Error loading settings: {e}")
    raise


if __name__ == "__main__":
    # Quick validation test
    print("\n=== Configuration Check ===")
    print(f"Environment: {settings.node_env}")
    print(f"Server: {settings.host}:{settings.port}")
    print(f"Database: {settings.database_url[:50]}...")
    print(f"Supabase URL: {settings.supabase_url}")
    print(f"AI Model: {settings.ai_model}")
    print(f"Embedding Model: {settings.embedding_model}")
    print(f"Redis: {'Configured' if settings.redis_url else 'Not configured (optional)'}")
    print("✓ All required settings present!\n")
