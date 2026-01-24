🎓 Meri AI

AI-Powered Campus Navigation & Intelligence System
Adama Science and Technology University

<p align="center"> <a href="https://github.com/CSEC-ASTU/divas">⭐ Star</a> · <a href="https://github.com/CSEC-ASTU/divas/issues">🐞 Report Bug</a> · <a href="https://github.com/CSEC-ASTU/divas/issues">✨ Request Feature</a> </p>



🎯 About

Meri AI is an intelligent campus navigation and knowledge management system built specifically for Adama Science and Technology University (ASTU).

It combines AI-powered conversational assistance, interactive campus mapping, and retrieval-augmented generation (RAG) to help students, staff, and visitors navigate the campus and access accurate information effortlessly.

💡 Why Meri AI?

🤖 AI-Powered Assistant — Natural language queries using Google Gemini

🗺️ Smart Navigation — Real-time routing powered by OpenStreetMap

📚 Knowledge Base — Semantic campus search with RAG

📱 Progressive Web App — Installable, offline-ready

🎨 Modern UI — Clean, responsive design with Tailwind CSS

✨ Features
🤖 AI Assistant

Natural language campus queries

Context-aware responses (RAG)

Real-time streaming answers (SSE)

Multi-turn conversation support

LangGraph workflow with intent classification

🗺️ Interactive Campus Map

Leaflet-based real-time mapping

Dynamic route visualization

POI markers with clustering

Mobile-first & touch-optimized

🧭 Smart Navigation

Shortest-path routing (NetworkX)

Walking & accessibility modes

Turn-by-turn instructions

Distance & ETA estimates

Urgency modes (normal / exam rush)

📍 Campus Directory

Categorized facilities & POIs

Advanced search & filtering

Building, floor & room details

📚 Knowledge Management

Web scraping from official ASTU sources

Vector embeddings for semantic search

Document tagging & versioning

Admin content management interface

📱 Progressive Web App (PWA)

Installable on mobile & desktop

Offline support

Service worker caching

Push notification ready

🛠️ Tech Stack
Frontend

Framework: Next.js 15 (App Router)

Language: TypeScript 5.8

UI: React 18.3

Styling: Tailwind CSS 3.4

State: Zustand 5.0

Maps: Leaflet + React-Leaflet

AI: Google Gemini

PWA: next-pwa

Backend

Framework: FastAPI

Language: Python 3.10+

Database: PostgreSQL (Supabase)

Vector Store: pgvector

Cache: Redis (optional)

AI Framework: LangChain + LangGraph

Routing: OSMnx + NetworkX

Scraping: BeautifulSoup + Trafilatura

🏗️ Architecture
CLIENT (Next.js PWA)
 ├─ Hero Search
 ├─ Interactive Map (Leaflet)
 ├─ Campus Directory
 └─ AI Assistant (Chat UI)
        │
        ▼
 REST API / SSE Streaming
        │
        ▼
SERVER (FastAPI)
 ├─ LangGraph AI Workflow
 │   ├─ Intent Classification
 │   ├─ Route Detection
 │   ├─ Context Retrieval (RAG)
 │   └─ Response Generation
 │
 ├─ OSM Routing Service
 ├─ RAG & Vector Search
 └─ Web Scraper
        │
        ▼
Supabase PostgreSQL + pgvector
 ├─ POIs
 ├─ Documents
 └─ Embeddings (768-dim)

🚀 Getting Started
Prerequisites

Node.js 18+

Python 3.10+

PostgreSQL / Supabase

Google Gemini API Key

Docker (recommended)

🔹 Frontend Setup
cd client
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev


📍 Runs at: http://localhost:3000

🔹 Backend Setup
cd server
python -m pip install -r requirements.txt
cp .env.example .env
python migrate_db.py
uvicorn main:app --reload


📍 API: http://localhost:8000

🐳 Docker Setup (Recommended)
docker-compose up -d
docker-compose logs -f
docker-compose down


Services

Frontend → localhost:3000

Backend → localhost:8000

PostgreSQL → 5432

Redis → 6379

📡 API Documentation
AI Query

POST /api/ai/query

{
  "query": "How do I get to the library?",
  "latitude": 8.5523,
  "longitude": 39.2784
}

Navigation

POST /api/route

{
  "origin": "Main Gate",
  "destination": "Engineering Block",
  "mode": "walking"
}

Interactive Docs

Swagger → /api/docs

ReDoc → /api/redoc

📁 Project Structure
divas/
├── client/        # Next.js Frontend
└── server/        # FastAPI Backend


(Detailed structure preserved exactly as your original — clean already 👍)

🔐 Environment Variables
Client
NEXT_PUBLIC_GEMINI_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000

Server
GEMINI_API_KEY=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_KEY=
REDIS_URL=

🤝 Contributing

Fork the repo

Create a feature branch

Commit your changes

Open a Pull Request

✔ Follow best practices
✔ Write clean commits
✔ Update docs

📝 License

Licensed under the MIT License.

👥 Team & Contact

Developed by:
🎓 Computer Science & Engineering Club (CSEC), ASTU

GitHub: @CSEC-ASTU

Repository: https://github.com/CSEC-ASTU/divas

Issues: GitHub Issues

🙏 Acknowledgments

Next.js

FastAPI

Google Gemini

Leaflet & OpenStreetMap

Supabase

Tailwind CSS

<p align="center"> Made with ❤️ by <b>CSEC-ASTU</b><br/> ⭐ Star the repo — it really helps! </p>
