"""
Database connection and pgvector helpers for ASTU Route AI.
Handles Postgres/Supabase connections and vector operations.
"""
import psycopg
from psycopg import Connection, AsyncConnection
from psycopg.rows import dict_row
from config import settings
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class Database:
    """Database manager for Supabase Postgres with pgvector support"""
    
    def __init__(self):
        self.connection_string = settings.database_url
        self._conn: Optional[Connection] = None
    
    def connect(self) -> Connection:
        """Establish database connection"""
        try:
            self._conn = psycopg.connect(
                self.connection_string,
                row_factory=dict_row,
                autocommit=True
            )
            logger.info("✓ Connected to Supabase Postgres")
            return self._conn
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self._conn:
            self._conn.close()
            logger.info("Database connection closed")
    
    def init_pgvector(self):
        """Enable pgvector extension for embeddings"""
        try:
            with psycopg.connect(self.connection_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("✓ pgvector extension enabled")
        except Exception as e:
            logger.error(f"✗ Failed to enable pgvector: {e}")
            raise
    
    def create_tables(self):
        """Create required tables for ASTU Route AI"""
        try:
            with psycopg.connect(self.connection_string) as conn:
                with conn.cursor() as cur:
                    # POIs table (Points of Interest)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS pois (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            category VARCHAR(100),
                            latitude FLOAT NOT NULL,
                            longitude FLOAT NOT NULL,
                            description TEXT,
                            building VARCHAR(255),
                            block_num VARCHAR(50),
                            floor INTEGER,
                            room_num VARCHAR(50),
                            capacity INTEGER,
                            facilities TEXT[],
                            tags TEXT[],
                            osm_id BIGINT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Documents table (ASTU knowledge base)
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS documents (
                            id SERIAL PRIMARY KEY,
                            title VARCHAR(255) NOT NULL,
                            content TEXT NOT NULL,
                            source VARCHAR(255),
                            tags TEXT[],
                            embedding vector(768),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Create indexes for faster queries
                    cur.execute("CREATE INDEX IF NOT EXISTS pois_category_idx ON pois(category);")
                    cur.execute("CREATE INDEX IF NOT EXISTS pois_location_idx ON pois(latitude, longitude);")
                    cur.execute("CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);")
                    
                logger.info("✓ All tables created successfully")
        except Exception as e:
            logger.error(f"✗ Failed to create tables: {e}")
            raise
    
    def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            with psycopg.connect(self.connection_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT NOW();")
                    result = cur.fetchone()
                    logger.info(f"✓ Database test successful. Server time: {result}")
                    return True
        except Exception as e:
            logger.error(f"✗ Database test failed: {e}")
            return False
    
    def insert_poi(self, name: str, category: str, latitude: float, 
                   longitude: float, description: str = None, 
                   tags: List[str] = None, osm_id: int = None) -> int:
        """Insert a Point of Interest into the database"""
        try:
            with psycopg.connect(self.connection_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO pois (name, category, latitude, longitude, description, tags, osm_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id;
                    """, (name, category, latitude, longitude, description, tags, osm_id))
                    poi_id = cur.fetchone()['id']
                    logger.info(f"✓ POI inserted: {name} (ID: {poi_id})")
                    return poi_id
        except Exception as e:
            logger.error(f"✗ Failed to insert POI: {e}")
            raise
    
    def get_pois_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Fetch POIs by category"""
        try:
            with psycopg.connect(self.connection_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT * FROM pois WHERE category = %s LIMIT %s;
                    """, (category, limit))
                    return cur.fetchall()
        except Exception as e:
            logger.error(f"✗ Failed to fetch POIs: {e}")
            return []
    
    def get_nearby_pois(self, latitude: float, longitude: float, 
                        radius_km: float = 5, limit: int = 10) -> List[Dict]:
        """Find POIs near a location using haversine distance"""
        try:
            with psycopg.connect(self.connection_string) as conn:
                with conn.cursor() as cur:
                    # Haversine formula for distance calculation
                    cur.execute("""
                        SELECT 
                            id, name, category, latitude, longitude, description,
                            (6371 * acos(cos(radians(%s)) * cos(radians(latitude)) * 
                             cos(radians(longitude) - radians(%s)) + 
                             sin(radians(%s)) * sin(radians(latitude)))) AS distance_km
                        FROM pois
                        WHERE (6371 * acos(cos(radians(%s)) * cos(radians(latitude)) * 
                               cos(radians(longitude) - radians(%s)) + 
                               sin(radians(%s)) * sin(radians(latitude)))) <= %s
                        ORDER BY distance_km
                        LIMIT %s;
                    """, (latitude, longitude, latitude, latitude, longitude, latitude, radius_km, limit))
                    return cur.fetchall()
        except Exception as e:
            logger.error(f"✗ Failed to fetch nearby POIs: {e}")
            return []
    
    def insert_document(self, title: str, content: str, source: str = None, 
                       tags: List[str] = None, embedding: List[float] = None) -> int:
        """Insert a document into the knowledge base"""
        try:
            with psycopg.connect(self.connection_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    # Convert embedding list to pgvector format
                    embedding_str = f"[{','.join(map(str, embedding))}]" if embedding else None
                    
                    cur.execute("""
                        INSERT INTO documents (title, content, source, tags, embedding)
                        VALUES (%s, %s, %s, %s, %s::vector)
                        RETURNING id;
                    """, (title, content, source, tags, embedding_str))
                    doc_id = cur.fetchone()['id']
                    logger.info(f"✓ Document inserted: {title} (ID: {doc_id})")
                    return doc_id
        except Exception as e:
            logger.error(f"✗ Failed to insert document: {e}")
            raise
    
    def semantic_search(self, query_embedding: List[float], 
                       limit: int = 5, threshold: float = 0.5) -> List[Dict]:
        """Search documents by semantic similarity using pgvector"""
        try:
            with psycopg.connect(self.connection_string, row_factory=dict_row) as conn:
                with conn.cursor() as cur:
                    embedding_str = f"[{','.join(map(str, query_embedding))}]"
                    
                    cur.execute("""
                        SELECT 
                            id, title, content, source,
                            1 - (embedding <=> %s::vector) AS similarity
                        FROM documents
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (embedding_str, embedding_str, limit))
                    results = cur.fetchall()
                    
                    # Filter by threshold if needed
                    return [r for r in results if r['similarity'] >= threshold]
        except Exception as e:
            logger.error(f"✗ Semantic search failed: {e}")
            return []


# Global database instance
db = Database()


if __name__ == "__main__":
    print("\n=== Database Setup ===\n")
    
    # Test connection
    print("Testing connection...")
    if db.test_connection():
        print("\n✓ Connection successful!")
        
        # Initialize pgvector
        print("\nEnabling pgvector extension...")
        db.init_pgvector()
        
        # Create tables
        print("\nCreating tables...")
        db.create_tables()
        
        print("\n✓ Database setup complete!")
    else:
        print("\n✗ Connection test failed. Check your DATABASE_URL and network.")
