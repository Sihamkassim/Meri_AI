"""
Database migration script to add new POI location fields.
Run this to update existing database schema.
"""
import psycopg
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_database():
    """Add new columns to POIs table"""
    try:
        with psycopg.connect(settings.database_url) as conn:
            with conn.cursor() as cur:
                logger.info("Starting database migration...")
                
                # Add new columns to pois table
                migrations = [
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS building VARCHAR(255);",
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS block_num VARCHAR(50);",
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS floor INTEGER;",
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS room_num VARCHAR(50);",
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS capacity INTEGER;",
                    "ALTER TABLE pois ADD COLUMN IF NOT EXISTS facilities TEXT[];"
                ]
                
                for migration in migrations:
                    try:
                        cur.execute(migration)
                        logger.info(f"✓ Executed: {migration[:50]}...")
                    except Exception as e:
                        logger.warning(f"⚠ Migration step failed (might already exist): {e}")
                
                logger.info("✓ Database migration completed successfully!")
                
    except Exception as e:
        logger.error(f"✗ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate_database()
