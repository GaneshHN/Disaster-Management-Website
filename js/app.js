// Main application controller for DisasterAlert

class DisasterAlert {
  constructor() {
    this.initialized = false;
    this.api = null;
    this.map = null;
    this.sos = null;
    this.currentUser = null;
    this.activeAlerts = [];
    this.loadingElements = new Set();
    
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Show loading screen
      this.showLoadingScreen();
      
      // Initialize core components
      await this.initializeCore();
      
      // Initialize UI components
      this.initializeUI();
      
      // Initialize event listeners
      this.initializeEventListeners();
      
      // Initialize PWA features
      this.initializePWA();
      
      // Load initial data
      await this.loadInitialData();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      this.initialized = true;
      console.log('DisasterAlert initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize DisasterAlert:', error);
      this.showError('Failed to initialize application', error.message);
      this.hideLoadingScreen();
    }
  }

  /**
   * Initialize core components
   */
  async initializeCore() {
    // Initialize API client
    this.api = new DisasterAPI();
    
    // Initialize map
    this.map = new DisasterMap('disaster-map');
    
    // Initialize SOS system
    this.sos = new SOSSystem();
    
    // Set up component communication
    this.setupComponentCommunication();
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    // Initialize theme
    this.initializeTheme();
    
    // Initialize navigation
    this.initializeNavigation();
    
    // Initialize modals
    this.initializeModals();
    
    // Initialize filters and search
    this.initializeFilters();
    
    // Initialize animations
    this.initializeAnimations();
    
    // Initialize tooltips
    this.initializeTooltips();
    
    // Initialize safety guides
    this.initializeSafetyGuides();
  }

  /**
   * Initialize event listeners
   */
  initializeEventListeners() {
    // Window events
    window.addEventListener('load', () => this.handleWindowLoad());
    window.addEventListener('resize', Utils.debounce(() => this.handleWindowResize(), 250));
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));
    
    // Navigation events
    document.addEventListener('click', (e) => this.handleNavigation(e));
    
    // Search events
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
      searchInput.addEventListener('input', 
        Utils.debounce((e) => this.handleSearch(e.target.value), 300)
      );
    }
    
    // Filter events
    const disasterFilter = document.getElementById('disaster-filter');
    if (disasterFilter) {
      disasterFilter.addEventListener('change', (e) => this.handleFilterChange(e.target.value));
    }
    
    const historyFilter = document.getElementById('history-filter');
    if (historyFilter) {
      historyFilter.addEventListener('change', (e) => this.handleHistoryFilter(e.target.value));
    }
    
    // Button events
    const refreshBtn = document.getElementById('refresh-map');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }
    
    const locateBtn = document.getElementById('locate-user');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => this.locateUser());
    }
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMoreHistory());
    }
    
    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    // Notification toggle
    const notificationToggle = document.querySelector('.notification-toggle');
    if (notificationToggle) {
      notificationToggle.addEventListener('click', () => this.toggleNotifications());
    }
    
    // Mobile navigation
    const navToggle = document.querySelector('.nav-toggle');
    if (navToggle) {
      navToggle.addEventListener('click', () => this.toggleMobileNav());
    }
  }

  /**
   * Initialize PWA features
   */
  initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
    
    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.showInstallPrompt(e);
    });
    
    // Handle app installed
    window.addEventListener('appinstalled', () => {
      Utils.showNotification('App Installed', 'DisasterAlert has been installed successfully!', 'success');
    });
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    try {
      // Load user preferences
      this.loadUserPreferences();
      
      // Load disaster data
      await this.loadDisasterData();
      
      // Load weather data if location is available
      if (storage.isUserLocationValid()) {
        await this.loadWeatherData();
      }
      
      // Update statistics
      this.updateStatistics();
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Don't throw error to prevent app crash
    }
  }

  /**
   * Load user preferences
   */
  loadUserPreferences() {
    const preferences = storage.getPreferences();
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', preferences.theme);
    
    // Update theme toggle icon
    const themeToggle = document.querySelector('.theme-toggle i');
    if (themeToggle) {
      themeToggle.className = preferences.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Apply other preferences
    this.applyPreferences(preferences);
  }

  /**
   * Load disaster data
   */
  async loadDisasterData() {
    try {
      // Check cache first
      if (storage.isDisastersCacheValid()) {
        const cachedData = storage.getCachedDisasters();
        if (cachedData && cachedData.length > 0) {
          this.displayDisasters(cachedData);
          this.map.updateDisasters(cachedData);
          return;
        }
      }
      
      // Fetch fresh data
      const disasters = await this.api.getDisasters();
      if (disasters && disasters.length > 0) {
        storage.setCachedDisasters(disasters);
        this.displayDisasters(disasters);
        this.map.updateDisasters(disasters);
      } else {
        this.showEmptyState('No active disasters found');
      }
      
    } catch (error) {
      console.error('Failed to load disaster data:', error);
      
      // Try to use cached data as fallback
      const cachedData = storage.getCachedDisasters();
      if (cachedData && cachedData.length > 0) {
        this.displayDisasters(cachedData);
        this.map.updateDisasters(cachedData);
        Utils.showNotification('Offline Mode', 'Showing cached disaster data', 'warning');
      } else {
        this.showError('Failed to load disaster data', error.message);
      }
    }
  }

  /**
   * Load weather data
   */
  async loadWeatherData() {
    try {
      const location = storage.getUserLocation();
      if (!location) return;
      
      // Check cache first
      if (storage.isWeatherCacheValid()) {
        const cachedWeather = storage.getCachedWeather();
        if (cachedWeather) {
          this.displayWeatherAlerts(cachedWeather);
          return;
        }
      }
      
      // Fetch fresh weather data
      const weather = await this.api.getWeatherAlerts(location.latitude, location.longitude);
      if (weather) {
        storage.setCachedWeather(weather);
        this.displayWeatherAlerts(weather);
      }
      
    } catch (error) {
      console.error('Failed to load weather data:', error);
      // Non-critical error, don't show to user
    }
  }

  /**
   * Display disasters
   */
  displayDisasters(disasters) {
    const disasterList = document.getElementById('disaster-list');
    if (!disasterList) return;
    
    if (!disasters || disasters.length === 0) {
      Utils.showEmpty(disasterList, 'No disasters to display', 'fas fa-shield-alt');
      return;
    }
    
    // Sort disasters by date (newest first)
    disasters.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Create disaster cards
    disasterList.innerHTML = disasters.map(disaster => this.createDisasterCard(disaster)).join('');
    
    // Animate cards into view
    const cards = disasterList.querySelectorAll('.disaster-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        Utils.animateIntoView(card, 'fade-in');
      }, index * 100);
    });
  }

  /**
   * Create disaster card HTML
   */
  createDisasterCard(disaster) {
    const severity = Utils.getSeverityLevel(disaster.magnitude, disaster.categories[0]);
    const icon = Utils.getDisasterIcon(disaster.categories[0]);
    const distance = this.calculateDistanceToUser(disaster.coordinates);
    
    return `
      <div class="disaster-card" data-id="${disaster.id}">
        <div class="disaster-card-header">
          <div class="disaster-info">
            <h3 class="disaster-title">${Utils.sanitizeHtml(disaster.title)}</h3>
            <div class="disaster-meta">
              <span class="disaster-type ${disaster.categories[0]}">
                <i class="${icon}"></i>
                ${disaster.categories[0].charAt(0).toUpperCase() + disaster.categories[0].slice(1)}
              </span>
              ${disaster.magnitude ? `
                <span class="disaster-severity">
                  <span class="severity-indicator severity-${severity}"></span>
                  Magnitude ${Utils.formatMagnitude(disaster.magnitude)}
                </span>
              ` : ''}
              ${distance ? `<span>${distance}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="disaster-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>${Utils.sanitizeHtml(disaster.location || 'Unknown location')}</span>
        </div>
        <div class="disaster-description">
          ${Utils.sanitizeHtml(disaster.description || 'No description available')}
        </div>
        <div class="disaster-meta">
          <span><i class="fas fa-calendar"></i> ${Utils.formatDate(disaster.date)}</span>
          <span><i class="fas fa-clock"></i> ${Utils.formatRelativeTime(disaster.date)}</span>
        </div>
        <div class="disaster-actions">
          <button class="btn btn-sm btn-primary" onclick="app.showDisasterOnMap('${disaster.id}')">
            <i class="fas fa-map-marked-alt"></i>
            View on Map
          </button>
          <button class="btn btn-sm btn-outline" onclick="app.shareDisaster('${disaster.id}')">
            <i class="fas fa-share-alt"></i>
            Share
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Initialize theme system
   */
  initializeTheme() {
    const theme = storage.getPreference('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    storage.setPreference('theme', newTheme);
    
    // Update theme toggle icon
    const themeToggle = document.querySelector('.theme-toggle i');
    if (themeToggle) {
      themeToggle.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    Utils.showNotification('Theme Changed', `Switched to ${newTheme} mode`, 'success', 2000);
  }

  /**
   * Initialize navigation
   */
  initializeNavigation() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
    
    // Update active navigation link on scroll
    this.updateActiveNavLink();
    window.addEventListener('scroll', Utils.throttle(() => this.updateActiveNavLink(), 100));
  }

  /**
   * Update active navigation link
   */
  updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop - 100) {
        currentSection = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Toggle mobile navigation
   */
  toggleMobileNav() {
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (navMenu && navToggle) {
      navMenu.classList.toggle('active');
      navToggle.querySelector('i').classList.toggle('fa-bars');
      navToggle.querySelector('i').classList.toggle('fa-times');
    }
  }

  /**
   * Initialize safety guides
   */
  async initializeSafetyGuides() {
    try {
      const guidesContainer = document.getElementById('guides-grid');
      if (!guidesContainer) return;
      
      // Load guides from JSON file
      const response = await fetch('/assets/emergency-guide.json');
      const guides = await response.json();
      
      // Create guide cards
      guidesContainer.innerHTML = guides.map(guide => this.createGuideCard(guide)).join('');
      
      // Animate cards into view
      const cards = guidesContainer.querySelectorAll('.guide-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          Utils.animateIntoView(card, 'fade-in');
        }, index * 100);
      });
      
    } catch (error) {
      console.error('Failed to load safety guides:', error);
    }
  }

  /**
   * Create guide card HTML
   */
  createGuideCard(guide) {
    return `
      <div class="guide-card" onclick="app.showGuideModal('${guide.id}')">
        <div class="guide-card-header">
          <div class="guide-icon">
            <i class="${guide.icon}"></i>
          </div>
          <h3>${Utils.sanitizeHtml(guide.title)}</h3>
        </div>
        <p>${Utils.sanitizeHtml(guide.description)}</p>
        <div class="guide-steps">
          <span class="guide-steps-count">${guide.steps.length} steps</span>
        </div>
        <div class="guide-actions">
          <span class="guide-priority ${guide.priority}">${guide.priority}</span>
          <i class="fas fa-arrow-right"></i>
        </div>
      </div>
    `;
  }

  /**
   * Show guide modal
   */
  showGuideModal(guideId) {
    // Implementation for showing guide modal
    const modal = document.getElementById('guide-modal');
    if (modal) {
      // Load guide content and show modal
      this.loadGuideContent(guideId);
      modal.classList.add('active');
    }
  }

  /**
   * Load guide content
   */
  async loadGuideContent(guideId) {
    try {
      const response = await fetch('/assets/emergency-guide.json');
      const guides = await response.json();
      const guide = guides.find(g => g.id === guideId);
      
      if (guide) {
        const modalTitle = document.getElementById('guide-modal-title');
        const modalBody = document.getElementById('guide-modal-body');
        
        if (modalTitle) modalTitle.textContent = guide.title;
        if (modalBody) {
          modalBody.innerHTML = `
            <div class="guide-content">
              <div class="guide-description">
                <p>${Utils.sanitizeHtml(guide.description)}</p>
              </div>
              <div class="emergency-steps">
                ${guide.steps.map((step, index) => `
                  <div class="emergency-step">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-content">
                      <h4>${Utils.sanitizeHtml(step.title)}</h4>
                      <p>${Utils.sanitizeHtml(step.description)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to load guide content:', error);
    }
  }

  /**
   * Initialize modals
   */
  initializeModals() {
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
      }
    });
    
    // Close modal when clicking close button
    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', () => {
        button.closest('.modal').classList.remove('active');
      });
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
      }
    });
  }

  /**
   * Initialize animations
   */
  initializeAnimations() {
    // Animate elements on scroll
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
    animatedElements.forEach(element => {
      Utils.animateIntoView(element);
    });
  }

  /**
   * Initialize tooltips
   */
  initializeTooltips() {
    // Add tooltip functionality
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip-content';
      tooltip.textContent = element.getAttribute('data-tooltip');
      element.appendChild(tooltip);
      element.classList.add('tooltip');
    });
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    const disasters = storage.getCachedDisasters();
    const activeAlertsEl = document.getElementById('active-alerts');
    const totalEventsEl = document.getElementById('total-events');
    const lastUpdatedEl = document.getElementById('last-updated');
    
    if (activeAlertsEl) {
      activeAlertsEl.textContent = disasters.filter(d => this.isActiveAlert(d)).length;
    }
    
    if (totalEventsEl) {
      totalEventsEl.textContent = disasters.length;
    }
    
    if (lastUpdatedEl) {
      const lastUpdate = storage.get('disastersCacheTime');
      lastUpdatedEl.textContent = lastUpdate ? Utils.formatRelativeTime(new Date(lastUpdate)) : 'Never';
    }
  }

  /**
   * Check if disaster is an active alert
   */
  isActiveAlert(disaster) {
    const now = new Date();
    const disasterDate = new Date(disaster.date);
    const hoursDiff = (now - disasterDate) / (1000 * 60 * 60);
    
    // Consider alerts active if they're less than 24 hours old
    return hoursDiff < 24;
  }

  /**
   * Handle window load
   */
  handleWindowLoad() {
    // Preload critical resources
    this.preloadResources();
    
    // Start auto-refresh if enabled
    const autoRefresh = storage.getPreference('autoRefresh', true);
    if (autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    // Update map size if needed
    if (this.map) {
      this.map.invalidateSize();
    }
    
    // Update mobile navigation
    if (window.innerWidth > 768) {
      const navMenu = document.querySelector('.nav-menu');
      if (navMenu) {
        navMenu.classList.remove('active');
      }
    }
  }

  /**
   * Handle online/offline status
   */
  handleOnlineStatus(isOnline) {
    if (isOnline) {
      Utils.showNotification('Back Online', 'Connection restored. Refreshing data...', 'success');
      this.refreshData();
    } else {
      Utils.showNotification('Offline', 'You are currently offline. Some features may be limited.', 'warning');
    }
  }

  /**
   * Refresh data
   */
  async refreshData() {
    try {
      const refreshBtn = document.getElementById('refresh-map');
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      }
      
      await this.loadDisasterData();
      await this.loadWeatherData();
      this.updateStatistics();
      
      Utils.showNotification('Data Updated', 'Disaster data has been refreshed', 'success', 3000);
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
      Utils.showNotification('Refresh Failed', 'Unable to refresh data. Please try again.', 'error');
    } finally {
      const refreshBtn = document.getElementById('refresh-map');
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
      }
    }
  }

  /**
   * Locate user
   */
  async locateUser() {
    try {
      const locateBtn = document.getElementById('locate-user');
      if (locateBtn) {
        locateBtn.disabled = true;
        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
      }
      
      const location = await Utils.getUserLocation();
      storage.setUserLocation(location);
      
      if (this.map) {
        this.map.setUserLocation(location);
      }
      
      Utils.showNotification('Location Found', 'Your location has been updated', 'success', 3000);
      
    } catch (error) {
      console.error('Failed to get user location:', error);
      Utils.showNotification('Location Error', error.message, 'error');
    } finally {
      const locateBtn = document.getElementById('locate-user');
      if (locateBtn) {
        locateBtn.disabled = false;
        locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i> My Location';
      }
    }
  }

  /**
   * Setup component communication
   */
  setupComponentCommunication() {
    // Listen for SOS alerts
    document.addEventListener('sos-activated', (e) => {
      this.handleSOSAlert(e.detail);
    });
    
    // Listen for map events
    document.addEventListener('disaster-selected', (e) => {
      this.handleDisasterSelected(e.detail);
    });
  }

  /**
   * Handle SOS alert
   */
  handleSOSAlert(details) {
    // Add to history
    storage.addSOSEntry(details);
    
    // Show notification
    Utils.showNotification('SOS Activated', 'Emergency signal sent successfully', 'success');
    
    // Vibrate if supported
    if (Utils.supportsVibration()) {
      Utils.vibrate([200, 100, 200]);
    }
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
   * Show error message
   */
  showError(title, message) {
    Utils.showNotification(title, message, 'error');
  }

  /**
   * Show empty state
   */
  showEmptyState(message) {
    const disasterList = document.getElementById('disaster-list');
    if (disasterList) {
      Utils.showEmpty(disasterList, message, 'fas fa-shield-alt');
    }
  }

  /**
   * Show disaster on map
   */
  showDisasterOnMap(disasterId) {
    if (this.map) {
      this.map.showDisaster(disasterId);
      Utils.scrollTo('#map', 80);
    }
  }

  /**
   * Share disaster
   */
  async shareDisaster(disasterId) {
    try {
      const disasters = storage.getCachedDisasters();
      const disaster = disasters.find(d => d.id === disasterId);
      
      if (disaster && navigator.share) {
        await navigator.share({
          title: `DisasterAlert: ${disaster.title}`,
          text: disaster.description,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const url = `${window.location.origin}${window.location.pathname}#disaster-${disasterId}`;
        await Utils.copyToClipboard(url);
        Utils.showNotification('Link Copied', 'Disaster link copied to clipboard', 'success');
      }
    } catch (error) {
      console.error('Failed to share disaster:', error);
    }
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    const interval = storage.getPreference('refreshInterval', 300000); // 5 minutes
    
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refreshData();
      }
    }, interval);
  }

  /**
   * Apply preferences
   */
  applyPreferences(preferences) {
    // Apply any preference-based configurations
    if (preferences.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Initialize filters
   */
  initializeFilters() {
    // Filter implementation handled by event listeners
  }

  /**
   * Handle filter change
   */
  handleFilterChange(filterValue) {
    if (this.map) {
      this.map.filterDisasters(filterValue);
    }
  }

  /**
   * Handle history filter
   */
  handleHistoryFilter(filterValue) {
    this.filterDisasterHistory(filterValue);
  }

  /**
   * Filter disaster history
   */
  filterDisasterHistory(filterValue) {
    const disasters = storage.getCachedDisasters();
    let filtered = disasters;
    
    if (filterValue !== 'all') {
      filtered = disasters.filter(d => d.categories.includes(filterValue));
    }
    
    this.displayDisasters(filtered);
  }

  /**
   * Handle search
   */
  handleSearch(searchTerm) {
    if (searchTerm.length === 0) {
      this.displayDisasters(storage.getCachedDisasters());
      return;
    }
    
    const disasters = storage.getCachedDisasters();
    const filtered = disasters.filter(disaster => 
      disaster.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disaster.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      disaster.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.displayDisasters(filtered);
    
    // Add to search history
    storage.addSearchTerm(searchTerm);
  }

  /**
   * Load more history
   */
  loadMoreHistory() {
    // Implementation for pagination
    Utils.showNotification('Info', 'All available disasters are already loaded', 'info');
  }

  /**
   * Toggle notifications
   */
  async toggleNotifications() {
    try {
      const permission = await Utils.requestNotificationPermission();
      if (permission === 'granted') {
        storage.setPreference('notifications', true);
        Utils.showNotification('Notifications Enabled', 'You will receive disaster alerts', 'success');
      } else {
        storage.setPreference('notifications', false);
        Utils.showNotification('Notifications Disabled', 'You will not receive alerts', 'warning');
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    }
  }

  /**
   * Handle navigation
   */
  handleNavigation(e) {
    // Handle dynamic navigation if needed
  }

  /**
   * Display weather alerts
   */
  displayWeatherAlerts(weather) {
    if (weather.alerts && weather.alerts.length > 0) {
      // Show weather alerts
      const alertBanner = document.createElement('div');
      alertBanner.className = 'alert-banner show';
      alertBanner.innerHTML = `
        <div class="alert-banner-content">
          <div class="alert-message">
            <i class="fas fa-exclamation-triangle"></i>
            Weather Alert: ${weather.alerts[0].event}
          </div>
          <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
      `;
      document.body.appendChild(alertBanner);
    }
  }

  /**
   * Show install prompt
   */
  showInstallPrompt(e) {
    // Store the event for later use
    this.deferredPrompt = e;
    
    // Show install button or prompt
    Utils.showNotification(
      'Install App',
      'Install DisasterAlert for offline access and push notifications',
      'info',
      10000
    );
  }

  /**
   * Preload resources
   */
  preloadResources() {
    // Preload critical resources
    const resources = [
      '/assets/emergency-guide.json'
    ];
    
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }
}

// Initialize the application
const app = new DisasterAlert();

// Make app globally available
window.app = app;
