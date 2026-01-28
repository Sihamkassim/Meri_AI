"""Quick check for mosque POIs"""
import sys
sys.path.insert(0, '.')

from database import db

print("\n=== Checking Mosque POIs ===\n")

try:
    results = db.search_pois_by_text("mosque", limit=10)
    print(f"Found {len(results)} mosque-related POIs:")
    for r in results:
        print(f"  - {r['name']} (category: {r['category']})")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
