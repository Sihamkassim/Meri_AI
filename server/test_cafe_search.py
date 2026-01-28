"""Quick test to verify cafe/cafeteria search is working"""
import asyncio
import asyncpg
from app.core.config import settings

async def test_cafe_search():
    """Test if cafe POIs exist and can be found"""
    
    # Connect to database
    conn = await asyncpg.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        database=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD
    )
    
    try:
        print("\n=== Testing Cafe Search ===\n")
        
        # Test 1: Check if cafe POIs exist
        print("1. Checking for cafe/cafeteria POIs...")
        cafes = await conn.fetch("""
            SELECT id, name, category, description
            FROM pois
            WHERE LOWER(name) LIKE '%cafe%' 
               OR LOWER(category) LIKE '%cafe%'
               OR LOWER(description) LIKE '%cafe%'
        """)
        
        print(f"   Found {len(cafes)} cafe-related POIs:")
        for cafe in cafes:
            print(f"   - {cafe['name']} (category: {cafe['category']})")
        
        # Test 2: Test exact search patterns
        print("\n2. Testing search patterns...")
        
        patterns = ['cafe', 'cafeteria', '%cafe%', 'nearest cafe']
        for pattern in patterns:
            results = await conn.fetch("""
                SELECT id, name, category
                FROM pois
                WHERE LOWER(name) LIKE $1
                   OR LOWER(category) LIKE $1
                   OR LOWER(description) LIKE $1
                LIMIT 3
            """, f"%{pattern.lower()}%")
            
            print(f"   Pattern '{pattern}': {len(results)} results")
            for r in results[:2]:
                print(f"      → {r['name']}")
        
        # Test 3: Check if embeddings exist
        print("\n3. Checking embeddings...")
        with_embeddings = await conn.fetchval("""
            SELECT COUNT(*) FROM pois 
            WHERE description_embedding IS NOT NULL
               AND (LOWER(name) LIKE '%cafe%' OR LOWER(category) LIKE '%cafe%')
        """)
        print(f"   Cafe POIs with embeddings: {with_embeddings}")
        
        print("\n✅ Test complete!")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(test_cafe_search())
