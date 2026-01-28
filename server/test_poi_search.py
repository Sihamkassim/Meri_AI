"""
Test POI semantic search to diagnose navigation issues
"""
import asyncio
from app.core.container import container


async def test_poi_search():
    """Test POI search with various queries"""
    vector_service = container.get_vector_service()
    
    test_queries = [
        "library",
        "lab",
        "computer lab",
        "block 8",
        "Block-8",
        "main gate",
        "cafeteria",
        "mosque",
        "engineering building"
    ]
    
    print("=" * 70)
    print("POI SEMANTIC SEARCH TEST")
    print("=" * 70)
    
    for query in test_queries:
        print(f"\n🔍 Query: '{query}'")
        print("-" * 70)
        
        try:
            results = await vector_service.search_pois(query, limit=3)
            
            if results:
                print(f"   ✅ Found {len(results)} results:")
                for idx, poi in enumerate(results, 1):
                    similarity = getattr(poi, 'similarity', None)
                    sim_str = f"(similarity: {similarity:.3f})" if similarity else ""
                    print(f"      {idx}. {poi.name} - {poi.category} {sim_str}")
                    if poi.description:
                        print(f"         Description: {poi.description[:60]}...")
            else:
                print("   ❌ No results found")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(test_poi_search())
