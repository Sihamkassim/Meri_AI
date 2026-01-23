# Data Ingestion Scripts

Scripts to populate the ASTU Route AI database with campus POIs, knowledge documents, and city services.

## Quick Start

Run all ingestion scripts at once:

```bash
python scripts/ingest_all.py
```

This will populate:
1. **Campus POIs** - ASTU buildings and facilities (30+ locations)
2. **Knowledge Base** - University information documents (20+ documents with embeddings)
3. **City Services** - Nearby Adama services (30+ locations)

## Individual Scripts

### 1. Campus POIs
```bash
python scripts/ingest_campus_pois.py
```
Adds ASTU campus locations:
- Academic blocks (Block 1-5)
- Administrative buildings
- Library and ICT Center
- Laboratories
- Cafeteria and student facilities
- Dormitories
- Sports facilities
- Medical clinic
- Religious facilities (Mosque, Chapel)
- Parking and transport

### 2. Knowledge Base Documents
```bash
python scripts/ingest_documents.py
```
Adds university information with AI embeddings:
- About ASTU
- Academic programs
- Admission requirements
- Campus facilities
- Student services
- Navigation tips
- City services guide
- Academic policies

**Note**: This script takes ~30 seconds as it generates embeddings using Gemini AI.

### 3. City Services
```bash
python scripts/ingest_city_services.py
```
Adds Adama city services near ASTU:
- Mosques
- Pharmacies
- Hair salons
- Cafes and restaurants
- Banks and ATMs
- Medical facilities
- Supermarkets and shops
- Hotels
- Transportation

## Requirements

Before running ingestion:

1. **Database Setup**
   - Supabase PostgreSQL database configured
   - Connection string in `.env` file
   - pgvector extension enabled

2. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://...
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Verification

After ingestion, verify data:

### Check POIs count
```python
from database import Database
from config import settings

db = Database(settings.database_url)
# Query to check row counts
```

### Check via API
Start the server and visit:
- http://localhost:4000/api/docs
- Test `/api/nearby?category=mosque&limit=5`
- Test `/api/query` with "What is ASTU?"

## Troubleshooting

### Database Connection Error
```
✗ Database connection failed
```
**Solution**: Check `DATABASE_URL` in `.env` file, verify Supabase credentials.

### Embedding Dimension Error
```
Embedding dimension mismatch: 1536 (expected 768)
```
**Solution**: Database schema updated to 768. Drop and recreate `documents` table if needed:
```sql
DROP TABLE documents;
-- Re-run ingest_documents.py
```

### Gemini API Rate Limit
```
Rate limit exceeded
```
**Solution**: The script includes 0.5s delays. If still failing, increase delay in `ingest_documents.py`.

### Duplicate Key Error
```
duplicate key value violates unique constraint
```
**Solution**: Data already exists. Either:
- Clear existing data: `DELETE FROM pois WHERE category = 'building';`
- Or skip ingestion if data is already populated

## Data Sources

Current data is manually curated for MVP. For production:

- **Campus POIs**: Should be collected via GPS survey or extracted from ASTU official maps
- **Knowledge Base**: Should scrape official ASTU website and documents
- **City Services**: Should use OpenStreetMap Overpass API or Google Places API

## Customization

### Add More POIs
Edit arrays in respective scripts:
```python
# In ingest_campus_pois.py
CAMPUS_POIS = [
    {
        "name": "New Building",
        "category": "building",
        "latitude": 8.5570,
        "longitude": 39.2920,
        "description": "Description here",
        "tags": ["tag1", "tag2"]
    },
    # ... more POIs
]
```

### Add More Documents
Edit in `ingest_documents.py`:
```python
KNOWLEDGE_DOCUMENTS = [
    {
        "title": "Document Title",
        "content": "Full content here...",
        "source": "Source name",
        "tags": ["tag1", "tag2"]
    },
    # ... more documents
]
```

## Next Steps

After successful ingestion:

1. ✅ Start server: `python main.py`
2. ✅ Test health: http://localhost:4000/health
3. ✅ Explore API docs: http://localhost:4000/api/docs
4. ✅ Try queries:
   - POST `/api/query` - "Where is Block 1?"
   - GET `/api/route/stream?origin=Main Gate&destination=Library`
   - GET `/api/nearby?category=mosque&limit=5`
5. ✅ Build frontend to consume these APIs
