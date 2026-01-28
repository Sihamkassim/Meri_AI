"""
Fix POI without embedding - One-time script
Re-embeds a specific POI that was created without embedding
"""
import asyncio
from app.core.container import container


async def fix_poi_embedding(poi_id: int):
    """Re-generate embedding for a specific POI"""
    db = container.get_database()
    ai = container.get_ai_service()
    
    try:
        # Get the POI
        result = await db.execute_query(
            "SELECT * FROM pois WHERE id = $1", poi_id
        )
        
        if not result:
            print(f"❌ POI {poi_id} not found")
            return
        
        poi = result[0]
        print(f"📍 Found POI: {poi['name']}")
        
        # Create searchable text
        text_parts = [poi['name']]
        if poi.get('description'):
            text_parts.append(poi['description'])
        if poi.get('category'):
            text_parts.append(f"Category: {poi['category']}")
        if poi.get('tags'):
            tags_str = ', '.join(poi['tags']) if isinstance(poi['tags'], list) else str(poi['tags'])
            text_parts.append(f"Tags: {tags_str}")
        
        searchable_text = ". ".join(text_parts)
        print(f"🔤 Text: {searchable_text[:100]}...")
        
        # Generate embedding
        embedding = await ai.generate_embedding(searchable_text, use_poi_key=True)
        print(f"✅ Generated embedding (dim={len(embedding)})")
        
        # Update database
        embedding_str = f"[{','.join(map(str, embedding))}]"
        await db.execute_query("""
            UPDATE pois 
            SET description_embedding = $1::vector
            WHERE id = $2
        """, embedding_str, poi_id)
        
        print(f"✅ POI {poi_id} ({poi['name']}) embedding updated!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await ai.close()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python fix_poi_embedding.py <poi_id>")
        print("Example: python fix_poi_embedding.py 36")
        sys.exit(1)
    
    poi_id = int(sys.argv[1])
    asyncio.run(fix_poi_embedding(poi_id))
