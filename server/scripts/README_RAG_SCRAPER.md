# ASTU RAG Knowledge Base Scraper

High-quality web scraping, semantic chunking, and embedding pipeline for building a Retrieval-Augmented Generation (RAG) knowledge base from ASTU website content.

## Features

✅ **Intelligent Content Extraction**
- Removes navigation, headers, footers, ads, and boilerplate
- Preserves heading hierarchy (H1→H3)
- Extracts only semantic content

✅ **Advanced Cleaning & Normalization**
- Converts to clean Markdown
- Removes duplicated sentences and sections
- Normalizes whitespace and punctuation
- Ensures readable content without HTML artifacts

✅ **Semantic Chunking** (MANDATORY)
- Chunks by meaning, not fixed size
- Each chunk = one complete idea or topic
- Target: 300-500 tokens per chunk
- 10-15% overlap for context preservation
- Never splits: procedures, definitions, FAQs, step-by-step instructions

✅ **Rich Metadata**
- Source URL, page title, section title
- Content type classification (policy, guide, FAQ, documentation)
- Relevant tags/keywords
- Language detection
- Scraping timestamp

✅ **Deduplication**
- SHA-256 hash for each chunk
- Skips re-embedding and re-insertion of existing chunks

✅ **Voyage AI Embeddings**
- Uses `voyage-3-large` (1024 dimensions)
- Optimal for semantic retrieval
- Batch processing for efficiency

✅ **Database Storage**
- PostgreSQL with pgvector extension
- Vector similarity search ready
- Atomic transactions
- Proper indexing for fast retrieval

## Setup

### 1. Install Dependencies

Already installed via `requirements.txt`:
- beautifulsoup4
- lxml
- html2text
- voyageai
- tiktoken

### 2. Get Voyage AI API Key

1. Visit https://www.voyageai.com/
2. Sign up for an account
3. Get your API key
4. Add to `.env` file:

```bash
VOYAGE_API_KEY=your-voyage-api-key-here
```

### 3. Initialize Database

The script will automatically create the `document_chunks` table with proper schema:

```sql
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1024),  -- voyage-3-large dimensions
    source_url VARCHAR(512),
    page_title VARCHAR(512),
    section_title VARCHAR(512),
    content_type VARCHAR(100),
    tags TEXT[],
    language VARCHAR(10),
    date_scraped TIMESTAMP,
    hash VARCHAR(64) UNIQUE NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage

### Run the Scraper

```bash
cd /home/lelo/projects/Divas/server
source venv/bin/activate
python scripts/scrape_astu_rag.py
```

### What It Does

1. **Scrapes** 12 ASTU pages:
   - College information
   - Department details
   - Mission and background
   - Human resource management
   - Various engineering departments

2. **Processes** each page:
   - Extracts main content
   - Cleans and converts to Markdown
   - Chunks semantically (300-500 tokens)
   - Adds rich metadata
   - Generates embeddings
   - Stores in database

3. **Reports** final statistics:
   - Pages scraped
   - Chunks created
   - Chunks embedded
   - Duplicates skipped
   - Errors encountered

## Output Example

```
================================================================================
🚀 ASTU RAG Knowledge Base Scraper
================================================================================

Processing: https://www.astu.edu.et/Colleges/CoEEC/about-us/background-of-astu
📥 Scraping: https://www.astu.edu.et/Colleges/CoEEC/about-us/background-of-astu
✓ Successfully scraped: Background of ASTU
🧹 Cleaning content from: Background of ASTU
✂️  Chunking content from: Background of ASTU
✓ Created 8 semantic chunks
✅ Validating 8 chunks
✓ Validated: 8/8 chunks passed
🔮 Generating embeddings for 8 chunks using voyage-3-large
✓ Generated 8 embeddings
💾 Storing 8 chunks in database
✓ Stored 8 chunks, skipped 0 duplicates

================================================================================
📊 FINAL REPORT
================================================================================
Pages scraped:         12
Chunks created:        127
Chunks embedded:       127
Chunks skipped (dup):  0
Errors encountered:    0

================================================================================
✅ RAG Knowledge Base Processing Complete!
================================================================================
```

## Chunk Metadata Structure

Each chunk includes:

```json
{
  "content": "The actual text content...",
  "embedding": [0.123, -0.456, ...],  // 1024-dim vector
  "source_url": "https://www.astu.edu.et/...",
  "page_title": "Background of ASTU",
  "section_title": "History",
  "content_type": "documentation",
  "tags": ["ASTU", "university", "engineering"],
  "language": "en",
  "date_scraped": "2026-01-23T10:30:00",
  "hash": "a3f5...",
  "token_count": 423
}
```

## Quality Assurance

The scraper follows strict quality guidelines:

✓ **Accuracy First**: No hallucinations, no summaries
✓ **Clean Output**: No HTML artifacts
✓ **Semantic Integrity**: Never splits related content
✓ **Proper Chunking**: 300-500 tokens, meaningful boundaries
✓ **Validation**: Checks token limits, metadata, content quality
✓ **Deduplication**: SHA-256 hash prevents duplicates
✓ **Error Handling**: Logs all errors, continues processing

## Retrieval Quality

Optimized for RAG:

- **Semantic Search**: Vector similarity using pgvector
- **Metadata Filtering**: By content type, tags, source
- **Context Preservation**: 10-15% overlap between chunks
- **High-Quality Embeddings**: Voyage-3-large for best results

## Troubleshooting

### No Voyage API Key
```
⚠️  VOYAGE_API_KEY not set. Set it with: export VOYAGE_API_KEY='your-key'
```
**Solution**: Add VOYAGE_API_KEY to `.env` file

### Database Connection Error
```
✗ Database connection failed
```
**Solution**: Check DATABASE_URL in `.env` and network connectivity

### Scraping Errors
```
✗ Failed to scrape [URL]: timeout
```
**Solution**: Check internet connection, website availability, increase timeout

## Notes

- The scraper is idempotent: re-running won't create duplicates
- Embeddings are generated in batches for efficiency
- All operations are logged with timestamps
- Database transactions are atomic
- Content is validated before storage

## Next Steps

After scraping:

1. **Query the knowledge base**:
   ```python
   from database import db
   results = db.semantic_search(query_embedding, limit=5)
   ```

2. **Use in RAG pipeline**: Feed chunks to LLM for context-aware responses

3. **Update regularly**: Re-run scraper to keep knowledge base current

---

**Built with**: Python, BeautifulSoup, Voyage AI, PostgreSQL, pgvector
