// Local storage management for DisasterAlert

class Storage {
  constructor() {
    this.prefix = 'disaster-alert-';
    this.version = '1.0.0';
    this.init();
  }

  /**
   * Initialize storage
   */
  init() {
    this.checkStorageSupport();
    this.migrateData();
  }

  /**
   * Check if localStorage is supported
   * @returns {boolean} Whether localStorage is supported
   */
  checkStorageSupport() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage not supported. Using in-memory storage.');
      this.fallbackStorage = {};
      return false;
    }
  }

  /**
   * Migrate data from previous versions
   */
  migrateData() {
    const currentVersion = this.get('version');
    if (!currentVersion || currentVersion !== this.version) {
      // Perform migration if needed
      this.set('version', this.version);
    }
  }

  /**
   * Generate storage key with prefix
   * @param {string} key - Key name
   * @returns {string} Prefixed key
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in storage
   * @param {string} key - Key name
   * @param {*} value - Value to store
   */
  set(key, value) {
    const storageKey = this.getKey(key);
    const data = {
      value: value,
      timestamp: Date.now(),
      version: this.version
    };

    try {
      if (this.fallbackStorage) {
        this.fallbackStorage[storageKey] = JSON.stringify(data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Key name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Retrieved value or default
   */
  get(key, defaultValue = null) {
    const storageKey = this.getKey(key);
    
    try {
      let rawData;
      if (this.fallbackStorage) {
        rawData = this.fallbackStorage[storageKey];
      } else {
        rawData = localStorage.getItem(storageKey);
      }
      
      if (!rawData) return defaultValue;
      
      const data = JSON.parse(rawData);
      return data.value;
    } catch (e) {
      console.error('Error reading from storage:', e);
      return defaultValue;
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Key name
   */
  remove(key) {
    const storageKey = this.getKey(key);
    
    try {
      if (this.fallbackStorage) {
        delete this.fallbackStorage[storageKey];
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.error('Error removing from storage:', e);
    }
  }

  /**
   * Clear all app data from storage
   */
  clear() {
    try {
      if (this.fallbackStorage) {
        Object.keys(this.fallbackStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            delete this.fallbackStorage[key];
          }
        });
      } else {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
  }

  /**
   * Get all keys with prefix
   * @returns {Array} Array of keys
   */
  getAllKeys() {
    try {
      const keys = [];
      const source = this.fallbackStorage || localStorage;
      
      for (const key in source) {
        if (key.startsWith(this.prefix)) {
          keys.push(key.replace(this.prefix, ''));
        }
      }
      
      return keys;
    } catch (e) {
      console.error('Error getting all keys:', e);
      return [];
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Key name
   * @returns {boolean} Whether key exists
   */
  has(key) {
    const storageKey = this.getKey(key);
    
    try {
      if (this.fallbackStorage) {
        return storageKey in this.fallbackStorage;
      } else {
        return localStorage.getItem(storageKey) !== null;
      }
    } catch (e) {
      console.error('Error checking key existence:', e);
      return false;
    }
  }

  /**
   * Get storage usage info
   * @returns {Object} Storage usage information
   */
  getUsageInfo() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      
      if (this.fallbackStorage) {
        Object.keys(this.fallbackStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            totalSize += this.fallbackStorage[key].length;
            itemCount++;
          }
        });
      } else {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.prefix)) {
            totalSize += localStorage.getItem(key).length;
            itemCount++;
          }
        });
      }
      
      return {
        totalSize: totalSize,
        itemCount: itemCount,
        formattedSize: this.formatBytes(totalSize)
      };
    } catch (e) {
      console.error('Error getting usage info:', e);
      return { totalSize: 0, itemCount: 0, formattedSize: '0 Bytes' };
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted bytes string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // User preferences methods
  
  /**
   * Get user preferences
   * @returns {Object} User preferences
   */
  getPreferences() {
    return this.get('preferences', {
      theme: 'light',
      notifications: true,
      soundAlerts: true,
      vibrationAlerts: true,
      language: 'en',
      units: 'metric',
      mapStyle: 'streets',
      autoRefresh: true,
      refreshInterval: 300000, // 5 minutes
      emergencyContacts: [],
      locationSharing: false,
      dataUsage: 'normal'
    });
  }

  /**
   * Set user preferences
   * @param {Object} preferences - User preferences
   */
  setPreferences(preferences) {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    this.set('preferences', updated);
  }

  /**
   * Get specific preference
   * @param {string} key - Preference key
   * @param {*} defaultValue - Default value
   * @returns {*} Preference value
   */
  getPreference(key, defaultValue = null) {
    const preferences = this.getPreferences();
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }

  /**
   * Set specific preference
   * @param {string} key - Preference key
   * @param {*} value - Preference value
   */
  setPreference(key, value) {
    const preferences = this.getPreferences();
    preferences[key] = value;
    this.setPreferences(preferences);
  }

  // Emergency contacts methods
  
  /**
   * Get emergency contacts
   * @returns {Array} Emergency contacts
   */
  getEmergencyContacts() {
    return this.get('emergencyContacts', []);
  }

  /**
   * Add emergency contact
   * @param {Object} contact - Contact information
   */
  addEmergencyContact(contact) {
    const contacts = this.getEmergencyContacts();
    contact.id = Date.now().toString();
    contacts.push(contact);
    this.set('emergencyContacts', contacts);
  }

  /**
   * Update emergency contact
   * @param {string} id - Contact ID
   * @param {Object} updates - Contact updates
   */
  updateEmergencyContact(id, updates) {
    const contacts = this.getEmergencyContacts();
    const index = contacts.findIndex(c => c.id === id);
    if (index !== -1) {
      contacts[index] = { ...contacts[index], ...updates };
      this.set('emergencyContacts', contacts);
    }
  }

  /**
   * Remove emergency contact
   * @param {string} id - Contact ID
   */
  removeEmergencyContact(id) {
    const contacts = this.getEmergencyContacts();
    const filtered = contacts.filter(c => c.id !== id);
    this.set('emergencyContacts', filtered);
  }

  // SOS history methods
  
  /**
   * Get SOS history
   * @returns {Array} SOS history
   */
  getSOSHistory() {
    return this.get('sosHistory', []);
  }

  /**
   * Add SOS entry
   * @param {Object} entry - SOS entry
   */
  addSOSEntry(entry) {
    const history = this.getSOSHistory();
    entry.id = Date.now().toString();
    entry.timestamp = Date.now();
    history.unshift(entry); // Add to beginning
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(50);
    }
    
    this.set('sosHistory', history);
  }

  /**
   * Clear SOS history
   */
  clearSOSHistory() {
    this.set('sosHistory', []);
  }

  // Cached data methods
  
  /**
   * Get cached disasters
   * @returns {Array} Cached disasters
   */
  getCachedDisasters() {
    return this.get('cachedDisasters', []);
  }

  /**
   * Set cached disasters
   * @param {Array} disasters - Disasters to cache
   */
  setCachedDisasters(disasters) {
    this.set('cachedDisasters', disasters);
    this.set('disastersCacheTime', Date.now());
  }

  /**
   * Check if disasters cache is valid
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} Whether cache is valid
   */
  isDisastersCacheValid(maxAge = 300000) { // 5 minutes default
    const cacheTime = this.get('disastersCacheTime', 0);
    return (Date.now() - cacheTime) < maxAge;
  }

  /**
   * Get cached weather data
   * @returns {Object} Cached weather data
   */
  getCachedWeather() {
    return this.get('cachedWeather', null);
  }

  /**
   * Set cached weather data
   * @param {Object} weather - Weather data to cache
   */
  setCachedWeather(weather) {
    this.set('cachedWeather', weather);
    this.set('weatherCacheTime', Date.now());
  }

  /**
   * Check if weather cache is valid
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} Whether cache is valid
   */
  isWeatherCacheValid(maxAge = 600000) { // 10 minutes default
    const cacheTime = this.get('weatherCacheTime', 0);
    return (Date.now() - cacheTime) < maxAge;
  }

  // User location methods
  
  /**
   * Get saved user location
   * @returns {Object} User location
   */
  getUserLocation() {
    return this.get('userLocation', null);
  }

  /**
   * Set user location
   * @param {Object} location - User location
   */
  setUserLocation(location) {
    this.set('userLocation', {
      ...location,
      timestamp: Date.now()
    });
  }

  /**
   * Check if user location is valid
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} Whether location is valid
   */
  isUserLocationValid(maxAge = 3600000) { // 1 hour default
    const location = this.getUserLocation();
    if (!location || !location.timestamp) return false;
    return (Date.now() - location.timestamp) < maxAge;
  }

  // Search history methods
  
  /**
   * Get search history
   * @returns {Array} Search history
   */
  getSearchHistory() {
    return this.get('searchHistory', []);
  }

  /**
   * Add search term
   * @param {string} term - Search term
   */
  addSearchTerm(term) {
    if (!term || term.trim().length === 0) return;
    
    const history = this.getSearchHistory();
    const cleanTerm = term.trim().toLowerCase();
    
    // Remove existing occurrence
    const filtered = history.filter(item => item.term !== cleanTerm);
    
    // Add to beginning
    filtered.unshift({
      term: cleanTerm,
      timestamp: Date.now()
    });
    
    // Keep only last 20 searches
    if (filtered.length > 20) {
      filtered.splice(20);
    }
    
    this.set('searchHistory', filtered);
  }

  /**
   * Clear search history
   */
  clearSearchHistory() {
    this.set('searchHistory', []);
  }

  // Notification settings methods
  
  /**
   * Get notification settings
   * @returns {Object} Notification settings
   */
  getNotificationSettings() {
    return this.get('notificationSettings', {
      enabled: true,
      earthquakes: true,
      volcanoes: true,
      floods: true,
      storms: true,
      wildfires: true,
      severeStorms: true,
      minMagnitude: 3.0,
      maxDistance: 100, // kilometers
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    });
  }

  /**
   * Set notification settings
   * @param {Object} settings - Notification settings
   */
  setNotificationSettings(settings) {
    const current = this.getNotificationSettings();
    const updated = { ...current, ...settings };
    this.set('notificationSettings', updated);
  }

  // App state methods
  
  /**
   * Get app state
   * @returns {Object} App state
   */
  getAppState() {
    return this.get('appState', {
      firstLaunch: true,
      tutorialCompleted: false,
      lastUpdateCheck: 0,
      crashReports: [],
      featureFlags: {}
    });
  }

  /**
   * Set app state
   * @param {Object} state - App state
   */
  setAppState(state) {
    const current = this.getAppState();
    const updated = { ...current, ...state };
    this.set('appState', updated);
  }

  /**
   * Get specific app state
   * @param {string} key - State key
   * @param {*} defaultValue - Default value
   * @returns {*} State value
   */
  getAppStateValue(key, defaultValue = null) {
    const state = this.getAppState();
    return state[key] !== undefined ? state[key] : defaultValue;
  }

  /**
   * Set specific app state
   * @param {string} key - State key
   * @param {*} value - State value
   */
  setAppStateValue(key, value) {
    const state = this.getAppState();
    state[key] = value;
    this.setAppState(state);
  }
}

// Create global storage instance
const storage = new Storage();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
