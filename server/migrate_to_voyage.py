"""
Migrate database from 768-dim (Gemini) to 1024-dim (Voyage AI) embeddings.
Run this ONCE to update the schema.
"""
import psycopg
from config import settings

def migrate_to_voyage():
    """Update embedding column to 1024 dimensions for Voyage AI"""
    try:
        print("\n=== Migrating to Voyage AI (1024-dim embeddings) ===\n")
        
        with psycopg.connect(settings.database_url) as conn:
            with conn.cursor() as cur:
                # Drop old index
                print("1. Dropping old embedding index...")
                cur.execute("DROP INDEX IF EXISTS documents_embedding_idx;")
                print("   ✓ Index dropped")
                
                # Alter column to new dimension
                print("\n2. Updating embedding column to 1024 dimensions...")
                cur.execute("ALTER TABLE documents ALTER COLUMN embedding TYPE vector(1024);")
                print("   ✓ Column updated to vector(1024)")
                
                # Recreate index
                print("\n3. Creating new embedding index...")
                cur.execute("""
                    CREATE INDEX documents_embedding_idx 
                    ON documents 
                    USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100);
                """)
                print("   ✓ New index created")
                
                # Clear old embeddings (they're invalid now)
                print("\n4. Clearing old 768-dim embeddings...")
                cur.execute("UPDATE documents SET embedding = NULL WHERE embedding IS NOT NULL;")
                rows_updated = cur.rowcount
                print(f"   ✓ Cleared {rows_updated} old embeddings")
                
                print("\n✅ Successfully migrated to Voyage AI!")
                print("   - Embedding dimension: 1024")
                print("   - Index: Recreated for cosine similarity")
                print("   - Action needed: Re-scrape or re-add documents to generate new embeddings")
                
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate_to_voyage()
