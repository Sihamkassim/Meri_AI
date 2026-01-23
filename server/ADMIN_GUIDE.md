# Admin Dashboard - Quick Start Guide

## 🎯 What's New

### 1. Detailed POI Location Fields
You can now add complete location information for every campus point of interest:

**New Fields:**
- **Building Name** - e.g., "Engineering Block", "Science Building"
- **Block Number** - e.g., "A", "B", "C"
- **Floor** - Floor number (1, 2, 3, etc.)
- **Room Number** - e.g., "201", "Lab-3", "Office-5"
- **Capacity** - How many people the room/lab holds
- **Facilities** - Equipment available (projector, whiteboard, computers)

### 2. Working Backend APIs
All admin operations now save to the database:

- ✅ Add POIs with full location details
- ✅ Upload documents for RAG
- ✅ Real-time statistics (counts update live)
- ✅ OSM status indicator (shows "Yes" when loaded)

### 3. Fixed Map & OSM
- ✅ Leaflet map loads automatically
- ✅ OSM graph downloads 1km radius (not huge area)
- ✅ Map markers for all POIs
- ✅ Interactive map with popups

---

## 📝 How to Add Campus Locations

### Step 1: Access Admin Dashboard
Open browser: **http://localhost:4000**

### Step 2: Go to "Campus POIs" Tab
Click on the **📍 Campus POIs** tab

### Step 3: Click "+ Add POI"
Fill in the form with details:

#### Example 1: Computer Lab
```
Name: Computer Lab 1
Category: lab
Building: Engineering Block
Block Number: A
Floor: 2
Room Number: Lab-201
Capacity: 40
Latitude: 8.5571
Longitude: 39.2916
Description: Main computer lab with 40 workstations, projector, and whiteboard
```

#### Example 2: Classroom
```
Name: Lecture Hall 3
Category: classroom
Building: Science Building
Block Number: B
Floor: 1
Room Number: LH-103
Capacity: 120
Latitude: 8.5575
Longitude: 39.2920
Description: Large lecture hall with tiered seating, dual projectors
```

#### Example 3: Library
```
Name: Central Library
Category: library
Building: Library Block
Block Number: (leave empty)
Floor: (leave empty - multi-floor)
Room Number: (leave empty)
Capacity: 500
Latitude: 8.5580
Longitude: 39.2925
Description: Main university library with 3 floors, study rooms, computer stations
```

### Step 4: Click "💾 Save POI"
The POI will be saved to the database and appear on the map!

---

## 📚 How to Add Knowledge Base Documents

### Step 1: Go to "Knowledge Base" Tab
Click on the **📚 Knowledge Base** tab

### Step 2: Click "+ Add Document"
Fill in the form:

#### Example: Admission Requirements
```
Title: Undergraduate Admission Requirements 2026
Content: 
ASTU accepts students based on the national examination results.
Minimum requirements:
- Mathematics: Grade 12 completion
- Physics/Chemistry: Grade 12 completion
- English: Minimum C grade
- Total GPA: Minimum 2.75

Application deadline: July 15, 2026
Required documents: Birth certificate, grade transcripts, national exam results

Category: admission
```

### Step 3: Click "Save Document"
The document will be:
- ✅ Saved to database
- ✅ Converted to vector embedding (768 dimensions)
- ✅ Available for AI RAG queries

---

## 🗺️ How to Test OSM Routes

### Step 1: Go to "OSM Routes" Tab
Click on the **🗺️ OSM Routes** tab

### Step 2: Enter Coordinates
```
Start Latitude: 8.5569
Start Longitude: 39.2911
End Latitude: 8.5580
End Longitude: 39.2920
```

### Step 3: Click "Calculate Route"
You'll see:
- Distance in meters and km
- Estimated walking time
- Turn-by-turn directions
- Route plotted on map

---

## 🤖 How to Test AI System

### Step 1: Go to "Test AI" Tab
Click on the **🧪 Test AI** tab

### Step 2: Ask Questions
Try these examples:

**Navigation Query:**
```
Question: How do I get from the main gate to the library?
Mode: intelligent
Urgency: normal
```

**Information Query:**
```
Question: What are the admission requirements?
Mode: intelligent
Urgency: normal
```

**Mixed Query:**
```
Question: Where is the computer lab and how do I get there from block A?
Mode: intelligent  
Urgency: normal
```

---

## 🔍 Understanding the Dashboard Stats

**Top Cards Display:**

1. **CAMPUS POIS** - Total points of interest added (buildings, labs, etc.)
2. **DOCUMENTS** - Total knowledge base documents for RAG
3. **CITY SERVICES** - POIs categorized as "service" (cafeteria, parking, etc.)
4. **OSM LOADED** - Shows "Yes" when OSM graph is ready (turns green)

**What "OSM LOADED: No" means:**
- OSM graph is still downloading
- First-time download takes 30-60 seconds
- Refresh page after 1 minute - should show "Yes"

**What "OSM LOADED: Yes" means:**
- ✅ Walking network loaded (nodes + edges)
- ✅ Real route calculation available
- ✅ Turn-by-turn directions working

---

## 📍 Getting Coordinates for Campus Locations

### Option 1: Use the Map
1. Go to "Map View" tab
2. Right-click on location
3. Select "Show coordinates" (browser dependent)
4. Or look at URL when you click

### Option 2: Use Google Maps
1. Open Google Maps
2. Find ASTU campus (Adama, Ethiopia)
3. Right-click on the exact location
4. Click on coordinates to copy them
5. Format: First number is latitude, second is longitude

### Option 3: Use the Map on Dashboard
1. The map is centered on ASTU main gate: (8.5569, 39.2911)
2. Use this as reference point
3. Nearby buildings are typically within ±0.001 degrees

---

## ⚠️ Troubleshooting

### Map Not Showing
**Problem:** Gray box instead of map  
**Solution:** Check internet connection - Leaflet needs to download tiles

### OSM Status Stuck on "No"
**Problem:** OSM LOADED shows "No" for >2 minutes  
**Solution:** 
1. Check server logs for errors
2. Verify internet connection (downloads from OpenStreetMap)
3. Try refreshing the page

### Can't Add POI
**Problem:** "Failed to add POI" error  
**Solution:**
1. Check all required fields are filled (name, category, lat, lng)
2. Verify latitude/longitude format (use decimal degrees)
3. Check server is running (look at "Server Online" indicator)

### Documents Not Saving
**Problem:** "Failed to add document" error  
**Solution:**
1. Check Gemini API key is configured (.env file)
2. Verify database connection
3. Check document content is not empty

---

## 🎨 Admin Dashboard Features

### Map View Tab
- Interactive Leaflet map centered on ASTU
- All POIs displayed as markers
- Click markers to see POI details
- Pan and zoom freely

### Campus POIs Tab
- Add new campus locations
- View all existing POIs
- See detailed location info (building, block, floor, room)
- Edit/delete capabilities (coming soon)

### Knowledge Base Tab
- Upload text documents
- Add FAQs and policies
- Content automatically vectorized for AI
- Powers the RAG system

### Test AI Tab
- Test the LangGraph intelligent routing
- See intent classification
- View reasoning steps
- Test different query types

### OSM Routes Tab
- Test real route calculation
- Get walking directions
- See distance and duration estimates
- Verify OSM integration

---

## 🚀 Next Steps After Adding Data

1. **Populate POIs** - Add all major campus buildings, labs, offices
2. **Add Documents** - Upload admission info, academic policies, FAQs
3. **Test Routes** - Verify OSM calculates accurate paths
4. **Test AI** - Ask questions to verify RAG retrieves correct documents
5. **Integrate** - Connect frontend chatbot to `/api/ai/query` endpoint

---

## 📊 API Endpoints (For Developers)

### Admin APIs
```
GET  /api/admin/stats          - Get dashboard statistics
GET  /api/admin/pois           - List all POIs
POST /api/admin/pois           - Create new POI
GET  /api/admin/documents      - List all documents  
POST /api/admin/documents      - Create new document
```

### AI APIs
```
POST /api/ai/query             - Intelligent query (JSON response)
POST /api/ai/query/stream      - Streaming query (SSE)
```

### OSM APIs
```
POST /api/osm/route            - Calculate route
GET  /api/osm/stats            - Graph statistics
```

---

**Server:** http://localhost:4000  
**API Docs:** http://localhost:4000/api/docs  
**Last Updated:** 2026-01-23

**Questions?** Check the server logs in terminal for detailed error messages.
