# Getting Your Voyage AI API Key

## Why Voyage AI?

Voyage AI provides state-of-the-art embedding models optimized for retrieval tasks. The `voyage-3-large` model offers:

- **1024 dimensions** for high-quality semantic representations
- **Best-in-class retrieval performance** on benchmarks
- **Optimized for RAG** (Retrieval-Augmented Generation)
- **Better than OpenAI embeddings** for semantic search

## Steps to Get Your API Key

### 1. Visit Voyage AI Website

Go to: **https://www.voyageai.com/**

### 2. Sign Up

- Click "Sign Up" or "Get Started"
- Create an account using your email
- Verify your email address

### 3. Access Dashboard

- Log in to your account
- Navigate to the API section
- Look for "API Keys" or "Credentials"

### 4. Generate API Key

- Click "Create New API Key" or similar button
- Give it a descriptive name (e.g., "ASTU RAG Scraper")
- Copy the generated API key

### 5. Add to Environment

Open your `.env` file:

```bash
nano /home/lelo/projects/Divas/server/.env
```

Add your API key:

```bash
VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxx  # Your actual key here
```

Save the file (Ctrl+O, Enter, Ctrl+X in nano)

## Verify Installation

```bash
cd /home/lelo/projects/Divas/server
source venv/bin/activate
python3 -c "import voyageai; print('✓ Voyage AI installed')"
```

## Test API Key

```bash
cd /home/lelo/projects/Divas/server
source venv/bin/activate
python3 << 'EOF'
import os
import voyageai

# Load from .env
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("VOYAGE_API_KEY")
if not api_key:
    print("✗ VOYAGE_API_KEY not found in environment")
    exit(1)

try:
    client = voyageai.Client(api_key=api_key)
    result = client.embed(["test"], model="voyage-3-large")
    print(f"✓ API key valid! Embedding dimension: {len(result.embeddings[0])}")
except Exception as e:
    print(f"✗ API key test failed: {e}")
EOF
```

## Pricing Information

Check current pricing at: https://www.voyageai.com/pricing

Typical costs:
- **Free Tier**: Usually includes some free tokens/requests
- **Pay-as-you-go**: Cost per million tokens embedded
- **Enterprise**: Custom pricing for high volume

For this scraping task (12 pages, ~100-150 chunks), costs should be minimal.

## Alternative: Run Without Embeddings (Not Recommended)

If you want to scrape without embeddings first:

```bash
# The scraper will warn but continue
# You can add embeddings later with a separate script
python3 scripts/scrape_astu_rag.py
```

However, **embeddings are crucial for RAG quality**. Without them, semantic search won't work.

## Troubleshooting

### "Invalid API Key" Error
- Double-check you copied the complete key
- Ensure no extra spaces in .env file
- Verify the key is active in Voyage AI dashboard

### "Rate Limit Exceeded"
- Wait a few minutes before retrying
- Check your plan limits
- Consider upgrading if needed

### Connection Errors
- Check internet connectivity
- Verify firewall isn't blocking requests
- Try using a VPN if blocked in your region

---

**Ready?** Once you have your API key set up, run:

```bash
cd /home/lelo/projects/Divas/server
source venv/bin/activate
./scripts/run_rag_scraper.sh
```
