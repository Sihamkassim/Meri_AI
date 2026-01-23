from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict

router = APIRouter(prefix="/api/map", tags=["Map"])


def get_db():
    """Get database service from container"""
    from app.core.container import Container
    return Container().get_database()


@router.get("/campus")
async def campus_map(db = Depends(get_db)):
    """
    Get campus map data including POIs and boundary.
    Returns all POIs for campus visualization.
    """
    try:
        # Fetch all campus POIs from database
        query = """
        SELECT 
            id, name, description, category, 
            latitude as y, longitude as x,
            building, block_num, floor, room_num, 
            capacity, facilities, tags
        FROM pois 
        WHERE category IN ('academic', 'administrative', 'residential', 'amenity', 'gate')
        ORDER BY name
        """
        pois_result = await db.execute_query(query)
        
        # Transform POIs to frontend format
        nodes = []
        for poi in pois_result:
            nodes.append({
                "id": str(poi.get("id")),
                "name": poi.get("name"),
                "description": poi.get("description") or "",
                "category": poi.get("category"),
                "x": float(poi.get("x")) if poi.get("x") else 39.2693,
                "y": float(poi.get("y")) if poi.get("y") else 8.5402,
            })
        
        # ASTU Campus boundary (can be stored in DB or config in future)
        boundary = [
            [8.5440, 39.2640],
            [8.5440, 39.2740],
            [8.5360, 39.2740],
            [8.5360, 39.2640],
        ]
        
        return {
            "nodes": nodes,
            "boundary": boundary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch campus map: {str(e)}")
