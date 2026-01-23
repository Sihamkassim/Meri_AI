"""
Fix all POIs with missing embeddings - Batch script
Auto-detects and embeds all POIs that have NULL description_embedding
"""
import asyncio
from app.core.container import container


async def fix_all_missing_embeddings():
    """Find and fix all POIs without embeddings"""
    db = container.get_database()
    ai = container.get_ai_service()
    
    try:
        # Find all POIs without embeddings
        result = await db.execute_query("""
            SELECT id, name, description, category, tags 
            FROM pois 
            WHERE description_embedding IS NULL
            ORDER BY id
        """)
        
        if not result:
            print("✅ All POIs already have embeddings!")
            return
        
        print(f"📊 Found {len(result)} POIs without embeddings")
        print("=" * 60)
        
        fixed_count = 0
        failed_count = 0
        
        for poi in result:
            poi_id = poi['id']
            poi_name = poi['name']
            
            try:
                print(f"\n🔄 Processing POI {poi_id}: {poi_name}")
                
                # Create searchable text
                text_parts = [poi_name]
                if poi.get('description'):
                    text_parts.append(poi['description'])
                if poi.get('category'):
                    text_parts.append(f"Category: {poi['category']}")
                if poi.get('tags'):
                    tags_str = ', '.join(poi['tags']) if isinstance(poi['tags'], list) else str(poi['tags'])
                    text_parts.append(f"Tags: {tags_str}")
                
                searchable_text = ". ".join(text_parts)
                print(f"   📝 Text: {searchable_text[:80]}...")
                
                # Generate embedding using POI-specific Voyage key
                embedding = await ai.generate_embedding(searchable_text, use_poi_key=True)
                print(f"   ✅ Generated embedding (dim={len(embedding)})")
                
                # Update database
                embedding_str = f"[{','.join(map(str, embedding))}]"
                await db.execute_query("""
                    UPDATE pois 
                    SET description_embedding = $1::vector
                    WHERE id = $2
                """, embedding_str, poi_id)
                
                print(f"   💾 Updated database")
                fixed_count += 1
                
                # Rate limiting to avoid API throttling
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"   ❌ Failed: {e}")
                failed_count += 1
                continue
        
        print("\n" + "=" * 60)
        print(f"✅ Fixed: {fixed_count} POIs")
        print(f"❌ Failed: {failed_count} POIs")
        print(f"📊 Total: {len(result)} POIs processed")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await ai.close()


if __name__ == "__main__":
    print("🚀 ASTU POI Embedding Fix - Batch Mode")
    print("This will embed all POIs with NULL description_embedding")
    print("=" * 60)
    asyncio.run(fix_all_missing_embeddings())
