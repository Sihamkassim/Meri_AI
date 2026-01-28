"""Test nearby service search for mosque"""
import sys
sys.path.insert(0, '.')

from database import db
from app.services.vector_service import VectorSearchService
from app.services.ai_service import GeminiAIService
import asyncio

async def test_mosque_search():
    """Test searching for nearby mosques"""
    
    print("\n=== Testing Mosque Search ===\n")
    
    # Initialize services
    ai_service = GeminiAIService()
    vector_service = VectorSearchService(db, ai_service)
    
    # Test 1: Search for "mosque" using vector service
    print("1. Searching for 'mosque' POIs...")
    try:
        pois = await vector_service.search_pois("mosque", limit=5)
        print(f"   Found {len(pois)} results:")
        for poi in pois:
            print(f"   - {poi.name} (category: {poi.category}) at ({poi.latitude}, {poi.longitude})")
            if hasattr(poi, 'similarity'):
                print(f"     Similarity: {poi.similarity:.3f}")
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Search for variations
    print("\n2. Testing variations...")
    for query in ["masjid", "prayer hall", "nearest mosque"]:
        try:
            pois = await vector_service.search_pois(query, limit=2)
            print(f"   '{query}': {len(pois)} results")
            if pois:
                print(f"      → {pois[0].name}")
        except Exception as e:
            print(f"   ERROR for '{query}': {e}")
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    asyncio.run(test_mosque_search())
