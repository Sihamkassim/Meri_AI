// ASTU Route AI - Admin Dashboard JavaScript
const API_BASE = 'http://localhost:4000';
let map = null;
let markers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadStats();
    loadPOIs();
    loadDocuments();
    checkHealth();
    
    // Auto-refresh stats every 30 seconds
    setInterval(loadStats, 30000);
});

// Initialize Leaflet Map
function initMap() {
    try {
        // Center on ASTU main gate
        map = L.map('map', {
            center: [8.5569, 39.2911],
            zoom: 15,
            zoomControl: true,
            attributionControl: true
        });
        
        // Define base layers
        const normalView = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            crossOrigin: true
        });
        
        const satelliteView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri',
            maxZoom: 19
        });
        
        const hybridView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles © Esri',
            maxZoom: 19
        });
        
        const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap, © CARTO',
            maxZoom: 19
        });
        
        // Create layer groups
        const hybrid = L.layerGroup([satelliteView, labels]);
        
        // Add default layer
        normalView.addTo(map);
        
        // Layer control
        const baseLayers = {
            "🗺️ Normal View": normalView,
            "🛰️ Satellite View": satelliteView,
            "🌍 Hybrid View": hybrid
        };
        
        L.control.layers(baseLayers).addTo(map);
        
        // Add ASTU marker
        L.marker([8.5569, 39.2911])
            .addTo(map)
            .bindPopup('<b>ASTU Main Gate</b>')
            .openPopup();
        
        // Force map to recalculate size after a short delay
        setTimeout(() => {
            map.invalidateSize();
            console.log('Map initialized and resized');
        }, 100);
        
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
}

// Load Statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/stats`);
        const data = await response.json();
        
        // Update server status
        document.getElementById('serverStatus').innerHTML = `
            <span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Server Online
        `;
        
        // Update counts
        document.getElementById('poiCount').textContent = data.campus_pois || 0;
        document.getElementById('docCount').textContent = data.documents || 0;
        document.getElementById('serviceCount').textContent = data.city_services || 0;
        document.getElementById('osmStatus').textContent = data.osm_loaded ? 'Yes' : 'No';
        
        // Update OSM status color
        const osmEl = document.getElementById('osmStatus');
        if (data.osm_loaded) {
            osmEl.classList.remove('text-orange-600');
            osmEl.classList.add('text-green-600');
        } else {
            osmEl.classList.remove('text-green-600');
            osmEl.classList.add('text-orange-600');
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        document.getElementById('serverStatus').innerHTML = `
            <span class="inline-block w-2 h-2 bg-red-400 rounded-full mr-2"></span>
            Server Offline
        `;
    }
}

// Check Health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('Health check:', data);
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // Activate button
    event.target.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    event.target.classList.remove('text-gray-500', 'hover:text-gray-700');
    
    // Refresh map if map tab
    if (tabName === 'map') {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// POI Management
function showAddPOIForm() {
    document.getElementById('addPOIForm').classList.remove('hidden');
}

function hideAddPOIForm() {
    document.getElementById('addPOIForm').classList.add('hidden');
    // Clear all form fields
    document.getElementById('poi_name').value = '';
    document.getElementById('poi_category').value = '';
    document.getElementById('poi_lat').value = '';
    document.getElementById('poi_lng').value = '';
    document.getElementById('poi_desc').value = '';
    document.getElementById('poi_building').value = '';
    document.getElementById('poi_block').value = '';
    document.getElementById('poi_floor').value = '';
    document.getElementById('poi_room').value = '';
    document.getElementById('poi_capacity').value = '';
}

async function addPOI() {
    const poi = {
        name: document.getElementById('poi_name').value,
        category: document.getElementById('poi_category').value,
        latitude: parseFloat(document.getElementById('poi_lat').value),
        longitude: parseFloat(document.getElementById('poi_lng').value),
        description: document.getElementById('poi_desc').value,
        building: document.getElementById('poi_building')?.value || null,
        block_num: document.getElementById('poi_block')?.value || null,
        floor: document.getElementById('poi_floor')?.value ? parseInt(document.getElementById('poi_floor').value) : null,
        room_num: document.getElementById('poi_room')?.value || null,
        capacity: document.getElementById('poi_capacity')?.value ? parseInt(document.getElementById('poi_capacity').value) : null
    };
    
    if (!poi.name || !poi.category || !poi.latitude || !poi.longitude) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/pois`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(poi)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create POI');
        }
        
        const result = await response.json();
        
        // Add marker to map
        L.marker([poi.latitude, poi.longitude], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        })
        .addTo(map)
        .bindPopup(`<b>${poi.name}</b><br>${poi.category}`);
        
        alert(`POI "${poi.name}" added successfully!`);
        hideAddPOIForm();
        loadPOIs();
        loadStats();  // Refresh stats
    } catch (error) {
        console.error('Failed to add POI:', error);
        alert(`Failed to add POI: ${error.message}`);
    }
}

async function loadPOIs() {
    const container = document.getElementById('poisList');
    try {
        const response = await fetch(`${API_BASE}/api/admin/pois`);
        const data = await response.json();
        
        if (data.pois && data.pois.length > 0) {
            container.innerHTML = data.pois.map(poi => `
                <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-lg">${poi.name}</h3>
                            <p class="text-sm text-gray-600">${poi.category}</p>
                            ${poi.building ? `<p class="text-sm text-gray-500">Building: ${poi.building}</p>` : ''}
                            ${poi.block_num ? `<p class="text-sm text-gray-500">Block: ${poi.block_num}</p>` : ''}
                            ${poi.floor ? `<p class="text-sm text-gray-500">Floor: ${poi.floor}</p>` : ''}
                            ${poi.room_num ? `<p class="text-sm text-gray-500">Room: ${poi.room_num}</p>` : ''}
                            ${poi.description ? `<p class="text-sm mt-2">${poi.description}</p>` : ''}
                        </div>
                        <span class="text-xs text-gray-400">${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}</span>
                    </div>
                </div>
            `).join('');
            
            // Add markers to map
            data.pois.forEach(poi => {
                L.marker([poi.latitude, poi.longitude])
                    .addTo(map)
                    .bindPopup(`<b>${poi.name}</b><br>${poi.category}`);
            });
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No POIs yet. Add your first campus location!</p>';
        }
    } catch (error) {
        console.error('Failed to load POIs:', error);
        container.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load POIs</p>';
    }
}

// Document Management
function showAddDocForm() {
    document.getElementById('addDocForm').classList.remove('hidden');
}

function hideAddDocForm() {
    document.getElementById('addDocForm').classList.add('hidden');
    document.getElementById('doc_title').value = '';
    document.getElementById('doc_content').value = '';
    document.getElementById('doc_category').value = '';
}

async function addDocument() {
    const doc = {
        title: document.getElementById('doc_title').value,
        content: document.getElementById('doc_content').value,
        source: document.getElementById('doc_category').value
    };
    
    if (!doc.title || !doc.content || !doc.source) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', doc.title);
        formData.append('content', doc.content);
        formData.append('source', doc.source);
        
        const response = await fetch(`${API_BASE}/api/admin/documents`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to create document');
        }
        
        const result = await response.json();
        alert(`Document "${doc.title}" added successfully!`);
        hideAddDocForm();
        loadDocuments();
        loadStats();  // Refresh stats
    } catch (error) {
        console.error('Failed to add document:', error);
        alert(`Failed to add document: ${error.message}`);
    }
}

async function loadDocuments() {
    const container = document.getElementById('docsList');
    try {
        const response = await fetch(`${API_BASE}/api/admin/documents`);
        const data = await response.json();
        
        if (data.documents && data.documents.length > 0) {
            container.innerHTML = data.documents.map(doc => `
                <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <h3 class="font-semibold text-lg">${doc.title}</h3>
                    <p class="text-sm text-gray-600">${doc.source || 'Unknown source'}</p>
                    <p class="text-xs text-gray-400 mt-2">${new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No documents yet. Add knowledge base content!</p>';
        }
    } catch (error) {
        console.error('Failed to load documents:', error);
        container.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load documents</p>';
    }
}

// Test AI System
async function testAI() {
    const query = document.getElementById('test_query').value;
    const mode = document.getElementById('test_mode').value;
    const urgency = document.getElementById('test_urgency').value;
    
    if (!query) {
        alert('Please enter a question');
        return;
    }
    
    const resultDiv = document.getElementById('testResult');
    const answerDiv = document.getElementById('testAnswer');
    const intentDiv = document.getElementById('testIntent');
    const reasoningDiv = document.getElementById('testReasoning');
    
    // Show loading
    answerDiv.innerHTML = '<p class="text-gray-500">🤖 Thinking...</p>';
    resultDiv.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_BASE}/api/ai/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                mode: mode,
                urgency: urgency
            })
        });
        
        const data = await response.json();
        
        // Display results
        answerDiv.innerHTML = `<div class="whitespace-pre-wrap">${data.answer}</div>`;
        intentDiv.innerHTML = `<strong>Intent:</strong> ${data.intent} | <strong>Confidence:</strong> ${data.confidence}`;
        
        if (data.reasoning_steps && data.reasoning_steps.length > 0) {
            reasoningDiv.innerHTML = `
                <strong>Reasoning Steps:</strong><br>
                ${data.reasoning_steps.map((step, i) => `${i + 1}. ${step}`).join('<br>')}
            `;
        }
        
    } catch (error) {
        console.error('AI test failed:', error);
        answerDiv.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    }
}

// Test OSM Route
async function testOSMRoute() {
    const startLat = parseFloat(document.getElementById('osm_start_lat').value);
    const startLng = parseFloat(document.getElementById('osm_start_lng').value);
    const endLat = parseFloat(document.getElementById('osm_end_lat').value);
    const endLng = parseFloat(document.getElementById('osm_end_lng').value);
    
    const resultDiv = document.getElementById('osmResult');
    const infoDiv = document.getElementById('osmRouteInfo');
    
    infoDiv.innerHTML = '<p class="text-gray-500">🗺️ Calculating route...</p>';
    resultDiv.classList.remove('hidden');
    
    try {
        // TODO: Add OSM route endpoint
        const response = await fetch(`${API_BASE}/api/osm/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_lat: startLat,
                start_lng: startLng,
                end_lat: endLat,
                end_lng: endLng
            })
        });
        
        const data = await response.json();
        
        infoDiv.innerHTML = `
            <div class="space-y-2">
                <p><strong>Distance:</strong> ${data.distance_meters}m (${data.distance_km}km)</p>
                <p><strong>Duration:</strong> ${data.duration_minutes} minutes</p>
                <p><strong>Nodes:</strong> ${data.nodes_count}</p>
                <div class="mt-4">
                    <strong>Turn-by-turn:</strong>
                    <ol class="list-decimal ml-5 mt-2">
                        ${data.instructions.map(inst => `<li>${inst}</li>`).join('')}
                    </ol>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('OSM route failed:', error);
        infoDiv.innerHTML = `<p class="text-orange-600">OSM integration coming soon! Error: ${error.message}</p>`;
    }
}
