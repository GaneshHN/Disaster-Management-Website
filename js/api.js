// API client for disaster data and weather services

class DisasterAPI {
  constructor() {
    this.baseUrls = {
      eonet: 'https://eonet.gsfc.nasa.gov/api/v3',
      usgs: 'https://earthquake.usgs.gov/fdsnws/event/1',
      weather: 'https://api.openweathermap.org/data/2.5'
    };
    
    this.apiKeys = {
      weather: this.getWeatherApiKey()
    };
    
    this.rateLimiter = new Map();
    this.cache = new Map();
  }

  /**
   * Get weather API key from environment or use fallback
   */
  getWeatherApiKey() {
    // In browser environment, we'll use a demo key by default
    // Users can provide their own API key through the app settings
    return 'demo_key';
  }

  /**
   * Check rate limit for API endpoint
   */
  checkRateLimit(endpoint) {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(endpoint);
    
    if (lastRequest && (now - lastRequest) < 1000) {
      return false; // Rate limited
    }
    
    this.rateLimiter.set(endpoint, now);
    return true;
  }

  /**
   * Make HTTP request with error handling
   */
  async makeRequest(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Get disasters from NASA EONET API
   */
  async getDisasters(options = {}) {
    const endpoint = 'eonet-events';
    
    if (!this.checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const {
      limit = 100,
      days = 30,
      category = null,
      status = 'all'
    } = options;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        days: days.toString(),
        status: status
      });

      if (category) {
        params.append('category', category);
      }

      const url = `${this.baseUrls.eonet}/events?${params}`;
      const response = await this.makeRequest(url);

      if (!response.events) {
        throw new Error('Invalid response format from EONET API');
      }

      const disasters = response.events.map(event => this.transformEONETEvent(event));
      return disasters;

    } catch (error) {
      console.error('Failed to fetch disasters from EONET:', error);
      throw new Error(`Failed to fetch disaster data: ${error.message}`);
    }
  }

  /**
   * Transform EONET event to standard format
   */
  transformEONETEvent(event) {
    const geometry = event.geometry && event.geometry.length > 0 ? event.geometry[0] : null;
    const coordinates = geometry ? geometry.coordinates : null;
    
    return {
      id: event.id,
      title: event.title,
      description: event.description || '',
      categories: event.categories.map(cat => cat.id),
      date: event.geometry && event.geometry.length > 0 ? event.geometry[0].date : null,
      coordinates: coordinates,
      location: this.extractLocationFromTitle(event.title),
      magnitude: this.extractMagnitudeFromEvent(event),
      url: event.link,
      source: 'NASA EONET'
    };
  }

  /**
   * Extract location from event title
   */
  extractLocationFromTitle(title) {
    // Simple location extraction - can be improved
    const match = title.match(/,\s*([^,]+)$/);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract magnitude from event
   */
  extractMagnitudeFromEvent(event) {
    // Try to extract magnitude from description or title
    const text = (event.description || event.title || '').toLowerCase();
    const magnitudeMatch = text.match(/magnitude\s*(\d+\.?\d*)/i) || 
                          text.match(/m\s*(\d+\.?\d*)/i) ||
                          text.match(/(\d+\.?\d*)\s*magnitude/i);
    
    return magnitudeMatch ? parseFloat(magnitudeMatch[1]) : null;
  }

  /**
   * Get earthquake data from USGS API
   */
  async getEarthquakes(options = {}) {
    const endpoint = 'usgs-earthquakes';
    
    if (!this.checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const {
      limit = 100,
      minMagnitude = 2.5,
      days = 30,
      latitude = null,
      longitude = null,
      maxRadius = null
    } = options;

    try {
      const params = new URLSearchParams({
        format: 'geojson',
        limit: limit.toString(),
        minmagnitude: minMagnitude.toString(),
        endtime: new Date().toISOString().split('T')[0],
        starttime: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (latitude && longitude && maxRadius) {
        params.append('latitude', latitude.toString());
        params.append('longitude', longitude.toString());
        params.append('maxradiuskm', maxRadius.toString());
      }

      const url = `${this.baseUrls.usgs}/query?${params}`;
      const response = await this.makeRequest(url);

      if (!response.features) {
        throw new Error('Invalid response format from USGS API');
      }

      const earthquakes = response.features.map(feature => this.transformUSGSEvent(feature));
      return earthquakes;

    } catch (error) {
      console.error('Failed to fetch earthquakes from USGS:', error);
      throw new Error(`Failed to fetch earthquake data: ${error.message}`);
    }
  }

  /**
   * Transform USGS event to standard format
   */
  transformUSGSEvent(feature) {
    const properties = feature.properties;
    const geometry = feature.geometry;
    
    return {
      id: feature.id,
      title: properties.title,
      description: `Earthquake with magnitude ${properties.mag}`,
      categories: ['earthquakes'],
      date: new Date(properties.time).toISOString(),
      coordinates: geometry.coordinates,
      location: properties.place,
      magnitude: properties.mag,
      depth: geometry.coordinates[2],
      url: properties.url,
      source: 'USGS'
    };
  }

  /**
   * Get weather alerts
   */
  async getWeatherAlerts(latitude, longitude, options = {}) {
    const endpoint = 'weather-alerts';
    
    if (!this.checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (this.apiKeys.weather === 'demo_key') {
      console.warn('Using demo weather API key. Weather data may be limited.');
      return this.getDemoWeatherAlerts(latitude, longitude);
    }

    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        appid: this.apiKeys.weather,
        units: 'metric'
      });

      const url = `${this.baseUrls.weather}/onecall?${params}`;
      const response = await this.makeRequest(url);

      return {
        alerts: response.alerts || [],
        current: response.current,
        forecast: response.daily
      };

    } catch (error) {
      console.error('Failed to fetch weather alerts:', error);
      // Don't throw error for weather data as it's not critical
      return { alerts: [], current: null, forecast: null };
    }
  }

  /**
   * Get demo weather alerts for testing
   */
  getDemoWeatherAlerts(latitude, longitude) {
    // Return sample weather data for demo purposes
    return {
      alerts: [],
      current: {
        temp: 20,
        humidity: 65,
        weather: [{ main: 'Clear', description: 'clear sky' }]
      },
      forecast: []
    };
  }

  /**
   * Get combined disaster data
   */
  async getCombinedDisasters(options = {}) {
    const results = await Promise.allSettled([
      this.getDisasters(options),
      this.getEarthquakes(options)
    ]);

    const disasters = [];
    
    // Process EONET results
    if (results[0].status === 'fulfilled') {
      disasters.push(...results[0].value);
    } else {
      console.warn('Failed to fetch EONET data:', results[0].reason);
    }

    // Process USGS results
    if (results[1].status === 'fulfilled') {
      disasters.push(...results[1].value);
    } else {
      console.warn('Failed to fetch USGS data:', results[1].reason);
    }

    // Remove duplicates and sort by date
    const uniqueDisasters = this.removeDuplicateDisasters(disasters);
    return uniqueDisasters.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Remove duplicate disasters
   */
  removeDuplicateDisasters(disasters) {
    const seen = new Set();
    return disasters.filter(disaster => {
      const key = `${disaster.title}-${disaster.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get disaster by ID
   */
  async getDisasterById(id) {
    try {
      const disasters = await this.getCombinedDisasters();
      return disasters.find(disaster => disaster.id === id);
    } catch (error) {
      console.error('Failed to fetch disaster by ID:', error);
      return null;
    }
  }

  /**
   * Search disasters
   */
  async searchDisasters(query, options = {}) {
    try {
      const disasters = await this.getCombinedDisasters(options);
      const searchTerms = query.toLowerCase().split(' ');
      
      return disasters.filter(disaster => {
        const searchText = [
          disaster.title,
          disaster.description,
          disaster.location,
          disaster.categories.join(' ')
        ].join(' ').toLowerCase();
        
        return searchTerms.every(term => searchText.includes(term));
      });
    } catch (error) {
      console.error('Failed to search disasters:', error);
      throw error;
    }
  }

  /**
   * Get disasters near location
   */
  async getDisastersNearLocation(latitude, longitude, radiusKm = 100, options = {}) {
    try {
      const disasters = await this.getCombinedDisasters(options);
      
      return disasters.filter(disaster => {
        if (!disaster.coordinates) return false;
        
        const distance = Utils.calculateDistance(
          latitude,
          longitude,
          disaster.coordinates[1],
          disaster.coordinates[0]
        );
        
        return distance <= radiusKm;
      }).map(disaster => ({
        ...disaster,
        distance: Utils.calculateDistance(
          latitude,
          longitude,
          disaster.coordinates[1],
          disaster.coordinates[0]
        )
      })).sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Failed to get disasters near location:', error);
      throw error;
    }
  }

  /**
   * Get disaster statistics
   */
  async getDisasterStatistics(options = {}) {
    try {
      const disasters = await this.getCombinedDisasters(options);
      
      const stats = {
        total: disasters.length,
        categories: {},
        severityLevels: { low: 0, medium: 0, high: 0 },
        recent: disasters.filter(d => {
          const hours = (Date.now() - new Date(d.date).getTime()) / (1000 * 60 * 60);
          return hours <= 24;
        }).length
      };

      disasters.forEach(disaster => {
        // Count by category
        disaster.categories.forEach(category => {
          stats.categories[category] = (stats.categories[category] || 0) + 1;
        });

        // Count by severity
        const severity = Utils.getSeverityLevel(disaster.magnitude, disaster.categories[0]);
        if (severity in stats.severityLevels) {
          stats.severityLevels[severity]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get disaster statistics:', error);
      throw error;
    }
  }

  /**
   * Clear API cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * Test API connectivity
   */
  async testConnectivity() {
    const tests = [
      { name: 'NASA EONET', test: () => this.makeRequest(`${this.baseUrls.eonet}/events?limit=1`) },
      { name: 'USGS Earthquakes', test: () => this.makeRequest(`${this.baseUrls.usgs}/query?format=geojson&limit=1`) }
    ];

    const results = await Promise.allSettled(tests.map(test => test.test()));
    
    return tests.map((test, index) => ({
      service: test.name,
      status: results[index].status === 'fulfilled' ? 'online' : 'offline',
      error: results[index].status === 'rejected' ? results[index].reason.message : null
    }));
  }

  /**
   * Get API status
   */
  getAPIStatus() {
    return {
      rateLimiter: Object.fromEntries(this.rateLimiter),
      cacheSize: this.getCacheSize(),
      baseUrls: this.baseUrls,
      hasWeatherKey: this.apiKeys.weather !== 'demo_key'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DisasterAPI;
}

