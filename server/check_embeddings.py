"""
Quick script to check POI embeddings status
"""
import asyncio
import asyncpg
from config import settings

async def main():
    try:
        conn = await asyncpg.connect(settings.db_url)
        
        # Check embedding status
        result = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_pois,
                COUNT(description_embedding) as pois_with_embeddings,
                COUNT(*) - COUNT(description_embedding) as pois_without_embeddings
            FROM pois
        """)
        
        print(f"\n=== POI Embeddings Status ===")
        print(f"Total POIs: {result['total_pois']}")
        print(f"POIs with embeddings: {result['pois_with_embeddings']}")
        print(f"POIs without embeddings: {result['pois_without_embeddings']}")
        
        # Sample a few POIs without embeddings
        if result['pois_without_embeddings'] > 0:
            print(f"\n=== Sample POIs without embeddings ===")
            missing = await conn.fetch("""
                SELECT id, name, category, description
                FROM pois
                WHERE description_embedding IS NULL
                LIMIT 5
            """)
            for poi in missing:
                print(f"  ID {poi['id']}: {poi['name']} ({poi['category']})")
        
        # Check if voyage keys are configured
        print(f"\n=== API Configuration ===")
        print(f"VOYAGE_API_KEY set: {bool(settings.voyage_api_key)}")
        print(f"VOYAGE_POI_API_KEY set: {bool(settings.voyage_poi_api_key)}")
        
        await conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
