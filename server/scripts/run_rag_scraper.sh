#!/bin/bash

# ASTU RAG Scraper - Setup and Run Script
# This script helps you set up and run the RAG knowledge base scraper

set -e

echo "=========================================="
echo "🚀 ASTU RAG Knowledge Base Scraper"
echo "=========================================="
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Please run: source venv/bin/activate"
    exit 1
fi

echo "✓ Virtual environment active: $VIRTUAL_ENV"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "✗ .env file not found!"
    echo "Please create a .env file with required configuration."
    exit 1
fi

echo "✓ .env file found"
echo ""

# Load environment variables (handle inline comments and special characters)
while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    
    # Remove inline comments and trim whitespace
    line=$(echo "$line" | sed 's/#.*$//' | sed 's/[[:space:]]*$//')
    
    # Skip if line is now empty or doesn't contain '='
    [[ -z "$line" || ! "$line" =~ = ]] && continue
    
    # Export the variable
    export "$line"
done < .env

# Check for Voyage API key
if [ -z "$VOYAGE_API_KEY" ] || [ "$VOYAGE_API_KEY" = " " ]; then
    echo "⚠️  WARNING: VOYAGE_API_KEY is not set!"
    echo ""
    echo "To get your Voyage AI API key:"
    echo "1. Visit: https://www.voyageai.com/"
    echo "2. Sign up for an account"
    echo "3. Get your API key"
    echo "4. Add to .env file: VOYAGE_API_KEY=your-key-here"
    echo ""
    read -p "Do you want to continue without embeddings? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo "⚠️  Continuing without embeddings..."
else
    echo "✓ Voyage API key found"
fi

echo ""

# Check database connection
echo "📡 Testing database connection..."
python3 -c "
import psycopg
import os

try:
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    with conn.cursor() as cur:
        cur.execute('SELECT NOW();')
        result = cur.fetchone()
    conn.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "✗ Database connection test failed!"
    exit 1
fi

echo ""

# Check if required packages are installed
echo "📦 Checking required packages..."
python3 -c "
import importlib
import sys

packages = ['bs4', 'html2text', 'voyageai', 'tiktoken', 'psycopg']
missing = []

for pkg in packages:
    try:
        importlib.import_module(pkg)
    except ImportError:
        missing.append(pkg)

if missing:
    print(f'✗ Missing packages: {', '.join(missing)}')
    print('Run: pip install beautifulsoup4 lxml html2text voyageai tiktoken')
    sys.exit(1)
else:
    print('✓ All required packages installed')
"

if [ $? -ne 0 ]; then
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Setup validation complete!"
echo "=========================================="
echo ""

# Ask to run scraper
read -p "Do you want to run the scraper now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting RAG scraper..."
    echo ""
    python3 scripts/scrape_astu_rag.py
else
    echo ""
    echo "To run the scraper manually:"
    echo "  python3 scripts/scrape_astu_rag.py"
    echo ""
fi
