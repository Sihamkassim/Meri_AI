"""
main.py
ASTU Route AI FastAPI application entry point.

Clean architecture with:
- Dependency injection container
- Service layer abstraction
- Exception handling
- CORS and middleware setup
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.responses import JSONResponse
from contextlib import asynccontextmanager
from config import settings
from app.core.logging_config import logger, setup_logging
from app.core.exceptions import AstuRouteException
from app.core.container import container
from app.routers import health, query, route, nearby, ai, osm, map as map_router, location
import logging

# Setup logging
setup_logging("astu", logging.INFO if settings.is_production() else logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("=== ASTU Route AI Starting ===")
    logger.info(f"Environment: {settings.node_env}")
    logger.info(f"Server: {settings.host}:{settings.port}")
    
    # Initialize database
    try:
        db = container.get_database()
        if db.test_connection():
            logger.info("✓ Database connected")
        else:
            logger.warning("⚠ Database connection warning")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
    
    # Initialize AI service
    try:
        ai = container.get_ai_service()
        logger.info(f"✓ AI service ready: {ai.model}")
    except Exception as e:
        logger.error(f"✗ AI service initialization failed: {e}")
    
    # Initialize cache
    try:
        cache = container.get_cache_service()
        logger.info(f"✓ Cache service ready: {type(cache).__name__}")
    except Exception as e:
        logger.error(f"✗ Cache service initialization failed: {e}")
    
    # Preload OSM graph
    try:
        from app.services.osm_service import OSMService
        osm_service = OSMService()
        logger.info("⏳ Loading OSM campus graph...")
        osm_service.load_campus_graph()
        logger.info("✓ OSM graph loaded successfully")
    except Exception as e:
        logger.warning(f"⚠ OSM graph preload failed (will lazy load): {e}")
    
    logger.info("=== Startup Complete ===\\n")
    
    yield
    
    # Shutdown
    logger.info("Shutting down services...")
    await container.shutdown()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="ASTU Route AI",
    description="AI-powered campus navigation and knowledge system for Adama Science and Technology University",
    version="0.1.0",
    docs_url="/api/docs" if settings.is_development() else None,
    redoc_url="/api/redoc" if settings.is_development() else None,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development() else ["https://astu-route-ai.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AstuRouteException)
async def astu_exception_handler(request, exc: AstuRouteException):
    """Handle custom application exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.message,
            "code": exc.code,
            "path": str(request.url)
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "code": "VALIDATION_ERROR",
            "details": str(exc)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "code": "INTERNAL_ERROR"
        }
    )


# Include routers
from app.routers import health, query, route, nearby, ai, osm, admin

app.include_router(health.router)
app.include_router(admin.router)  # Admin dashboard APIs
app.include_router(ai.router)  # New LangGraph-based unified router
app.include_router(location.router)  # Location tracking SSE
app.include_router(osm.router)  # OSM routing
app.include_router(query.router)
app.include_router(route.router)
app.include_router(nearby.router)
app.include_router(map_router.router)  # New campus map router

# Mount static files (admin dashboard) - only if directory exists
import os
from pathlib import Path
@app.get("/", response_class=JSONResponse)
async def root():
    """Return a simple JSON welcome page at the root route."""
    return JSONResponse(status_code=200, content={
        "message": "Welcome to ASTU Route AI",
        "status": "ok",
        "api_version": "0.1.0",
        "admin": "/admin"
    })

public_dir = Path("public")
if public_dir.exists() and public_dir.is_dir():
    # Serve the admin UI from /admin instead of root
    app.mount("/admin", StaticFiles(directory="public", html=True), name="admin_static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.is_development())
