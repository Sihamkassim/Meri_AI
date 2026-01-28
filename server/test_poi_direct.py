"""Direct test of POI search without async complexity"""
import sys
sys.path.insert(0, '.')

from database import db

def test_direct_search():
    """Test POI search directly"""
    
    print("\n=== Testing Direct POI Search ===\n")
    
    # Test 1: Check if POIs exist
    print("1. Checking POI count...")
    try:
        import psycopg
        from psycopg.rows import dict_row
        
        with psycopg.connect(db.connection_string, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as count FROM pois")
                result = cur.fetchone()
                print(f"   Total POIs: {result['count']}")
                
                cur.execute("SELECT COUNT(*) as count FROM pois WHERE description_embedding IS NOT NULL")
                result = cur.fetchone()
                print(f"   POIs with embeddings: {result['count']}")
    except Exception as e:
        print(f"   ERROR: {e}")
        return
    
    # Test 2: Try text search for "cafe"
    print("\n2. Testing text search for 'cafe'...")
    try:
        results = db.search_pois_by_text("cafe", limit=5)
        print(f"   Found {len(results)} results:")
        for r in results:
            print(f"   - {r['name']} (category: {r['category']})")
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Try text search for "library"
    print("\n3. Testing text search for 'library'...")
    try:
        results = db.search_pois_by_text("library", limit=5)
        print(f"   Found {len(results)} results:")
        for r in results:
            print(f"   - {r['name']} (category: {r['category']})")
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Try text search for "health"
    print("\n4. Testing text search for 'health center'...")
    try:
        results = db.search_pois_by_text("health center", limit=5)
        print(f"   Found {len(results)} results:")
        for r in results:
            print(f"   - {r['name']} (category: {r['category']})")
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    test_direct_search()
