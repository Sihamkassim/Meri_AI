"""
ASTU Website RAG Scraper
High-quality scraping, cleaning, chunking, and embedding for RAG knowledge base.
Uses Voyage embeddings and semantic chunking for optimal retrieval quality.
"""

import os
import sys
import hashlib
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
import html2text
import tiktoken
import voyageai
import psycopg
from psycopg.rows import dict_row

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# URLs to scrape
URLS = [
    "https://www.astu.edu.et/Colleges/CoEEC/about-us/human-resource-management-directorate",
    "https://www.astu.edu.et/Colleges/CoEEC/about-us/background-of-astu",
    "https://www.astu.edu.et/Colleges/CoEEC/about-us/mission-and-purpose",
    "https://www.astu.edu.et/Colleges/CoMCME/about-us/background-of-astu",
    "https://www.astu.edu.et/Colleges/CoMCME/departments/chemical-engineering",
    "https://www.astu.edu.et/Colleges/CoMCME/departments/materials-science-and-engineering",
    "https://www.astu.edu.et/Colleges/CoMCME/departments/mechanical-engineering",
    "https://www.astu.edu.et/Colleges/CoEEC/departments/electronics-and-communication-engineering",
    "https://www.astu.edu.et/Colleges/CoCEA/departments/architecture",
    "https://www.astu.edu.et/Colleges/CoCEA/departments/civil-engineering",
    "https://www.astu.edu.et/Colleges/CoCEA/departments/water-resource-engineering",
    "https://www.astu.edu.et/Colleges/CoANS/departments/pharmacy",
]

# Voyage AI configuration
VOYAGE_API_KEY = settings.voyage_api_key
VOYAGE_MODEL = "voyage-3-large"  # Best quality for embeddings

# Token counter
tokenizer = tiktoken.get_encoding("cl100k_base")


class RAGScraper:
    """High-quality scraper for RAG knowledge base"""
    
    def __init__(self):
        self.voyage_client = None
        if VOYAGE_API_KEY:
            self.voyage_client = voyageai.Client(api_key=VOYAGE_API_KEY)
        else:
            logger.warning("⚠️  VOYAGE_API_KEY not set. Set it with: export VOYAGE_API_KEY='your-key'")
        
        self.db_connection_string = settings.database_url
        self.html2text_converter = html2text.HTML2Text()
        self.html2text_converter.ignore_links = False
        self.html2text_converter.ignore_images = True
        self.html2text_converter.ignore_emphasis = False
        self.html2text_converter.body_width = 0  # No wrapping
        
        self.stats = {
            "pages_scraped": 0,
            "chunks_created": 0,
            "chunks_embedded": 0,
            "chunks_skipped": 0,
            "errors": []
        }
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(tokenizer.encode(text))
    
    def generate_hash(self, text: str) -> str:
        """Generate SHA-256 hash for deduplication"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()
    
    def scrape_page(self, url: str) -> Optional[Dict]:
        """
        Step 1: Scrape a page and extract main semantic content
        Ignores: navigation, headers, footers, ads, social media, boilerplate
        """
        logger.info(f"📥 Scraping: {url}")
        
        # Retry logic for connection issues
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = httpx.get(url, timeout=30.0, follow_redirects=True)
                response.raise_for_status()
                break
            except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
                if attempt < max_retries - 1:
                    import time
                    wait_time = (attempt + 1) * 2  # Exponential backoff
                    logger.warning(f"⚠️  Connection error, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    error_msg = f"Failed to scrape {url}: {str(e)}"
                    logger.error(f"✗ {error_msg}")
                    self.stats["errors"].append(error_msg)
                    return None
            except Exception as e:
                error_msg = f"Failed to scrape {url}: {str(e)}"
                logger.error(f"✗ {error_msg}")
                self.stats["errors"].append(error_msg)
                return None
        
        if not response:
            return None
        
        try:
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Remove unwanted elements (but keep more content)
            for element in soup.select('script, style, noscript, iframe'):
                element.decompose()
            
            # Extract page title
            page_title = soup.find('title')
            page_title = page_title.get_text(strip=True) if page_title else urlparse(url).path
            
            # Find main content area - try multiple strategies
            main_content = None
            
            # Strategy 1: Look for common content containers
            for selector in [
                'main',
                'article', 
                '[role="main"]',
                '.content',
                '.main-content',
                '#content',
                '#main-content',
                '.page-content',
                'div.content',
            ]:
                main_content = soup.select_one(selector)
                if main_content and len(main_content.get_text(strip=True)) > 100:
                    break
            
            # Strategy 2: Find the div with most paragraph content
            if not main_content or len(main_content.get_text(strip=True)) < 100:
                all_divs = soup.find_all('div')
                best_div = None
                max_text_len = 0
                
                for div in all_divs:
                    # Remove nav, header, footer, sidebar from consideration
                    if div.find_parent(['nav', 'header', 'footer', 'aside']):
                        continue
                    if any(cls in str(div.get('class', [])).lower() 
                           for cls in ['nav', 'menu', 'sidebar', 'footer', 'header']):
                        continue
                    
                    text = div.get_text(strip=True)
                    if len(text) > max_text_len:
                        max_text_len = len(text)
                        best_div = div
                
                if best_div and max_text_len > 100:
                    main_content = best_div
            
            # Fallback to body
            if not main_content:
                main_content = soup.find('body')
                # Remove obvious navigation elements from body
                if main_content:
                    for element in main_content.select('nav, header, footer, .menu, .navigation, aside'):
                        element.decompose()
            
            if not main_content:
                logger.warning(f"⚠️  No main content found for {url}")
                return None
            
            # Preserve only semantic content
            content_html = str(main_content)
            
            self.stats["pages_scraped"] += 1
            logger.info(f"✓ Successfully scraped: {page_title}")
            
            return {
                "url": url,
                "title": page_title,
                "html": content_html,
                "soup": main_content
            }
            
        except Exception as e:
            error_msg = f"Failed to scrape {url}: {str(e)}"
            logger.error(f"✗ {error_msg}")
            self.stats["errors"].append(error_msg)
            return None
    
    def clean_content(self, page_data: Dict) -> str:
        """
        Step 2: Clean and normalize content to Markdown
        Removes duplicates, normalizes whitespace, ensures readability
        """
        logger.info(f"🧹 Cleaning content from: {page_data['title']}")
        
        # Convert to clean Markdown
        markdown = self.html2text_converter.handle(page_data['html'])
        
        # Remove excessive whitespace
        lines = markdown.split('\n')
        cleaned_lines = []
        seen_lines = set()
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines (but keep single newlines for separation)
            if not line:
                if cleaned_lines and cleaned_lines[-1] != '':
                    cleaned_lines.append('')
                continue
            
            # Remove duplicate consecutive lines
            if line not in seen_lines or line.startswith('#'):
                cleaned_lines.append(line)
                seen_lines.add(line)
        
        # Join and normalize
        clean_text = '\n'.join(cleaned_lines)
        
        # Remove excessive newlines (more than 2 consecutive)
        while '\n\n\n' in clean_text:
            clean_text = clean_text.replace('\n\n\n', '\n\n')
        
        return clean_text.strip()
    
    def extract_section_title(self, text: str) -> str:
        """Extract the first heading from text as section title"""
        lines = text.split('\n')
        for line in lines:
            if line.startswith('#'):
                return line.lstrip('#').strip()
        return "General"
    
    def classify_content_type(self, text: str) -> str:
        """Classify content type based on keywords"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['policy', 'regulation', 'rule', 'guideline']):
            return "policy"
        elif any(word in text_lower for word in ['how to', 'guide', 'tutorial', 'step']):
            return "guide"
        elif any(word in text_lower for word in ['faq', 'question', 'answer']):
            return "faq"
        elif any(word in text_lower for word in ['announcement', 'news', 'notice']):
            return "announcement"
        else:
            return "documentation"
    
    def semantic_chunk(self, text: str, page_data: Dict) -> List[Dict]:
        """
        Step 3: Semantic chunking by meaning (300-500 tokens)
        Preserves complete ideas, procedures, definitions
        With 50-80 token overlap for better context preservation
        """
        logger.info(f"✂️  Chunking content from: {page_data['title']}")
        
        chunks = []
        paragraphs = text.split('\n\n')
        
        current_chunk = []
        current_tokens = 0
        current_heading = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Track headings
            if para.startswith('#'):
                current_heading = para.lstrip('#').strip()
            
            para_tokens = self.count_tokens(para)
            
            # If adding this paragraph exceeds max tokens, save current chunk
            if current_tokens + para_tokens > 500 and current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                
                # Only create chunk if it has meaningful content (lowered to 50 tokens)
                if self.count_tokens(chunk_text) >= 50:
                    chunks.append({
                        "content": chunk_text,
                        "section_title": current_heading or self.extract_section_title(chunk_text),
                        "token_count": self.count_tokens(chunk_text)
                    })
                
                # Start new chunk with 50-80 token overlap (optimized for RAG)
                overlap_tokens = 0
                overlap_chunk = []
                for p in reversed(current_chunk):
                    p_tokens = self.count_tokens(p)
                    if overlap_tokens + p_tokens <= 80:
                        overlap_chunk.insert(0, p)
                        overlap_tokens += p_tokens
                    if overlap_tokens >= 50:  # Minimum 50 tokens overlap
                        break
                
                current_chunk = overlap_chunk
                current_tokens = overlap_tokens
            
            # Add paragraph to current chunk
            current_chunk.append(para)
            current_tokens += para_tokens
            
            # If single paragraph is too large, split it
            if para_tokens > 500:
                if current_chunk:
                    current_chunk.pop()  # Remove the large paragraph
                    
                    if current_chunk:
                        chunk_text = '\n\n'.join(current_chunk)
                        chunks.append({
                            "content": chunk_text,
                            "section_title": current_heading,
                            "token_count": self.count_tokens(chunk_text)
                        })
                
                # Split large paragraph by sentences
                sentences = para.split('. ')
                temp_chunk = []
                temp_tokens = 0
                
                for sent in sentences:
                    sent_tokens = self.count_tokens(sent)
                    if temp_tokens + sent_tokens > 500 and temp_chunk:
                        chunk_text = '. '.join(temp_chunk) + '.'
                        chunks.append({
                            "content": chunk_text,
                            "section_title": current_heading,
                            "token_count": self.count_tokens(chunk_text)
                        })
                        temp_chunk = []
                        temp_tokens = 0
                    
                    temp_chunk.append(sent)
                    temp_tokens += sent_tokens
                
                if temp_chunk:
                    chunk_text = '. '.join(temp_chunk)
                    chunks.append({
                        "content": chunk_text,
                        "section_title": current_heading,
                        "token_count": self.count_tokens(chunk_text)
                    })
                
                current_chunk = []
                current_tokens = 0
        
        # Add remaining content
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            if self.count_tokens(chunk_text) >= 50:  # Minimum 50 tokens
                chunks.append({
                    "content": chunk_text,
                    "section_title": current_heading or self.extract_section_title(chunk_text),
                    "token_count": self.count_tokens(chunk_text)
                })
        
        # Add metadata to chunks
        for chunk in chunks:
            chunk.update({
                "source_url": page_data["url"],
                "page_title": page_data["title"],
                "content_type": self.classify_content_type(chunk["content"]),
                "tags": self.extract_tags(chunk["content"]),
                "language": "en",
                "date_scraped": datetime.utcnow().isoformat(),
                "hash": self.generate_hash(chunk["content"]),
                "chunk_summary": self.generate_chunk_summary(chunk["content"])  # For reranking
            })
        
        self.stats["chunks_created"] += len(chunks)
        logger.info(f"✓ Created {len(chunks)} semantic chunks")
        
        return chunks
    
    def generate_chunk_summary(self, text: str) -> str:
        """
        Generate a 1-sentence summary of the chunk for reranking.
        This improves RAG quality by providing concise context.
        """
        # Extract first meaningful sentence or create a summary
        sentences = text.split('. ')
        
        # Get first non-heading, non-empty sentence
        for sent in sentences[:3]:  # Check first 3 sentences
            sent = sent.strip().lstrip('#').strip()
            if len(sent) > 20 and not sent.startswith('http'):
                # Truncate if too long
                if len(sent) > 150:
                    sent = sent[:147] + '...'
                return sent
        
        # Fallback: use first 150 chars
        clean_text = text.replace('\n', ' ').strip().lstrip('#').strip()
        if len(clean_text) > 150:
            return clean_text[:147] + '...'
        return clean_text
    
    def extract_tags(self, text: str) -> List[str]:
        """Extract relevant keywords as tags"""
        tags = []
        keywords = [
            "ASTU", "Adama", "university", "engineering", "department",
            "college", "course", "program", "student", "faculty",
            "research", "laboratory", "admission", "requirement"
        ]
        
        text_lower = text.lower()
        for keyword in keywords:
            if keyword.lower() in text_lower:
                tags.append(keyword)
        
        return list(set(tags))[:10]  # Max 10 tags
    
    def check_duplicate(self, chunk_hash: str, cursor) -> bool:
        """Check if chunk already exists in database"""
        cursor.execute("""
            SELECT id FROM document_chunks
            WHERE hash = %s
            LIMIT 1;
        """, (chunk_hash,))
        
        return cursor.fetchone() is not None
    
    def embed_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """
        Step 6: Generate Voyage embeddings for chunks with retry logic for rate limits
        """
        if not self.voyage_client:
            logger.error("✗ Voyage AI client not initialized. Set VOYAGE_API_KEY.")
            return chunks
        
        logger.info(f"🔮 Generating embeddings for {len(chunks)} chunks using {VOYAGE_MODEL}")
        
        try:
            # Extract texts for batch embedding
            texts = [chunk["content"] for chunk in chunks]
            
            # Generate embeddings in batches (Voyage allows up to 128 texts per request)
            batch_size = 128
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Retry logic for rate limits
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        result = self.voyage_client.embed(
                            batch,
                            model=VOYAGE_MODEL,
                            input_type="document"
                        )
                        all_embeddings.extend(result.embeddings)
                        
                        # Add delay to respect rate limits (3 RPM = 20 seconds between requests)
                        if i + batch_size < len(texts):
                            time.sleep(21)  # Wait 21 seconds between batches
                        break
                        
                    except Exception as e:
                        if "rate limit" in str(e).lower() and attempt < max_retries - 1:
                            wait_time = 30 * (attempt + 1)  # 30, 60 seconds
                            logger.warning(f"⏳ Rate limit hit, waiting {wait_time}s before retry {attempt + 2}/{max_retries}")
                            time.sleep(wait_time)
                        else:
                            raise
            
            # Attach embeddings to chunks
            for chunk, embedding in zip(chunks, all_embeddings):
                chunk["embedding"] = embedding
            
            self.stats["chunks_embedded"] += len(chunks)
            logger.info(f"✓ Generated {len(all_embeddings)} embeddings")
            
        except Exception as e:
            logger.error(f"✗ Failed to generate embeddings: {e}")
            self.stats["errors"].append(f"Embedding error: {str(e)}")
        
        return chunks
    
    def store_chunks(self, chunks: List[Dict]):
        """
        Step 7: Store chunks in database with deduplication and embedding updates
        Updates existing chunks with embeddings if they don't have them
        """
        logger.info(f"💾 Storing {len(chunks)} chunks in database")
        
        # First, ensure the table exists with proper schema
        self.ensure_chunk_table()
        
        stored = 0
        updated = 0
        skipped = 0
        
        try:
            # Use a fresh connection for each batch to avoid prepared statement conflicts
            with psycopg.connect(self.db_connection_string, row_factory=dict_row, prepare_threshold=None) as conn:
                conn.autocommit = False
                with conn.cursor() as cur:
                    for chunk in chunks:
                        # Check if chunk exists
                        cur.execute("SELECT id, embedding FROM document_chunks WHERE hash = %s LIMIT 1;", (chunk["hash"],))
                        existing = cur.fetchone()
                        
                        # Prepare embedding
                        embedding_str = None
                        if "embedding" in chunk and chunk["embedding"]:
                            embedding_str = f"[{','.join(map(str, chunk['embedding']))}]"
                        
                        # Prepare metadata JSON
                        metadata = {
                            "page_title": chunk["page_title"],
                            "section_title": chunk["section_title"],
                            "content_type": chunk["content_type"],
                            "tags": chunk["tags"],
                            "chunk_summary": chunk.get("chunk_summary", "")
                        }
                        
                        if existing:
                            # If chunk exists but has no embedding, update it
                            if existing["embedding"] is None and embedding_str:
                                cur.execute("""
                                    UPDATE document_chunks 
                                    SET embedding = %s::vector, 
                                        metadata = %s::jsonb
                                    WHERE id = %s;
                                """, (embedding_str, json.dumps(metadata), existing["id"]))
                                updated += 1
                            else:
                                skipped += 1
                        else:
                            # Insert new chunk
                            cur.execute("""
                                INSERT INTO document_chunks (
                                    content, embedding, source_url, metadata,
                                    language, date_scraped, hash, token_count
                                ) VALUES (
                                    %s, %s::vector, %s, %s::jsonb, %s, %s, %s, %s
                                );
                            """, (
                                chunk["content"],
                                embedding_str,
                                chunk["source_url"],
                                json.dumps(metadata),
                                chunk["language"],
                                chunk["date_scraped"],
                                chunk["hash"],
                                chunk.get("token_count", 0)
                            ))
                            stored += 1
                
                conn.commit()
        
        except Exception as e:
            error_msg = f"Database storage error: {str(e)}"
            logger.error(f"✗ {error_msg}")
            self.stats["errors"].append(error_msg)
            raise
        
        self.stats["chunks_skipped"] += skipped
        logger.info(f"✓ Stored {stored} new chunks, updated {updated} chunks with embeddings, skipped {skipped} duplicates")
    
    def ensure_chunk_table(self):
        """Ensure the document_chunks table exists with proper schema"""
        try:
            with psycopg.connect(self.db_connection_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS document_chunks (
                            id SERIAL PRIMARY KEY,
                            content TEXT NOT NULL,
                            embedding vector(1024),  -- voyage-3-large has 1024 dimensions
                            source_url VARCHAR(512),
                            metadata JSONB,  -- Flexible metadata including chunk_summary for reranking
                            language VARCHAR(10),
                            date_scraped TIMESTAMP,
                            hash VARCHAR(64) UNIQUE NOT NULL,
                            token_count INTEGER,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                    
                    # Create indexes for optimal RAG performance
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS document_chunks_hash_idx 
                        ON document_chunks(hash);
                    """)
                    
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
                        ON document_chunks USING ivfflat (embedding vector_cosine_ops)
                        WITH (lists = 100);
                    """)
                    
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx 
                        ON document_chunks USING gin(metadata);
                    """)
                    
                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS document_chunks_source_idx 
                        ON document_chunks(source_url);
                    """)
                
                conn.commit()
                logger.info("✓ Ensured document_chunks table exists with RAG-optimized schema")
                
        except Exception as e:
            logger.error(f"✗ Failed to create table: {e}")
            raise
    
    def validate_chunks(self, chunks: List[Dict]) -> List[Dict]:
        """
        Step 8: Validate chunks before storage
        """
        logger.info(f"✅ Validating {len(chunks)} chunks")
        
        valid_chunks = []
        
        for i, chunk in enumerate(chunks):
            # Check token limit
            if chunk.get("token_count", 0) > 500:
                logger.warning(f"⚠️  Chunk {i+1} exceeds max tokens: {chunk['token_count']}")
                continue
            
            # Check minimum content
            if chunk.get("token_count", 0) < 50:
                logger.warning(f"⚠️  Chunk {i+1} has too little content: {chunk['token_count']} tokens")
                continue
            
            # Check required metadata
            required_fields = ["source_url", "page_title", "content", "hash"]
            if not all(field in chunk for field in required_fields):
                logger.warning(f"⚠️  Chunk {i+1} missing required fields")
                continue
            
            valid_chunks.append(chunk)
        
        logger.info(f"✓ Validated: {len(valid_chunks)}/{len(chunks)} chunks passed")
        return valid_chunks
    
    def process_url(self, url: str):
        """Process a single URL through the entire pipeline"""
        logger.info(f"\n{'='*80}")
        logger.info(f"Processing: {url}")
        logger.info(f"{'='*80}")
        
        # Step 1: Scrape
        page_data = self.scrape_page(url)
        if not page_data:
            return
        
        # Step 2: Clean
        clean_text = self.clean_content(page_data)
        
        # Step 3: Chunk
        chunks = self.semantic_chunk(clean_text, page_data)
        
        # Step 8: Validate
        chunks = self.validate_chunks(chunks)
        
        if not chunks:
            logger.warning(f"⚠️  No valid chunks created for {url}")
            return
        
        # Step 6: Embed
        chunks = self.embed_chunks(chunks)
        
        # Step 7: Store
        self.store_chunks(chunks)
    
    def run(self):
        """Run the complete RAG scraping pipeline"""
        logger.info("\n" + "="*80)
        logger.info("🚀 ASTU RAG Knowledge Base Scraper")
        logger.info("="*80 + "\n")
        
        # Process each URL
        for url in URLS:
            try:
                self.process_url(url)
            except Exception as e:
                error_msg = f"Failed to process {url}: {str(e)}"
                logger.error(f"✗ {error_msg}")
                self.stats["errors"].append(error_msg)
        
        # Print final report
        self.print_report()
    
    def print_report(self):
        """Print final processing report"""
        logger.info("\n" + "="*80)
        logger.info("📊 FINAL REPORT")
        logger.info("="*80)
        logger.info(f"Pages scraped:         {self.stats['pages_scraped']}")
        logger.info(f"Chunks created:        {self.stats['chunks_created']}")
        logger.info(f"Chunks embedded:       {self.stats['chunks_embedded']}")
        logger.info(f"Chunks skipped (dup):  {self.stats['chunks_skipped']}")
        logger.info(f"Errors encountered:    {len(self.stats['errors'])}")
        
        if self.stats["errors"]:
            logger.info("\n⚠️  Errors:")
            for error in self.stats["errors"]:
                logger.info(f"  - {error}")
        
        logger.info("\n" + "="*80)
        logger.info("✅ RAG Knowledge Base Processing Complete!")
        logger.info("="*80 + "\n")


if __name__ == "__main__":
    scraper = RAGScraper()
    scraper.run()
