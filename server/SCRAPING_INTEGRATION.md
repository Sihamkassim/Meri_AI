# ASTU Website Scraping & RAG System

## Overview

Your application now has a complete web scraping system that integrates with your existing RAG (Retrieval-Augmented Generation) architecture.

## Architecture

```
Web Scraping Flow:
┌─────────────────┐
│  ASTU Website   │
│ www.astu.edu.et │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Scraper Service    │
│ - Extract content   │
│ - Clean HTML        │
│ - Chunk documents   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Gemini AI Service  │
│ - Generate embeddings│
│ (vector 768)        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Supabase Postgres  │
│ - Store documents   │
│ - Store embeddings  │
│ - pgvector search   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   RAG Service       │
│ - Retrieve context  │
│ - Generate answers  │
└─────────────────────┘
```

## Features Implemented

### 1. Web Scraper Service (`app/services/scraper_service.py`)
- ✅ Extract clean content from any URL
- ✅ Remove scripts, styles, navigation
- ✅ Support for multiple extraction methods (trafilatura, BeautifulSoup)
- ✅ Smart content chunking (1000 chars with 200 overlap)
- ✅ Sitemap.xml support
- ✅ Link extraction and crawling
- ✅ Rate limiting and respectful scraping
- ✅ Specialized ASTU scraper class

### 2. Admin API Endpoints (`app/routers/admin.py`)

#### POST `/api/admin/scrape/url`
Scrape a single URL and store in database.
```bash
curl -X POST "http://localhost:4000/api/admin/scrape/url" \
  -F "url=https://www.astu.edu.et/about"
```

#### POST `/api/admin/scrape/astu`
Scrape multiple pages from ASTU website.
```bash
curl -X POST "http://localhost:4000/api/admin/scrape/astu" \
  -F "max_pages=30"
```

#### POST `/api/admin/scrape/custom`
Scrape multiple custom URLs.
```bash
curl -X POST "http://localhost:4000/api/admin/scrape/custom" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["url1", "url2"]}'
```

### 3. Standalone Script (`scripts/scrape_and_populate.py`)
```bash
# Scrape ASTU website
python scripts/scrape_and_populate.py --max-pages 30

# Scrape single URL
python scripts/scrape_and_populate.py --url "https://www.astu.edu.et/about"

# Scrape from sitemap
python scripts/scrape_and_populate.py --sitemap
```

## How It Works

### 1. Admin Manual Entry (Already Working ✓)
- Admin uses `/api/admin/documents` POST endpoint
- Provides title, content, source
- System generates embedding
- Stores in Supabase

### 2. Admin Web Scraping (NEW ✓)
- Admin triggers scraping via API or script
- System scrapes ASTU website
- Extracts clean content
- Chunks large documents
- Generates embeddings for each chunk
- Stores in same Supabase table

### 3. Retrieval (RAG)
- User asks question
- System generates query embedding
- Searches Supabase with pgvector
- Returns top-k similar documents
- Feeds to Gemini for answer generation

## Database Schema

Your existing `documents` table works perfectly:
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),         -- URL for scraped content
    tags TEXT[],                 -- ['web-scraped', 'astu-website']
    embedding vector(768),        -- Gemini embeddings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Install Dependencies First
```bash
cd server
pip install -r requirements.txt
```

### Option 1: Run Scraping Script
```bash
python scripts/scrape_and_populate.py --max-pages 30
```

### Option 2: Use Admin API
```bash
# Start server
uvicorn main:app --reload --port 4000

# Trigger scraping
curl -X POST "http://localhost:4000/api/admin/scrape/astu" \
  -F "max_pages=30"
```

### Option 3: Manual Admin Entry (existing)
```bash
curl -X POST "http://localhost:4000/api/admin/documents" \
  -F "title=ASTU History" \
  -F "content=Long content..." \
  -F "source=manual" \
  -F "tags=[\"university\", \"history\"]"
```

## Important Notes

### Existing Features Preserved ✓
- Your existing admin CRUD endpoints still work
- Manual document creation unchanged
- RAG service unchanged
- Vector search unchanged
- All integrations intact

### New Capabilities ✓
- Automated content population
- Web scraping from any URL
- ASTU-specific scraping
- Smart content chunking
- Batch processing

### Content Sources
Documents can now come from:
1. **Manual entry** by admin
2. **Single URL scraping**
3. **Bulk website crawling**
4. **Sitemap-based scraping**
5. **File uploads** (already supported)

## Next Steps

1. **Install dependencies**:
   ```bash
   pip install beautifulsoup4 requests html2text trafilatura
   ```

2. **Test single URL scrape**:
   ```bash
   python scripts/scrape_and_populate.py --url "https://www.astu.edu.et/"
   ```

3. **Run full ASTU scrape**:
   ```bash
   python scripts/scrape_and_populate.py --max-pages 30
   ```

4. **Verify in database**:
   ```sql
   SELECT COUNT(*) FROM documents WHERE source LIKE '%astu.edu.et%';
   SELECT title, source FROM documents LIMIT 10;
   ```

5. **Test RAG retrieval**:
   ```bash
   curl -X POST "http://localhost:4000/api/query" \
     -H "Content-Type: application/json" \
     -d '{"question": "What is ASTU?"}'
   ```

## Configuration

All configuration uses your existing `.env`:
- `SUPABASE_URL` - Already configured ✓
- `DATABASE_URL` - Already configured ✓
- `AI_API_KEY` - Already configured ✓
- `EMBEDDING_MODEL` - Already configured (text-embedding-004) ✓

No additional setup needed!

## File Structure

```
server/
├── app/
│   ├── services/
│   │   ├── scraper_service.py    [NEW] Web scraping logic
│   │   ├── ai_service.py          [EXISTS] Embeddings
│   │   ├── rag_service.py         [EXISTS] RAG
│   │   └── vector_service.py      [EXISTS] Search
│   └── routers/
│       └── admin.py               [UPDATED] +3 scraping endpoints
├── scripts/
│   ├── scrape_and_populate.py    [NEW] Scraping script
│   └── SCRAPING_GUIDE.md         [NEW] Documentation
└── requirements.txt               [UPDATED] +4 dependencies
```

## Benefits

1. **Automated Knowledge Base**: Populate from ASTU website automatically
2. **Fresh Content**: Re-scrape to keep content updated
3. **Flexible Sources**: Admin can add from any URL or manually
4. **Same Infrastructure**: Uses existing Supabase, Gemini, RAG setup
5. **Scalable**: Chunk large docs, handle many pages
6. **Production Ready**: Rate limiting, error handling, logging

Your RAG system is now fully equipped to handle both manual admin entries and automated web scraping! 🚀
