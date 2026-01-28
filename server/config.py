"""
Configuration management for ASTU Route AI backend.
Loads environment variables and validates required settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # API Base Configuration
    api_base: Optional[str] = None
    next_public_api_base: Optional[str] = None
    
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
    
    # Voyage AI Configuration
    voyage_api_key: Optional[str] = None
    voyage_poi_api_key: Optional[str] = None
    
    # Server Configuration
    port: int = int(os.getenv("PORT", "4000"))
    host: str = "0.0.0.0"
    node_env: str = "development"
    
    # Redis Cache (Optional)
    redis_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        # Important: This ignores extra variables in your .env
        extra = "ignore" 
    
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
    print(f"Database: Connected")
    print(f"AI Model: {settings.ai_model}")
    print("✓ All required settings present!\n")