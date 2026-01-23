"""
app/core/logging_config.py
Structured logging configuration.
"""
import logging
from typing import Dict, Any


def setup_logging(name: str, level: int = logging.INFO) -> logging.Logger:
    """Configure logger with consistent format"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Only add handler if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger


# Module loggers
logger = setup_logging(__name__)
db_logger = setup_logging("astu.database")
ai_logger = setup_logging("astu.ai")
routing_logger = setup_logging("astu.routing")
vector_logger = setup_logging("astu.vector")
