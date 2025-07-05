// Interactive disaster map using Leaflet.js

class DisasterMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.markers = [];
    this.userMarker = null;
    this.disasters = [];
    this.currentFilter = 'all';
    this.init();
  }

  /**
   * Initialize the map
   */
  init() {
    try {
      this.createMap();
      this.setupEventListeners();
      this.loadUserLocation();
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.showMapError();
    }
  }

  /**
   * Create Leaflet map
   */
  createMap() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Map container '${this.containerId}' not found`);
    }

    // Initialize map
    this.map = L.map(this.containerId, {
      center: [20, 0], // Center of the world
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false
    });

    // Add custom zoom control
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    // Add tile layer
    const mapStyle = storage.getPreference('mapStyle', 'streets');
    this.addTileLayer(mapStyle);

    // Add scale control
    L.control.scale({
      position: 'bottomleft'
    }).addTo(this.map);

    // Add fullscreen control
    this.addFullscreenControl();

    // Add legend
    this.addLegend();

    console.log('Map initialized successfully');
  }

  /**
   * Add tile layer based on style
   */
  addTileLayer(style) {
    let tileLayer;
    
    switch (style) {
      case 'satellite':
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 18
        });
        break;
      case 'terrain':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.opentopomap.org">OpenTopoMap</a>',
          maxZoom: 17
        });
        break;
      case 'dark':
        tileLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 20
        });
        break;
      default: // streets
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        });
    }
    
    tileLayer.addTo(this.map);
  }

  /**
   * Add fullscreen control
   */
  addFullscreenControl() {
    const fullscreenControl = L.control({ position: 'topright' });
    
    fullscreenControl.onAdd = (map) => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
      div.innerHTML = '<button class="map-control-btn" title="Fullscreen"><i class="fas fa-expand"></i></button>';
      div.style.backgroundColor = 'white';
      div.style.width = '30px';
      div.style.height = '30px';
      div.style.cursor = 'pointer';
      
      div.onclick = () => {
        this.toggleFullscreen();
      };
      
      return div;
    };
    
    fullscreenControl.addTo(this.map);
  }

  /**
   * Add legend to map
   */
  addLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = (map) => {
      const div = L.DomUtil.create('div', 'map-legend-control');
      div.innerHTML = `
        <div class="legend-header">
          <h4>Disaster Types</h4>
          <button class="legend-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
            <i class="fas fa-chevron-up"></i>
          </button>
        </div>
        <div class="legend-content">
          <div class="legend-item">
            <span class="legend-marker earthquake"></span>
            <span>Earthquakes</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker volcano"></span>
            <span>Volcanoes</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker flood"></span>
            <span>Floods</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker storm"></span>
            <span>Storms</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker wildfire"></span>
            <span>Wildfires</span>
          </div>
        </div>
      `;
      
      return div;
    };
    
    legend.addTo(this.map);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Map click events
    this.map.on('click', (e) => {
      this.handleMapClick(e);
    });

    // Map zoom events
    this.map.on('zoomend', () => {
      this.updateMarkerSizes();
    });

    // Map move events
    this.map.on('moveend', () => {
      this.updateVisibleDisasters();
    });
  }

  /**
   * Load user location
   */
  async loadUserLocation() {
    try {
      const savedLocation = storage.getUserLocation();
      if (savedLocation && storage.isUserLocationValid()) {
        this.setUserLocation(savedLocation);
        return;
      }

      // Get fresh location
      const location = await Utils.getUserLocation();
      this.setUserLocation(location);
      storage.setUserLocation(location);
      
    } catch (error) {
      console.log('User location not available:', error.message);
      // Don't show error to user as location is optional
    }
  }

  /**
   * Set user location on map
   */
  setUserLocation(location) {
    if (!location) return;

    // Remove existing user marker
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    // Create user marker
    const userIcon = L.divIcon({
      html: '<i class="fas fa-user-circle"></i>',
      className: 'user-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    this.userMarker = L.marker([location.latitude, location.longitude], {
      icon: userIcon,
      title: 'Your Location'
    }).addTo(this.map);

    // Add popup
    this.userMarker.bindPopup(`
      <div class="user-popup">
        <h4><i class="fas fa-map-marker-alt"></i> Your Location</h4>
        <p>Latitude: ${location.latitude.toFixed(6)}</p>
        <p>Longitude: ${location.longitude.toFixed(6)}</p>
        <p>Accuracy: ±${location.accuracy}m</p>
      </div>
    `);

    // Center map on user location
    this.map.setView([location.latitude, location.longitude], 6);

    console.log('User location set on map');
  }

  /**
   * Update disasters on map
   */
  updateDisasters(disasters) {
    this.disasters = disasters;
    this.clearMarkers();
    this.addDisasterMarkers(disasters);
  }

  /**
   * Clear existing markers
   */
  clearMarkers() {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  /**
   * Add disaster markers to map
   */
  addDisasterMarkers(disasters) {
    disasters.forEach(disaster => {
      if (this.shouldShowDisaster(disaster)) {
        const marker = this.createDisasterMarker(disaster);
        if (marker) {
          this.markers.push(marker);
        }
      }
    });
  }

  /**
   * Check if disaster should be shown based on current filter
   */
  shouldShowDisaster(disaster) {
    if (this.currentFilter === 'all') return true;
    return disaster.categories.includes(this.currentFilter);
  }

  /**
   * Create disaster marker
   */
  createDisasterMarker(disaster) {
    if (!disaster.coordinates || disaster.coordinates.length < 2) {
      return null;
    }

    const [lon, lat] = disaster.coordinates;
    const category = disaster.categories[0];
    const severity = Utils.getSeverityLevel(disaster.magnitude, category);
    
    // Create custom icon
    const icon = this.createDisasterIcon(category, severity, disaster.magnitude);
    
    // Create marker
    const marker = L.marker([lat, lon], {
      icon: icon,
      title: disaster.title
    }).addTo(this.map);

    // Create popup content
    const popupContent = this.createPopupContent(disaster);
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'disaster-popup'
    });

    // Add click event
    marker.on('click', () => {
      this.handleDisasterClick(disaster);
    });

    return marker;
  }

  /**
   * Create custom disaster icon
   */
  createDisasterIcon(category, severity, magnitude) {
    const color = Utils.getDisasterColor(category);
    const size = this.getMarkerSize(magnitude);
    
    return L.divIcon({
      html: `
        <div class="disaster-marker ${category} ${severity}" style="background-color: ${color}">
          <i class="${Utils.getDisasterIcon(category)}"></i>
          ${magnitude ? `<span class="magnitude">${magnitude.toFixed(1)}</span>` : ''}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  /**
   * Get marker size based on magnitude
   */
  getMarkerSize(magnitude) {
    if (!magnitude) return 30;
    if (magnitude < 3) return 25;
    if (magnitude < 5) return 30;
    if (magnitude < 7) return 35;
    return 40;
  }

  /**
   * Create popup content
   */
  createPopupContent(disaster) {
    const distance = this.calculateDistanceToUser(disaster.coordinates);
    const severity = Utils.getSeverityLevel(disaster.magnitude, disaster.categories[0]);
    
    return `
      <div class="disaster-popup-content">
        <div class="popup-header">
          <h4>${Utils.sanitizeHtml(disaster.title)}</h4>
          <span class="disaster-type ${disaster.categories[0]}">
            <i class="${Utils.getDisasterIcon(disaster.categories[0])}"></i>
            ${disaster.categories[0].charAt(0).toUpperCase() + disaster.categories[0].slice(1)}
          </span>
        </div>
        
        <div class="popup-details">
          ${disaster.magnitude ? `
            <div class="detail-row">
              <strong>Magnitude:</strong> 
              <span class="magnitude-${severity}">${Utils.formatMagnitude(disaster.magnitude)}</span>
            </div>
          ` : ''}
          
          <div class="detail-row">
            <strong>Date:</strong> ${Utils.formatDate(disaster.date)}
          </div>
          
          <div class="detail-row">
            <strong>Time:</strong> ${Utils.formatRelativeTime(disaster.date)}
          </div>
          
          ${distance ? `
            <div class="detail-row">
              <strong>Distance:</strong> ${distance}
            </div>
          ` : ''}
          
          ${disaster.location ? `
            <div class="detail-row">
              <strong>Location:</strong> ${Utils.sanitizeHtml(disaster.location)}
            </div>
          ` : ''}
        </div>
        
        ${disaster.description ? `
          <div class="popup-description">
            <p>${Utils.sanitizeHtml(disaster.description)}</p>
          </div>
        ` : ''}
        
        <div class="popup-actions">
          <button class="btn btn-sm btn-primary" onclick="app.showDisasterDetails('${disaster.id}')">
            <i class="fas fa-info-circle"></i> More Info
          </button>
          <button class="btn btn-sm btn-outline" onclick="app.shareDisaster('${disaster.id}')">
            <i class="fas fa-share-alt"></i> Share
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate distance to user
   */
  calculateDistanceToUser(coordinates) {
    const userLocation = storage.getUserLocation();
    if (!userLocation || !coordinates) return null;
    
    const distance = Utils.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      coordinates[1],
      coordinates[0]
    );
    
    return Utils.formatDistance(distance);
  }

  /**
   * Handle map click
   */
  handleMapClick(e) {
    console.log('Map clicked at:', e.latlng);
  }

  /**
   * Handle disaster click
   */
  handleDisasterClick(disaster) {
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('disaster-selected', {
      detail: disaster
    }));
  }

  /**
   * Update marker sizes based on zoom level
   */
  updateMarkerSizes() {
    const zoom = this.map.getZoom();
    const scale = Math.max(0.5, Math.min(2, zoom / 10));
    
    // Update marker sizes via CSS
    const style = document.createElement('style');
    style.textContent = `
      .disaster-marker {
        transform: scale(${scale});
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update visible disasters based on map bounds
   */
  updateVisibleDisasters() {
    const bounds = this.map.getBounds();
    const visibleDisasters = this.disasters.filter(disaster => {
      if (!disaster.coordinates) return false;
      const [lon, lat] = disaster.coordinates;
      return bounds.contains([lat, lon]);
    });
    
    // Update disaster count in UI
    const countElement = document.querySelector('.visible-disasters-count');
    if (countElement) {
      countElement.textContent = visibleDisasters.length;
    }
  }

  /**
   * Filter disasters by type
   */
  filterDisasters(filterType) {
    this.currentFilter = filterType;
    this.clearMarkers();
    this.addDisasterMarkers(this.disasters);
  }

  /**
   * Show specific disaster
   */
  showDisaster(disasterId) {
    const disaster = this.disasters.find(d => d.id === disasterId);
    if (!disaster || !disaster.coordinates) return;
    
    const [lon, lat] = disaster.coordinates;
    this.map.setView([lat, lon], 8);
    
    // Find and open popup for this disaster
    const marker = this.markers.find(m => 
      m.options.title === disaster.title
    );
    
    if (marker) {
      marker.openPopup();
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const mapContainer = document.getElementById(this.containerId);
    if (!mapContainer) return;
    
    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().then(() => {
        mapContainer.classList.add('fullscreen');
        this.map.invalidateSize();
      });
    } else {
      document.exitFullscreen().then(() => {
        mapContainer.classList.remove('fullscreen');
        this.map.invalidateSize();
      });
    }
  }

  /**
   * Invalidate map size
   */
  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  /**
   * Show map error
   */
  showMapError() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
        <div class="map-error">
          <div class="error-icon">
            <i class="fas fa-map-marked-alt"></i>
          </div>
          <h3>Map Unavailable</h3>
          <p>Unable to load the interactive map. Please check your connection and try again.</p>
          <button class="btn btn-primary" onclick="location.reload()">
            <i class="fas fa-refresh"></i> Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Get current map bounds
   */
  getBounds() {
    return this.map ? this.map.getBounds() : null;
  }

  /**
   * Get current map center
   */
  getCenter() {
    return this.map ? this.map.getCenter() : null;
  }

  /**
   * Get current map zoom
   */
  getZoom() {
    return this.map ? this.map.getZoom() : 2;
  }

  /**
   * Fly to location
   */
  flyTo(lat, lon, zoom = 8) {
    if (this.map) {
      this.map.flyTo([lat, lon], zoom);
    }
  }

  /**
   * Add heatmap layer
   */
  addHeatmapLayer(disasters) {
    // Implementation for heatmap visualization
    if (typeof L.heatLayer === 'function') {
      const heatData = disasters
        .filter(d => d.coordinates)
        .map(d => [d.coordinates[1], d.coordinates[0], d.magnitude || 1]);
      
      const heatLayer = L.heatLayer(heatData, {
        radius: 20,
        blur: 15,
        maxZoom: 17
      }).addTo(this.map);
      
      return heatLayer;
    }
  }

  /**
   * Add cluster layer
   */
  addClusterLayer(disasters) {
    // Implementation for marker clustering
    if (typeof L.markerClusterGroup === 'function') {
      const clusterGroup = L.markerClusterGroup();
      
      disasters.forEach(disaster => {
        const marker = this.createDisasterMarker(disaster);
        if (marker) {
          clusterGroup.addLayer(marker);
        }
      });
      
      this.map.addLayer(clusterGroup);
      return clusterGroup;
    }
  }
}

// CSS for map markers and popups
const mapStyles = `
  .disaster-marker {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    border: 2px solid rgba(255,255,255,0.8);
    position: relative;
    transition: transform 0.2s ease;
  }
  
  .disaster-marker:hover {
    transform: scale(1.1);
  }
  
  .disaster-marker.high {
    animation: pulse 2s infinite;
  }
  
  .disaster-marker .magnitude {
    position: absolute;
    bottom: -5px;
    right: -5px;
    background: rgba(0,0,0,0.8);
    color: white;
    font-size: 10px;
    padding: 1px 3px;
    border-radius: 2px;
  }
  
  .user-marker {
    color: #007bff;
    font-size: 20px;
  }
  
  .disaster-popup-content {
    font-family: inherit;
  }
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .popup-header h4 {
    margin: 0;
    color: var(--text-primary);
  }
  
  .popup-details {
    margin-bottom: 10px;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  
  .popup-description {
    margin-bottom: 10px;
    padding: 10px;
    background: var(--bg-secondary);
    border-radius: 4px;
  }
  
  .popup-actions {
    display: flex;
    gap: 5px;
  }
  
  .map-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
  }
  
  .map-error .error-icon {
    font-size: 3rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }
  
  .map-legend-control {
    background: white;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  .map-legend-control.collapsed .legend-content {
    display: none;
  }
  
  .legend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .legend-header h4 {
    margin: 0;
    font-size: 14px;
  }
  
  .legend-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
  }
  
  .fullscreen {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 9999 !important;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = mapStyles;
document.head.appendChild(style);

