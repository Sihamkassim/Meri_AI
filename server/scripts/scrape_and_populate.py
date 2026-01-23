#!/usr/bin/env python3
"""
scripts/scrape_and_populate.py
Script to scrape ASTU website and populate Supabase vector database.

Usage:
    python scripts/scrape_and_populate.py --max-pages 50
    python scripts/scrape_and_populate.py --url "https://www.astu.edu.et/about"
    python scripts/scrape_and_populate.py --sitemap
"""
import sys
import os
import asyncio
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.scraper_service import ASTUWebScraper, WebScraperService
from app.services.ai_service import GeminiAIService
from database import Database
from config import settings
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def scrape_and_store_astu(max_pages: int = 30):
    """
    Scrape ASTU website and store in Supabase.
    
    Args:
        max_pages: Maximum number of pages to scrape
    """
    logger.info(f"Starting ASTU website scrape (max {max_pages} pages)...")
    
    # Initialize services
    scraper = ASTUWebScraper()
    ai_service = GeminiAIService()
    database = Database()
    
    try:
        # Test database connection
        if not database.test_connection():
            logger.error("Database connection failed!")
            return
        
        # Scrape ASTU pages
        logger.info("Scraping ASTU website...")
        scraped_data = scraper.scrape_astu_pages(max_pages=max_pages)
        
        if not scraped_data:
            logger.warning("No content scraped!")
            return
        
        logger.info(f"Scraped {len(scraped_data)} pages")
        
        # Prepare documents with chunking
        logger.info("Preparing documents...")
        documents = scraper.prepare_documents(scraped_data, chunk_size=1000)
        logger.info(f"Prepared {len(documents)} documents (with chunking)")
        
        # Store documents with embeddings
        stored_count = 0
        failed_count = 0
        
        for i, doc in enumerate(documents, 1):
            try:
                logger.info(f"Processing document {i}/{len(documents)}: {doc['title'][:50]}...")
                
                # Generate embedding
                embedding = await ai_service.generate_embedding(doc['content'])
                
                # Insert into database
                doc_id = database.insert_document(
                    title=doc['title'],
                    content=doc['content'],
                    source=doc['source'],
                    tags=doc.get('tags', []),
                    embedding=embedding
                )
                
                stored_count += 1
                logger.info(f"✓ Stored document ID {doc_id}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"✗ Failed to store document: {e}")
                continue
        
        logger.info("=" * 60)
        logger.info(f"SCRAPING COMPLETE")
        logger.info(f"Pages scraped: {len(scraped_data)}")
        logger.info(f"Documents prepared: {len(documents)}")
        logger.info(f"Successfully stored: {stored_count}")
        logger.info(f"Failed: {failed_count}")
        logger.info("=" * 60)
        
    finally:
        await ai_service.close()
        database.disconnect()


async def scrape_single_url(url: str):
    """
    Scrape a single URL and store in database.
    
    Args:
        url: URL to scrape
    """
    logger.info(f"Scraping single URL: {url}")
    
    scraper = WebScraperService()
    ai_service = GeminiAIService()
    database = Database()
    
    try:
        # Test connection
        if not database.test_connection():
            logger.error("Database connection failed!")
            return
        
        # Scrape URL
        content_data = scraper.scrape_url(url)
        
        if not content_data:
            logger.error("Failed to scrape URL")
            return
        
        logger.info(f"Scraped: {content_data['title']}")
        logger.info(f"Content length: {len(content_data['content'])} chars")
        
        # Generate embedding
        logger.info("Generating embedding...")
        embedding = await ai_service.generate_embedding(content_data['content'])
        
        # Store in database
        doc_id = database.insert_document(
            title=content_data['title'],
            content=content_data['content'],
            source=content_data['url'],
            tags=['web-scraped'],
            embedding=embedding
        )
        
        logger.info(f"✓ Successfully stored with ID {doc_id}")
        
    finally:
        await ai_service.close()
        database.disconnect()


async def scrape_from_sitemap():
    """Scrape all URLs from sitemap.xml"""
    logger.info("Scraping from sitemap...")
    
    scraper = ASTUWebScraper()
    ai_service = GeminiAIService()
    database = Database()
    
    try:
        # Get URLs from sitemap
        urls = scraper.scrape_sitemap()
        
        if not urls:
            logger.warning("No URLs found in sitemap")
            return
        
        logger.info(f"Found {len(urls)} URLs in sitemap")
        
        # Scrape each URL
        stored_count = 0
        for i, url in enumerate(urls[:50], 1):  # Limit to 50
            try:
                logger.info(f"Processing {i}/{len(urls)}: {url}")
                
                content_data = scraper.scrape_url(url)
                if content_data and len(content_data.get('content', '')) > 100:
                    embedding = await ai_service.generate_embedding(content_data['content'])
                    doc_id = database.insert_document(
                        title=content_data['title'],
                        content=content_data['content'],
                        source=content_data['url'],
                        tags=['sitemap', 'web-scraped'],
                        embedding=embedding
                    )
                    stored_count += 1
                    logger.info(f"✓ Stored ID {doc_id}")
                    
            except Exception as e:
                logger.error(f"Failed: {e}")
                continue
        
        logger.info(f"Stored {stored_count} documents from sitemap")
        
    finally:
        await ai_service.close()
        database.disconnect()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Scrape ASTU website and populate Supabase vector database"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=30,
        help="Maximum number of pages to scrape (default: 30)"
    )
    parser.add_argument(
        "--url",
        type=str,
        help="Scrape a single URL instead of crawling"
    )
    parser.add_argument(
        "--sitemap",
        action="store_true",
        help="Scrape from sitemap.xml"
    )
    
    args = parser.parse_args()
    
    # Run async function
    if args.url:
        asyncio.run(scrape_single_url(args.url))
    elif args.sitemap:
        asyncio.run(scrape_from_sitemap())
    else:
        asyncio.run(scrape_and_store_astu(args.max_pages))


if __name__ == "__main__":
    main()
