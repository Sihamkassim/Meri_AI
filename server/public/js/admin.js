// ASTU Route AI - Admin Dashboard JavaScript
const API_BASE = (typeof process !== 'undefined' && process.env.API_BASE) || 'http://localhost:4000';
let map = null;
let poiMap = null;
let testRouteMap = null;  // NEW: Dedicated map for Test AI route visualization
let markers = [];

// Global state
let isSelectingLocation = false;
let tempMarker = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initPOIMap();
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
        
        // Labels layer (reusable)
        const labelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
            attribution: '© CARTO',
            maxZoom: 19,
            pane: 'shadowPane'
        });
        
        // Satellite with labels
        const satelliteView = L.layerGroup([
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © Esri',
                maxZoom: 19
            }),
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
                attribution: '© CARTO',
                maxZoom: 19,
                pane: 'shadowPane'
            })
        ]);
        
        // Hybrid view combining satellite and labels
        const hybridView = L.layerGroup([
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © Esri',
                maxZoom: 19
            }),
            labelsLayer
        ]);
        
        // Add default layer
        normalView.addTo(map);
        
        // Layer control
        const baseLayers = {
            "🗺️ Street Map": normalView,
            "🛰️ Satellite + Labels": satelliteView,
            "🌍 Hybrid": hybridView
        };
        
        L.control.layers(baseLayers).addTo(map);
        
        // Add ASTU marker
        L.marker([8.5569, 39.2911])
            .addTo(map)
            .bindPopup('<b>ASTU Main Gate</b>')
            .openPopup();
        
        // Add click handler for POI selection
        map.on('click', function(e) {
            if (isSelectingLocation) {
                selectLocationOnMap(e.latlng);
            }
        });
        
        // Force map to recalculate size after a short delay
        setTimeout(() => {
            map.invalidateSize();
            console.log('Map initialized and resized');
        }, 100);
        
    } catch (error) {
        console.error('Failed to initialize map:', error);
    }
}

// Initialize POI Map (on POI tab)
function initPOIMap() {
    try {
        poiMap = L.map('poiMap', {
            center: [8.5569, 39.2911],
            zoom: 16,
            zoomControl: true
        });
        
        // Define base layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri'
        });
        
        const hybridLayer = L.layerGroup([
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: '© Esri'
            }),
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© CARTO'
            })
        ]);
        
        // Add default layer
        osmLayer.addTo(poiMap);
        
        // Add layer control
        const baseLayers = {
            '🗺️ Street Map': osmLayer,
            '🛰️ Satellite': satelliteLayer,
            '🌍 Hybrid': hybridLayer
        };
        
        L.control.layers(baseLayers).addTo(poiMap);
        
        // ASTU main marker
        L.marker([8.5569, 39.2911])
            .addTo(poiMap)
            .bindPopup('<b>ASTU Main Gate</b>');
        
        // Click handler for location selection - always active
        poiMap.on('click', function(e) {
            selectLocationOnMap(e.latlng);
        });
        
        setTimeout(() => poiMap.invalidateSize(), 100);
    } catch (error) {
        console.error('Failed to initialize POI map:', error);
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
    
    // Refresh maps and enable selection mode
    if (tabName === 'map') {
        setTimeout(() => map.invalidateSize(), 100);
        isSelectingLocation = false;
    } else if (tabName === 'pois') {
        setTimeout(() => poiMap.invalidateSize(), 100);
        isSelectingLocation = true;
        enableMapSelection();
    }
}

// POI Management
function openModal() {
    const modal = document.getElementById('poiModal');
    modal.classList.remove('hidden');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeModal() {
    const modal = document.getElementById('poiModal');
    modal.classList.add('hidden');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Remove temp marker
    if (tempMarker) {
        poiMap.removeLayer(tempMarker);
        tempMarker = null;
    }
    
    // Clear form fields
    clearPOIForm();
}

function clearPOIForm() {
    document.getElementById('poi_id').value = '';
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
    document.getElementById('modalCoordinates').textContent = 'Location: Not selected';
    document.getElementById('poiModalTitle').textContent = '📍 New Campus POI';
    document.getElementById('savePoiBtnText').textContent = 'Save POI';
}

async function savePOI() {
    const poiId = document.getElementById('poi_id').value;
    const isEdit = poiId !== '';
    
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
        showNotification('Please fill all required fields: Name, Category, and Location', 'warning');
        return;
    }
    
    try {
        const url = isEdit ? `${API_BASE}/api/admin/pois/${poiId}` : `${API_BASE}/api/admin/pois`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(poi)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to ${isEdit ? 'update' : 'create'} POI`);
        }
        
        const result = await response.json();
        
        showNotification(`POI "${poi.name}" ${isEdit ? 'updated' : 'added'} successfully! 🎉 Embedding: ${result.embedding_dim}D`, 'success');
        closeModal();
        loadPOIs();
        loadStats();
    } catch (error) {
        console.error(`Failed to ${isEdit ? 'update' : 'create'} POI:`, error);
        showNotification(`Failed to ${isEdit ? 'update' : 'create'} POI: ${error.message}`, 'error');
    }
}

async function editPOI(poiId) {
    try {
        // Fetch POI data
        const response = await fetch(`${API_BASE}/api/admin/pois`);
        const data = await response.json();
        const poi = data.pois.find(p => p.id === poiId);
        
        if (!poi) {
            showNotification('POI not found', 'error');
            return;
        }
        
        // Fill form with existing data
        document.getElementById('poi_id').value = poi.id;
        document.getElementById('poi_name').value = poi.name;
        document.getElementById('poi_category').value = poi.category;
        document.getElementById('poi_lat').value = poi.latitude;
        document.getElementById('poi_lng').value = poi.longitude;
        document.getElementById('poi_desc').value = poi.description || '';
        document.getElementById('poi_building').value = poi.building || '';
        document.getElementById('poi_block').value = poi.block_num || '';
        document.getElementById('poi_floor').value = poi.floor || '';
        document.getElementById('poi_room').value = poi.room_num || '';
        document.getElementById('poi_capacity').value = poi.capacity || '';
        document.getElementById('modalCoordinates').textContent = `Location: ${poi.latitude.toFixed(6)}, ${poi.longitude.toFixed(6)}`;
        document.getElementById('poiModalTitle').textContent = '✏️ Edit Campus POI';
        document.getElementById('savePoiBtnText').textContent = 'Update POI';
        
        // Add marker on map
        if (tempMarker) {
            poiMap.removeLayer(tempMarker);
        }
        tempMarker = L.marker([poi.latitude, poi.longitude], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [30, 48],
                iconAnchor: [15, 48]
            })
        }).addTo(poiMap);
        
        poiMap.setView([poi.latitude, poi.longitude], 17);
        
        openModal();
    } catch (error) {
        console.error('Failed to load POI:', error);
        showNotification('Failed to load POI data', 'error');
    }
}

async function deletePOI(poiId, poiName) {
    if (!confirm(`Are you sure you want to delete "${poiName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/pois/${poiId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete POI');
        }
        
        showNotification(`POI "${poiName}" deleted successfully! 🗑️`, 'success');
        loadPOIs();
        loadStats();
    } catch (error) {
        console.error('Failed to delete POI:', error);
        showNotification(`Failed to delete POI: ${error.message}`, 'error');
    }
}

function enableMapSelection() {
    // Map is always in selection mode in POI tab
    isSelectingLocation = true;
}

function disableMapSelection() {
    // Keep selection mode always active in POI tab
    isSelectingLocation = true;
}

function selectLocationOnMap(latlng) {
    // Remove previous temp marker
    if (tempMarker) {
        poiMap.removeLayer(tempMarker);
    }
    
    // Add new temp marker with pulsing effect
    tempMarker = L.marker(latlng, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [30, 48],
            iconAnchor: [15, 48],
            popupAnchor: [0, -48]
        })
    }).addTo(poiMap);
    
    // Fill coordinates
    document.getElementById('poi_lat').value = latlng.lat.toFixed(6);
    document.getElementById('poi_lng').value = latlng.lng.toFixed(6);
    
    // Update modal coordinate display
    document.getElementById('modalCoordinates').textContent = 
        `Location: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    
    // Open modal
    openModal();
    
    // Pan map to marker
    poiMap.panTo(latlng);
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
                        <div class="flex-1">
                            <h3 class="font-semibold text-lg">${poi.name}</h3>
                            <p class="text-sm text-gray-600">${poi.category}</p>
                            ${poi.building ? `<p class="text-sm text-gray-500">Building: ${poi.building}</p>` : ''}
                            ${poi.block_num ? `<p class="text-sm text-gray-500">Block: ${poi.block_num}</p>` : ''}
                            ${poi.floor ? `<p class="text-sm text-gray-500">Floor: ${poi.floor}</p>` : ''}
                            ${poi.room_num ? `<p class="text-sm text-gray-500">Room: ${poi.room_num}</p>` : ''}
                            ${poi.description ? `<p class="text-sm mt-2">${poi.description}</p>` : ''}
                            <span class="text-xs text-gray-400 mt-2 block">${poi.latitude.toFixed(4)}, ${poi.longitude.toFixed(4)}</span>
                        </div>
                        <div class="flex gap-2 ml-4">
                            <button onclick="editPOI(${poi.id})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition" title="Edit POI">
                                ✏️ Edit
                            </button>
                            <button onclick="deletePOI(${poi.id}, ${JSON.stringify(poi.name)})" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition" title="Delete POI">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add markers to both maps
            data.pois.forEach(poi => {
                L.marker([poi.latitude, poi.longitude])
                    .addTo(map)
                    .bindPopup(`<b>${poi.name}</b><br>${poi.category}`);
                L.marker([poi.latitude, poi.longitude])
                    .addTo(poiMap)
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
    const form = document.getElementById('addDocForm');
    form.classList.add('hidden');
    
    // Reset form
    document.getElementById('doc_id').value = '';
    document.getElementById('doc_title').value = '';
    document.getElementById('doc_content').value = '';
    document.getElementById('doc_category').value = '';
    
    // Reset heading and button
    const heading = form.querySelector('h4');
    heading.textContent = 'Add Knowledge Document';
    
    const saveBtn = form.querySelector('button[onclick*="Document"]');
    saveBtn.textContent = 'Save Document';
    saveBtn.setAttribute('onclick', 'addDocument()');
}

async function addDocument() {
    const doc = {
        title: document.getElementById('doc_title').value,
        content: document.getElementById('doc_content').value,
        source: document.getElementById('doc_category').value
    };
    
    if (!doc.title || !doc.content || !doc.source) {
        showNotification('Please fill all required fields: Title, Content, and Category', 'warning');
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
        showNotification(`✓ Document "${doc.title}" added with embedding! Ready for RAG queries.`, 'success');
        hideAddDocForm();
        loadDocuments();
        loadStats();  // Refresh stats
    } catch (error) {
        console.error('Failed to add document:', error);
        showNotification(`Failed to add document: ${error.message}`, 'error');
    }
}

function editDocument(id, title, content, source) {
    // Populate form with document data
    document.getElementById('doc_id').value = id;
    document.getElementById('doc_title').value = title;
    document.getElementById('doc_content').value = content;
    document.getElementById('doc_category').value = source;
    
    // Show form and update button text
    const form = document.getElementById('addDocForm');
    const heading = form.querySelector('h4');
    heading.textContent = 'Edit Document';
    form.classList.remove('hidden');
    
    // Show Save instead of Add button
    const saveBtn = form.querySelector('button[onclick="addDocument()"]');
    saveBtn.textContent = 'Update Document';
    saveBtn.setAttribute('onclick', 'saveDocument()');
}

async function saveDocument() {
    const docId = document.getElementById('doc_id').value;
    const doc = {
        title: document.getElementById('doc_title').value,
        content: document.getElementById('doc_content').value,
        source: document.getElementById('doc_category').value
    };
    
    if (!doc.title || !doc.content || !doc.source) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', doc.title);
        formData.append('content', doc.content);
        formData.append('source', doc.source);
        
        const url = docId ? `${API_BASE}/api/admin/documents/${docId}` : `${API_BASE}/api/admin/documents`;
        const method = docId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to save document');
        }
        
        const result = await response.json();
        showNotification(`✓ Document "${doc.title}" ${docId ? 'updated' : 'added'} with new embedding!`, 'success');
        hideAddDocForm();
        loadDocuments();
        loadStats();
    } catch (error) {
        console.error('Failed to save document:', error);
        showNotification(`Failed to save document: ${error.message}`, 'error');
    }
}

async function deleteDocument(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/documents/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete document');
        }
        
        showNotification(`✓ Document "${title}" deleted successfully`, 'success');
        loadDocuments();
        loadStats();
    } catch (error) {
        console.error('Failed to delete document:', error);
        showNotification(`Failed to delete: ${error.message}`, 'error');
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
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h3 class="font-semibold text-lg">${doc.title}</h3>
                            <p class="text-sm text-gray-600 mt-1">${doc.source || 'Unknown source'}</p>
                            <p class="text-xs text-gray-500 mt-2 line-clamp-2">${doc.content?.substring(0, 100)}...</p>
                            <p class="text-xs text-gray-400 mt-2">${new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex gap-2 ml-4">
                            <button onclick="editDocument(${doc.id}, ${JSON.stringify(doc.title)}, ${JSON.stringify(doc.content)}, ${JSON.stringify(doc.source || '')})" 
                                class="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm">
                                ✏️ Edit
                            </button>
                            <button onclick="deleteDocument(${doc.id}, ${JSON.stringify(doc.title)})" 
                                class="text-red-600 hover:text-red-800 px-3 py-1 text-sm">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
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

// Detect GPS Location
function detectLocation() {
    if (!navigator.geolocation) {
        showNotification('Geolocation not supported by your browser', 'warning');
        return;
    }
    
    showNotification('Detecting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('test_latitude').value = position.coords.latitude.toFixed(6);
            document.getElementById('test_longitude').value = position.coords.longitude.toFixed(6);
            showNotification('Location detected!', 'success');
        },
        (error) => {
            showNotification('Could not get location: ' + error.message, 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Test AI System with SSE Streaming
async function testAI() {
    const query = document.getElementById('test_query').value;
    const mode = document.getElementById('test_mode').value;
    const urgency = document.getElementById('test_urgency').value;
    const latitude = document.getElementById('test_latitude').value;
    const longitude = document.getElementById('test_longitude').value;
    
    if (!query) {
        showNotification('Please enter a question to test', 'warning');
        return;
    }
    
    const resultDiv = document.getElementById('testResult');
    const answerDiv = document.getElementById('testAnswer');
    const intentDiv = document.getElementById('testIntent');
    const reasoningDiv = document.getElementById('testReasoning');
    const routeVizDiv = document.getElementById('testRouteViz');
    
    // Clear previous results
    answerDiv.innerHTML = '<p class="text-gray-500">⏳ Waiting for response...</p>';
    reasoningDiv.innerHTML = '<div class="text-gray-500">🔄 Connecting to AI stream...</div>';
    intentDiv.innerHTML = '';
    routeVizDiv.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    
    // Build query parameters
    const params = new URLSearchParams({
        query: query,
        mode: mode,
        urgency: urgency
    });
    
    if (latitude) params.append('latitude', latitude);
    if (longitude) params.append('longitude', longitude);
    
    try {
        // Use SSE streaming endpoint
        const eventSource = new EventSource(`${API_BASE}/api/ai/query/stream?${params.toString()}`);
        
        let reasoningSteps = [];
        let finalAnswer = '';
        let finalIntent = '';
        let finalConfidence = '';
        let sources = [];
        let startCoords = null;
        let endCoords = null;
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'reasoning') {
                    // Show reasoning steps in real-time
                    reasoningSteps.push(data.content);
                    reasoningDiv.innerHTML = `
                        <div class="space-y-1">
                            ${reasoningSteps.map((step, i) => `
                                <div class="flex items-start gap-2">
                                    <span class="text-blue-600 font-bold">${i + 1}.</span>
                                    <span>${step}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    // Auto-scroll to bottom
                    reasoningDiv.scrollTop = reasoningDiv.scrollHeight;
                }
                else if (data.type === 'answer') {
                    // Final answer received
                    const result = data.content;
                    finalAnswer = result.final_answer || result.answer || 'No answer generated';
                    finalIntent = result.intent || 'UNKNOWN';
                    finalConfidence = result.rag_confidence || result.geo_confidence || 'medium';
                    sources = result.sources_used || [];
                    
                    // Extract coordinates if navigation query
                    if (result.start_coordinates) {
                        startCoords = result.start_coordinates;
                        endCoords = result.end_coordinates;
                    }
                    
                    // Display answer
                    let answerHTML = `<div class="whitespace-pre-wrap">${finalAnswer}</div>`;
                    
                    if (sources.length > 0) {
                        answerHTML += `
                            <div class="mt-4 p-3 bg-gray-50 rounded border">
                                <strong class="text-sm">📚 Sources:</strong>
                                <ul class="list-disc ml-5 mt-2 text-sm">
                                    ${sources.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        `;
                    }
                    
                    answerDiv.innerHTML = answerHTML;
                    intentDiv.innerHTML = `
                        <strong>Intent:</strong> <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">${finalIntent}</span> 
                        <strong class="ml-4">Confidence:</strong> <span class="px-2 py-1 bg-green-100 text-green-800 rounded">${finalConfidence}</span>
                    `;
                    
                    // Show route visualization if navigation query
                    if (startCoords && endCoords) {
                        const routeCoords = result.route_coords || null;
                        visualizeRoute(startCoords, endCoords, result.distance_estimate, routeCoords);
                        
                        // Save destination for tracking
                        currentDestination = {
                            lat: endCoords.lat,
                            lng: endCoords.lon,
                            name: endCoords.name
                        };
                        
                        // Show tracking button
                        document.getElementById('startTrackingBtn')?.classList.remove('hidden');
                    }
                }
                else if (data.type === 'done') {
                    eventSource.close();
                    showNotification('AI response complete! ✅', 'success');
                }
                else if (data.type === 'error') {
                    eventSource.close();
                    answerDiv.innerHTML = `<p class="text-red-600">❌ Error: ${data.content}</p>`;
                    showNotification('AI error occurred', 'error');
                }
            } catch (e) {
                console.error('Error parsing SSE data:', e, event.data);
            }
        };
        
        eventSource.onerror = (error) => {
            eventSource.close();
            console.error('SSE connection error:', error);
            answerDiv.innerHTML = `<p class="text-red-600">❌ Connection error. Please try again.</p>`;
            reasoningDiv.innerHTML = `<div class="text-red-500">Connection lost. Check if server is running.</div>`;
            showNotification('Connection error', 'error');
        };
        
    } catch (error) {
        console.error('AI test failed:', error);
        answerDiv.innerHTML = `<p class="text-red-600">❌ Error: ${error.message}</p>`;
        showNotification('Request failed', 'error');
    }
}

// Visualize Route on Map
function visualizeRoute(startCoords, endCoords, distance, routeCoords = null) {
    const routeVizDiv = document.getElementById('testRouteViz');
    const distanceSpan = document.getElementById('routeDistance');
    const timeSpan = document.getElementById('routeTime');
    
    // Calculate estimated time (assume 5 km/h walking speed)
    const distanceKm = parseFloat(distance) || 0;
    const timeMinutes = Math.ceil((distanceKm / 5) * 60);
    
    distanceSpan.textContent = `Distance: ${distance}`;
    timeSpan.textContent = `Est. Time: ${timeMinutes} min`;
    routeVizDiv.classList.remove('hidden');
    
    // Initialize test route map if not already created
    if (!testRouteMap) {
        testRouteMap = L.map('testRouteMap', {
            center: [8.5569, 39.2911],
            zoom: 16,
            zoomControl: true
        });
        
        // Add satellite + labels layer
        L.layerGroup([
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles © Esri',
                maxZoom: 19
            }),
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png', {
                attribution: '© CARTO',
                maxZoom: 19
            })
        ]).addTo(testRouteMap);
        
        // Force map to recalculate size
        setTimeout(() => testRouteMap.invalidateSize(), 100);
    }
    
    // Clear existing route layers on test route map
    testRouteMap.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            testRouteMap.removeLayer(layer);
        }
    });
    
    // Add start marker
    L.marker([startCoords.lat, startCoords.lon], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #10b981; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚩 ${startCoords.name}</div>`,
            iconSize: [200, 40],
            iconAnchor: [100, 40]
        })
    }).addTo(testRouteMap);
    
    // Add end marker
    L.marker([endCoords.lat, endCoords.lon], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #ef4444; color: white; padding: 8px 12px; border-radius: 8px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🎯 ${endCoords.name}</div>`,
            iconSize: [200, 40],
            iconAnchor: [100, 40]
        })
    }).addTo(testRouteMap);
    
    // Draw route line - use OSM route coords if available, otherwise straight line
    let pathCoords;
    if (routeCoords && routeCoords.length > 0) {
        // Use actual walking path from OSM
        pathCoords = routeCoords.map(coord => [coord.lat, coord.lng]);
    } else {
        // Fallback to straight line
        pathCoords = [
            [startCoords.lat, startCoords.lon],
            [endCoords.lat, endCoords.lon]
        ];
    }
    
    L.polyline(pathCoords, {
        color: '#4285F4',  // Google Maps blue
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(testRouteMap);
    
    // Fit map to show route with padding
    const bounds = L.latLngBounds(pathCoords);
    testRouteMap.fitBounds(bounds, { padding: [80, 80] });
    
    const routeType = (routeCoords && routeCoords.length > 2) ? 'OSM walking path' : 'straight line estimate';
    showNotification(`Route visualized (${routeType})! 🗺️`, 'success');
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

// Global variables for location tracking
let locationWatchId = null;
let locationTrackingActive = false;
let currentDestination = null;
let locationUpdateInterval = null;

// Start continuous location tracking with route updates
function startLocationTracking(destinationLat, destinationLng, destinationName) {
    if (locationTrackingActive) {
        console.log('Location tracking already active');
        return;
    }
    
    if (!navigator.geolocation) {
        showNotification('Geolocation not supported', 'error');
        return;
    }
    
    locationTrackingActive = true;
    currentDestination = {
        lat: destinationLat,
        lng: destinationLng,
        name: destinationName
    };
    
    // Update UI
    document.getElementById('startTrackingBtn')?.classList.add('hidden');
    document.getElementById('stopTrackingBtn')?.classList.remove('hidden');
    document.getElementById('trackingStatus')?.classList.remove('hidden');
    
    showNotification('🎯 Location tracking started', 'success');
    
    // Watch position with high accuracy
    locationWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;
            
            console.log(`📍 Location update: ${currentLat}, ${currentLng}`);
            
            // Update route based on new location
            try {
                const response = await fetch(`${API_BASE}/api/location/update?` + new URLSearchParams({
                    latitude: currentLat,
                    longitude: currentLng,
                    destination_lat: currentDestination.lat,
                    destination_lng: currentDestination.lng,
                    destination_name: currentDestination.name,
                    mode: 'walking'
                }), {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (data.status === 'success' && data.route_coords) {
                    // Update map with new route
                    updateRouteOnMap(
                        { lat: currentLat, lng: currentLng, name: 'Your Current Location' },
                        { lat: currentDestination.lat, lng: currentDestination.lng, name: currentDestination.name },
                        data.distance_remaining,
                        data.route_coords
                    );
                    
                    // Update distance display
                    document.getElementById('routeDistance').textContent = `Distance: ${data.distance_remaining}`;
                }
                
            } catch (error) {
                console.error('Failed to update route:', error);
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            showNotification('Location tracking error: ' + error.message, 'error');
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

// Manual tracking start (uses last detected destination)
function startTrackingManual() {
    if (!currentDestination) {
        // Try to get destination from last navigation query
        const routeViz = document.getElementById('testRouteViz');
        if (routeViz && !routeViz.classList.contains('hidden')) {
            // Extract from last query - for now just alert
            alert('Please run a navigation query first to set a destination!');
            return;
        }
    }
    
    if (currentDestination) {
        startLocationTracking(currentDestination.lat, currentDestination.lng, currentDestination.name);
    }
}

// Stop location tracking
function stopLocationTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    if (locationUpdateInterval !== null) {
        clearInterval(locationUpdateInterval);
        locationUpdateInterval = null;
    }
    
    locationTrackingActive = false;
    
    // Update UI
    document.getElementById('startTrackingBtn')?.classList.remove('hidden');
    document.getElementById('stopTrackingBtn')?.classList.add('hidden');
    document.getElementById('trackingStatus')?.classList.add('hidden');
    
    showNotification('🛑 Location tracking stopped', 'info');
}

// Update route visualization on map
function updateRouteOnMap(startCoords, endCoords, distance, routeCoords) {
    // Reuse existing visualizeRoute function with updated coordinates
    if (testRouteMap) {
        visualizeRoute(startCoords, endCoords, distance, routeCoords);
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
