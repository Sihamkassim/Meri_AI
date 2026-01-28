"""
POI Embedding Migration Script

Purpose:
1. Add description_embedding column to POIs table
2. Create vector index for fast semantic search
3. Embed all existing POIs using Voyage POI API key
4. Store embeddings in database

Usage:
    python migrate_poi_embeddings.py
"""
import asyncio
import sys
from datetime import datetime
from app.core.container import container
from app.core.logging_config import logger


async def migrate_poi_embeddings():
    """Main migration function"""
    print("=" * 60)
    print("POI EMBEDDING MIGRATION")
    print("=" * 60)
    print(f"Started: {datetime.now()}")
    print()
    
    try:
        # Get services
        db = container.get_database()
        ai = container.get_ai_service()
        
        print("✅ Services initialized")
        print()
        
        # Step 1: Add embedding column to pois table
        print("Step 1: Adding description_embedding column...")
        try:
            await db.execute_query("""
                ALTER TABLE pois 
                ADD COLUMN IF NOT EXISTS description_embedding vector(1024)
            """)
            print("✅ Column added successfully")
        except Exception as e:
            print(f"⚠️  Column might already exist: {e}")
        print()
        
        # Step 2: Create vector index
        print("Step 2: Creating vector index...")
        try:
            # Drop old index if exists
            await db.execute_query("""
                DROP INDEX IF EXISTS idx_pois_description_embedding
            """)
            
            # Create IVFFlat index for fast similarity search
            await db.execute_query("""
                CREATE INDEX idx_pois_description_embedding 
                ON pois USING ivfflat (description_embedding vector_cosine_ops)
                WITH (lists = 100)
            """)
            print("✅ Vector index created successfully")
        except Exception as e:
            print(f"⚠️  Index creation: {e}")
        print()
        
        # Step 3: Get all POIs without embeddings
        print("Step 3: Fetching POIs to embed...")
        pois = await db.execute_query("""
            SELECT id, name, description, category, tags
            FROM pois
            WHERE description_embedding IS NULL
            ORDER BY id
        """)
        
        total = len(pois)
        print(f"📊 Found {total} POIs to embed")
        print()
        
        if total == 0:
            print("✅ All POIs already have embeddings!")
            return
        
        # Step 4: Embed each POI
        print("Step 4: Generating embeddings...")
        print("-" * 60)
        
        success_count = 0
        error_count = 0
        
        for idx, poi in enumerate(pois, 1):
            try:
                # Create searchable text from POI data
                text_parts = [poi["name"]]
                
                if poi.get("description"):
                    text_parts.append(poi["description"])
                
                if poi.get("category"):
                    text_parts.append(f"Category: {poi['category']}")
                
                if poi.get("tags"):
                    tags_str = ", ".join(poi["tags"]) if isinstance(poi["tags"], list) else str(poi["tags"])
                    text_parts.append(f"Tags: {tags_str}")
                
                searchable_text = ". ".join(text_parts)
                
                # Generate embedding using POI-specific Voyage key
                embedding = await ai.generate_embedding(searchable_text, use_poi_key=True)
                
                # Store in database
                embedding_str = f"[{','.join(map(str, embedding))}]"
                await db.execute_query("""
                    UPDATE pois 
                    SET description_embedding = $1::vector
                    WHERE id = $2
                """, embedding_str, poi["id"])
                
                success_count += 1
                print(f"[{idx}/{total}] ✅ {poi['name'][:50]:<50} (dim={len(embedding)})")
                
                # Rate limiting (avoid hitting API limits)
                if idx % 10 == 0:
                    await asyncio.sleep(1)
                
            except Exception as e:
                error_count += 1
                print(f"[{idx}/{total}] ❌ {poi['name'][:50]:<50} Error: {e}")
        
        print("-" * 60)
        print()
        
        # Summary
        print("=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"Total POIs:      {total}")
        print(f"✅ Successful:   {success_count}")
        print(f"❌ Errors:       {error_count}")
        print(f"Success Rate:    {(success_count/total*100):.1f}%" if total > 0 else "N/A")
        print()
        
        if success_count > 0:
            print("✅ POI embeddings migration completed successfully!")
            print()
            print("Next steps:")
            print("1. Test semantic POI search via admin panel")
            print("2. Query: 'where is the library?' should find library POI")
            print("3. Query: 'take me to the lab' should find laboratory POI")
        else:
            print("❌ Migration failed. Please check errors above.")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"\n❌ FATAL ERROR: {e}")
        sys.exit(1)
    
    finally:
        # Cleanup
        if ai:
            await ai.close()
        print(f"\nCompleted: {datetime.now()}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(migrate_poi_embeddings())
