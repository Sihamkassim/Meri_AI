"""
Admin dashboard API endpoints.
CRUD operations for POIs, documents, and system statistics.
Web scraping endpoints for populating knowledge base.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import json
import logging

from app.core.container import Container
from models import POI, Document

router = APIRouter(prefix="/api/admin", tags=["admin"])
logger = logging.getLogger(__name__)


def get_db():
    """Get database service from container"""
    return Container().get_database()


def get_vector():
    """Get vector service from container"""
    return Container().get_vector_service()


def get_ai():
    """Get AI service from container"""
    return Container().get_ai_service()


@router.get("/stats")
async def get_stats(db = Depends(get_db)):
    """
    Get system statistics for admin dashboard.
    Returns counts of POIs, documents, and OSM status.
    """
    try:
        # Use synchronous connection for count queries
        from database import Database
        database = Database()
        conn = database.connect()
        
        with conn.cursor() as cur:
            # Count POIs
            cur.execute("SELECT COUNT(*) as count FROM pois")
            poi_count = cur.fetchone()["count"]
            
            # Count documents
            cur.execute("SELECT COUNT(*) as count FROM documents")
            doc_count = cur.fetchone()["count"]
            
            # Count city services
            cur.execute("SELECT COUNT(*) as count FROM pois WHERE category = 'service'")
            service_count = cur.fetchone()["count"]
        
        conn.close()
        
        # Check OSM status from container
        from app.core.container import Container
        osm_service = Container().get_osm_service()
        osm_loaded = osm_service.campus_graph_loaded
        
        return {
            "campus_pois": poi_count,
            "documents": doc_count,
            "city_services": service_count,
            "osm_loaded": osm_loaded,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/pois")
async def get_pois(
    category: Optional[str] = None,
    limit: int = 100,
    db = Depends(get_db)
):
    """Get all POIs with optional category filter"""
    try:
        if category:
            query = "SELECT * FROM pois WHERE category = $1 LIMIT $2"
            result = await db.execute_query(query, category, limit)
        else:
            query = "SELECT * FROM pois LIMIT $1"
            result = await db.execute_query(query, limit)
        
        return {"pois": result, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get POIs: {str(e)}")


@router.post("/pois")
async def create_poi(poi: POI, db = Depends(get_db)):
    """Create a new POI"""
    try:
        # Convert lists to JSON strings for storage
        tags_json = json.dumps(poi.tags) if poi.tags else None
        facilities_json = json.dumps(poi.facilities) if poi.facilities else None
        
        query = """
        INSERT INTO pois (
            name, category, latitude, longitude, description,
            building, block_num, floor, room_num, capacity,
            facilities, tags, osm_id, created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id
        """
        
        result = await db.execute_query(
            query,
            poi.name,
            poi.category,
            poi.latitude,
            poi.longitude,
            poi.description,
            poi.building,
            poi.block_num,
            poi.floor,
            poi.room_num,
            poi.capacity,
            facilities_json,
            tags_json,
            poi.osm_id,
            datetime.now()
        )
        
        poi_id = result[0]["id"]
        return {"id": poi_id, "message": "POI created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create POI: {str(e)}")


@router.put("/pois/{poi_id}")
async def update_poi(poi_id: int, poi: POI, db = Depends(get_db)):
    """Update an existing POI"""
    try:
        tags_json = json.dumps(poi.tags) if poi.tags else None
        facilities_json = json.dumps(poi.facilities) if poi.facilities else None
        
        query = """
        UPDATE pois SET
            name = $1, category = $2, latitude = $3, longitude = $4,
            description = $5, building = $6, block_num = $7, floor = $8,
            room_num = $9, capacity = $10, facilities = $11, tags = $12, osm_id = $13
        WHERE id = $14
        """
        
        await db.execute_query(
            query,
            poi.name, poi.category, poi.latitude, poi.longitude,
            poi.description, poi.building, poi.block_num, poi.floor,
            poi.room_num, poi.capacity, facilities_json, tags_json,
            poi.osm_id, poi_id
        )
        
        return {"message": "POI updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update POI: {str(e)}")


@router.delete("/pois/{poi_id}")
async def delete_poi(poi_id: int, db = Depends(get_db)):
    """Delete a POI"""
    try:
        query = "DELETE FROM pois WHERE id = $1"
        await db.execute_query(query, poi_id)
        return {"message": "POI deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete POI: {str(e)}")


@router.get("/documents")
async def get_documents(
    limit: int = 100,
    db = Depends(get_db)
):
    """Get all documents"""
    try:
        query = "SELECT id, title, source, created_at FROM documents LIMIT $1"
        result = await db.execute_query(query, limit)
        return {"documents": result, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")


@router.post("/documents")
async def create_document(
    title: str = Form(...),
    content: str = Form(...),
    source: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db = Depends(get_db),
    vector = Depends(get_vector),
    ai = Depends(get_ai)
):
    """Create a new document with vector embedding"""
    try:
        # Generate embedding
        embedding = await ai.generate_embedding(content)
        
        # Parse tags
        tags_list = json.loads(tags) if tags else None
        tags_json = json.dumps(tags_list) if tags_list else None
        
        # Store document
        query = """
        INSERT INTO documents (title, content, source, tags, embedding, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        """
        
        result = await db.execute_query(
            query,
            title,
            content,
            source,
            tags_json,
            embedding,
            datetime.now()
        )
        
        doc_id = result[0]["id"]
        
        # Store in vector database
        await vector.store_document({
            "id": doc_id,
            "content": content,
            "metadata": {
                "title": title,
                "source": source,
                "tags": tags_list or []
            }
        })
        
        return {"id": doc_id, "message": "Document created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    db = Depends(get_db),
    vector = Depends(get_vector),
    ai = Depends(get_ai)
):
    """Upload a document file (txt, pdf, etc.)"""
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Use filename as title if not provided
        doc_title = title or file.filename
        
        # Generate embedding
        embedding = await ai.generate_embedding(text_content)
        
        # Store document
        query = """
        INSERT INTO documents (title, content, source, embedding, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """
        
        result = await db.execute_query(
            query,
            doc_title,
            text_content,
            source or file.filename,
            embedding,
            datetime.now()
        )
        
        doc_id = result[0]["id"]
        
        # Store in vector database
        await vector.store_document({
            "id": doc_id,
            "content": text_content,
            "metadata": {
                "title": doc_title,
                "source": source or file.filename
            }
        })
        
        return {"id": doc_id, "message": f"Document '{doc_title}' uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db = Depends(get_db)):
    """Delete a document"""
    try:
        query = "DELETE FROM documents WHERE id = $1"
        await db.execute_query(query, doc_id)
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.post("/scrape/url")
async def scrape_single_url(
    url: str = Form(...),
    db = Depends(get_db),
    ai = Depends(get_ai)
):
    """
    Scrape content from a single URL and store in database.
    Admin can use this to add content from any webpage.
    """
    try:
        from app.services.scraper_service import WebScraperService
        
        scraper = WebScraperService()
        content_data = scraper.scrape_url(url)
        
        if not content_data:
            raise HTTPException(status_code=400, detail="Failed to scrape URL")
        
        # Generate embedding
        embedding = await ai.generate_embedding(content_data['content'])
        
        # Insert into database
        from database import Database
        database = Database()
        doc_id = database.insert_document(
            title=content_data['title'],
            content=content_data['content'],
            source=content_data['url'],
            tags=['web-scraped'],
            embedding=embedding
        )
        
        return {
            "id": doc_id,
            "title": content_data['title'],
            "url": url,
            "message": "URL scraped and stored successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape URL: {str(e)}")


@router.post("/scrape/astu")
async def scrape_astu_website(
    max_pages: int = Form(default=30),
    db = Depends(get_db),
    ai = Depends(get_ai)
):
    """
    Scrape multiple pages from ASTU website and store in database.
    This populates the knowledge base for RAG.
    """
    try:
        from app.services.scraper_service import ASTUWebScraper
        from database import Database
        
        scraper = ASTUWebScraper()
        
        # Scrape ASTU pages
        scraped_data = scraper.scrape_astu_pages(max_pages=max_pages)
        
        if not scraped_data:
            raise HTTPException(status_code=400, detail="No content scraped")
        
        # Prepare documents (with chunking)
        documents = scraper.prepare_documents(scraped_data, chunk_size=1000)
        
        # Store each document
        database = Database()
        stored_count = 0
        
        for doc in documents:
            try:
                # Generate embedding
                embedding = await ai.generate_embedding(doc['content'])
                
                # Insert into database
                doc_id = database.insert_document(
                    title=doc['title'],
                    content=doc['content'],
                    source=doc['source'],
                    tags=doc.get('tags', []),
                    embedding=embedding
                )
                stored_count += 1
                
            except Exception as e:
                logger.error(f"Failed to store document '{doc['title']}': {e}")
                continue
        
        return {
            "scraped_pages": len(scraped_data),
            "documents_stored": stored_count,
            "message": f"Successfully scraped and stored {stored_count} documents from ASTU website"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape ASTU website: {str(e)}")


@router.post("/scrape/custom")
async def scrape_custom_urls(
    urls: List[str] = Form(...),
    db = Depends(get_db),
    ai = Depends(get_ai)
):
    """
    Scrape multiple custom URLs and store in database.
    Admin can provide a list of URLs to scrape.
    """
    try:
        from app.services.scraper_service import WebScraperService
        from database import Database
        
        scraper = WebScraperService()
        database = Database()
        
        stored_count = 0
        results = []
        
        for url in urls:
            try:
                # Scrape URL
                content_data = scraper.scrape_url(url)
                
                if content_data and len(content_data.get('content', '')) > 100:
                    # Generate embedding
                    embedding = await ai.generate_embedding(content_data['content'])
                    
                    # Insert into database
                    doc_id = database.insert_document(
                        title=content_data['title'],
                        content=content_data['content'],
                        source=content_data['url'],
                        tags=['web-scraped', 'custom'],
                        embedding=embedding
                    )
                    
                    stored_count += 1
                    results.append({
                        "url": url,
                        "status": "success",
                        "id": doc_id,
                        "title": content_data['title']
                    })
                else:
                    results.append({
                        "url": url,
                        "status": "failed",
                        "error": "No content or content too short"
                    })
                    
            except Exception as e:
                results.append({
                    "url": url,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "total_urls": len(urls),
            "stored_count": stored_count,
            "results": results,
            "message": f"Processed {len(urls)} URLs, stored {stored_count} documents"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape custom URLs: {str(e)}")

