# Web Scraping Scripts

This directory contains scripts for scraping and populating the ASTU knowledge base.

## scrape_and_populate.py

Scrape content from the ASTU website and store it in Supabase with embeddings for RAG.

### Features

- **Website Crawling**: Automatically crawls ASTU website starting from important pages
- **Content Extraction**: Uses trafilatura and BeautifulSoup for clean content extraction
- **Chunking**: Automatically chunks large content for better embeddings
- **Vector Embeddings**: Generates embeddings using Google Gemini
- **Supabase Storage**: Stores documents with embeddings in PostgreSQL with pgvector

### Usage

#### Scrape ASTU Website (default)

```bash
python scripts/scrape_and_populate.py --max-pages 30
```

This will:
1. Start from important ASTU pages (home, about, academics, etc.)
2. Crawl up to 30 pages
3. Extract and clean content
4. Generate embeddings
5. Store in Supabase

#### Scrape a Single URL

```bash
python scripts/scrape_and_populate.py --url "https://www.astu.edu.et/about"
```

#### Scrape from Sitemap

```bash
python scripts/scrape_and_populate.py --sitemap
```

### Prerequisites

Make sure you have:
1. Installed requirements: `pip install -r requirements.txt`
2. Configured `.env` file with:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `AI_API_KEY` (Google Gemini)

### Configuration

The scraper respects rate limiting:
- 1-2 second delay between requests
- Maximum pages limit to avoid overloading
- User-Agent headers for responsible scraping

### Output

The script will:
- Log progress to console
- Show number of pages scraped
- Report successful/failed document storage
- Display document IDs for verification

### Admin API Alternative

You can also use the admin API endpoints instead of running this script:

```bash
# Scrape ASTU website via API
curl -X POST "http://localhost:4000/api/admin/scrape/astu" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "max_pages=30"

# Scrape single URL
curl -X POST "http://localhost:4000/api/admin/scrape/url" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "url=https://www.astu.edu.et/about"

# Scrape multiple custom URLs
curl -X POST "http://localhost:4000/api/admin/scrape/custom" \
  -H "Content-Type: application/json" \
  -d '{"urls": ["url1", "url2", "url3"]}'
```

### Troubleshooting

**No content scraped**: Some pages may block scraping or have no extractable content
- Try different pages
- Check if the website is accessible

**Embedding errors**: Make sure your Gemini API key is valid
- Check `.env` file
- Verify API key permissions

**Database errors**: Verify your Supabase connection
- Test with: `python -c "from database import Database; Database().test_connection()"`
- Check DATABASE_URL in `.env`

### Content Chunking

Long documents are automatically chunked:
- Default chunk size: 1000 characters
- Overlap: 200 characters
- Smart chunking at sentence/paragraph boundaries

This ensures:
- Better embedding quality
- More precise retrieval
- Optimal RAG performance
