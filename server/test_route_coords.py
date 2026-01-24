"""Test route_coords generation"""
import asyncio
from app.core.container import container

async def test_route():
    print("Testing OSM route calculation...")
    
    # Get services
    osm = container.get_osm_service()
    
    # Test coordinates (Current Location to Library)
    start_lat, start_lng = 8.564168, 39.289311
    end_lat, end_lng = 8.560946, 39.291328
    
    print(f"\nRoute from ({start_lat}, {start_lng}) to ({end_lat}, {end_lng})")
    
    # Get route
    route = osm.get_route(start_lat, start_lng, end_lat, end_lng, "walking")
    
    if route:
        print(f"\n✓ Route calculated successfully!")
        print(f"  Distance: {route.get('distance_km')}km")
        print(f"  Duration: {route.get('duration_minutes')} min")
        print(f"  Waypoints: {route.get('nodes_count')}")
        
        route_coords = route.get('route_coords')
        if route_coords:
            print(f"\n✓ Route coords found: {len(route_coords)} coordinates")
            print(f"  First coord: {route_coords[0]}")
            print(f"  Last coord: {route_coords[-1]}")
        else:
            print("\n❌ route_coords is None or empty!")
            
        print(f"\nFull route data keys: {list(route.keys())}")
    else:
        print("\n❌ Route calculation returned None")

if __name__ == "__main__":
    asyncio.run(test_route())
