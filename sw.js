// Service Worker for DisasterAlert PWA

const CACHE_NAME = 'disaster-alert-v1.0.0';
const STATIC_CACHE_NAME = 'disaster-alert-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'disaster-alert-dynamic-v1.0.0';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/responsive.css',
  '/js/utils.js',
  '/js/storage.js',
  '/js/api.js',
  '/js/map.js',
  '/js/sos.js',
  '/js/app.js',
  '/assets/emergency-guide.json',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
  '/manifest.json'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Network-first resources (APIs)
const NETWORK_FIRST_URLS = [
  'https://eonet.gsfc.nasa.gov/api/v3',
  'https://earthquake.usgs.gov/fdsnws/event/1',
  'https://api.openweathermap.org/data/2.5'
];

// Cache-first resources (assets)
const CACHE_FIRST_URLS = [
  '/assets/',
  '/styles/',
  '/js/',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'unpkg.com'
];

/**
 * Install event - cache static resources
 */
self.addEventListener('install', event => {
  console.log('Service Worker: Install event');
  
  event.waitUntil(
    Promise.all([
      cacheStaticResources(),
      cacheExternalResources()
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event');
  
  event.waitUntil(
    cleanupOldCaches().then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    }).catch(error => {
      console.error('Service Worker: Activation failed', error);
    })
  );
});

/**
 * Fetch event - handle network requests
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different request types
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (isCacheFirst(url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

/**
 * Message event - handle messages from main thread
 */
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_DISASTER_DATA':
      cacheDynamicData('disaster-data', data);
      break;
    case 'CACHE_WEATHER_DATA':
      cacheDynamicData('weather-data', data);
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

/**
 * Background sync event
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

/**
 * Push event - handle push notifications
 */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New disaster alert',
    icon: '/assets/icons/icon-192.svg',
    badge: '/assets/icons/icon-192.svg',
    tag: 'disaster-alert',
    data: data.data || {},
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Disaster Alert', options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?notification=true')
    );
  }
});

/**
 * Cache static resources
 */
async function cacheStaticResources() {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    console.log('Service Worker: Caching static resources');
    
    const cachePromises = STATIC_RESOURCES.map(async url => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Service Worker: Failed to cache ${url}:`, error);
      }
    });
    
    await Promise.all(cachePromises);
    console.log('Service Worker: Static resources cached');
    
  } catch (error) {
    console.error('Service Worker: Failed to cache static resources:', error);
  }
}

/**
 * Cache external resources
 */
async function cacheExternalResources() {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    console.log('Service Worker: Caching external resources');
    
    const cachePromises = EXTERNAL_RESOURCES.map(async url => {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Service Worker: Failed to cache ${url}:`, error);
      }
    });
    
    await Promise.all(cachePromises);
    console.log('Service Worker: External resources cached');
    
  } catch (error) {
    console.error('Service Worker: Failed to cache external resources:', error);
  }
}

/**
 * Cleanup old caches
 */
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const validCacheNames = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
    
    const deletePromises = cacheNames.map(cacheName => {
      if (!validCacheNames.includes(cacheName)) {
        console.log('Service Worker: Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    });
    
    await Promise.all(deletePromises);
    console.log('Service Worker: Old caches cleaned up');
    
  } catch (error) {
    console.error('Service Worker: Failed to cleanup old caches:', error);
  }
}

/**
 * Network-first strategy
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return createOfflineResponse(request);
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Service Worker: Cache and network failed for:', request.url);
    return createOfflineResponse(request);
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Update cache in background
  const networkPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE_NAME);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  }).catch(error => {
    console.log('Service Worker: Background update failed for:', request.url);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  try {
    return await networkPromise;
  } catch (error) {
    return createOfflineResponse(request);
  }
}

/**
 * Check if URL should use network-first strategy
 */
function isNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some(pattern => url.href.includes(pattern));
}

/**
 * Check if URL should use cache-first strategy
 */
function isCacheFirst(url) {
  return CACHE_FIRST_URLS.some(pattern => url.href.includes(pattern));
}

/**
 * Create offline response
 */
function createOfflineResponse(request) {
  if (request.destination === 'document') {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DisasterAlert - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 2rem;
              background: #f8f9fa;
              color: #333;
              text-align: center;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .offline-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
            .offline-title {
              font-size: 1.5rem;
              margin-bottom: 1rem;
            }
            .offline-message {
              color: #666;
              margin-bottom: 2rem;
            }
            .retry-button {
              background: #dc3545;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
            }
            .retry-button:hover {
              background: #c82333;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1 class="offline-title">You're Offline</h1>
            <p class="offline-message">
              DisasterAlert is not available right now. 
              Please check your internet connection and try again.
            </p>
            <button class="retry-button" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    });
  }
  
  if (request.destination === 'image') {
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="14" fill="#666">Image Unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

/**
 * Cache dynamic data
 */
async function cacheDynamicData(key, data) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/api/cache/${key}`, response);
    console.log(`Service Worker: Cached ${key} data`);
  } catch (error) {
    console.error('Service Worker: Failed to cache dynamic data:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
    await Promise.all(deletePromises);
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Failed to clear caches:', error);
  }
}

/**
 * Get cache size
 */
async function getCacheSize() {
  try {
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Service Worker: Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Perform background sync
 */
async function performBackgroundSync() {
  try {
    console.log('Service Worker: Performing background sync');
    
    // Sync disaster data
    const disasterResponse = await fetch('/api/disasters');
    if (disasterResponse.ok) {
      const disasters = await disasterResponse.json();
      await cacheDynamicData('disasters', disasters);
    }
    
    // Sync weather data if location is available
    const location = await getStoredLocation();
    if (location) {
      const weatherResponse = await fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`);
      if (weatherResponse.ok) {
        const weather = await weatherResponse.json();
        await cacheDynamicData('weather', weather);
      }
    }
    
    console.log('Service Worker: Background sync completed');
    
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

/**
 * Get stored location from IndexedDB or localStorage
 */
async function getStoredLocation() {
  try {
    // This would normally access IndexedDB or localStorage
    // For now, return null as we can't access localStorage from service worker
    return null;
  } catch (error) {
    console.error('Service Worker: Failed to get stored location:', error);
    return null;
  }
}

/**
 * Send notification to client
 */
async function sendNotificationToClient(data) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION',
        data: data
      });
    });
  } catch (error) {
    console.error('Service Worker: Failed to send notification to client:', error);
  }
}

/**
 * Check for updates
 */
async function checkForUpdates() {
  try {
    const response = await fetch('/api/version');
    if (response.ok) {
      const version = await response.json();
      if (version.version !== CACHE_NAME) {
        console.log('Service Worker: New version available');
        await sendNotificationToClient({
          type: 'UPDATE_AVAILABLE',
          version: version.version
        });
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to check for updates:', error);
  }
}

// Periodic background sync
setInterval(() => {
  checkForUpdates();
}, 30 * 60 * 1000); // Check every 30 minutes

console.log('Service Worker: Script loaded');

