// Utility functions for DisasterAlert

class Utils {
  /**
   * Debounce function to limit the rate of function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Whether to execute immediately
   * @returns {Function} Debounced function
   */
  static debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function to limit the rate of function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Format date to human-readable string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (!date) return 'Unknown';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diff / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date to relative time string
   * @param {Date|string} date - Date to format
   * @returns {string} Relative time string
   */
  static formatRelativeTime(date) {
    if (!date) return 'Unknown';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diff / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Calculate distance between two coordinates
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   * @param {number} distance - Distance in kilometers
   * @returns {string} Formatted distance string
   */
  static formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 100) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sanitize HTML to prevent XSS attacks
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML string
   */
  static sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  static validatePhone(phone) {
    const re = /^\+?[\d\s\-\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  /**
   * Format magnitude for display
   * @param {number} magnitude - Magnitude value
   * @returns {string} Formatted magnitude string
   */
  static formatMagnitude(magnitude) {
    if (magnitude == null) return 'Unknown';
    return `${magnitude.toFixed(1)}`;
  }

  /**
   * Get severity level based on magnitude
   * @param {number} magnitude - Magnitude value
   * @param {string} type - Disaster type
   * @returns {string} Severity level (low, medium, high)
   */
  static getSeverityLevel(magnitude, type) {
    if (magnitude == null) return 'unknown';
    
    switch (type) {
      case 'earthquakes':
        if (magnitude < 4) return 'low';
        if (magnitude < 6) return 'medium';
        return 'high';
      case 'storms':
        if (magnitude < 3) return 'low';
        if (magnitude < 4) return 'medium';
        return 'high';
      case 'volcanoes':
        if (magnitude < 3) return 'low';
        if (magnitude < 4) return 'medium';
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Get disaster type icon
   * @param {string} type - Disaster type
   * @returns {string} Icon class
   */
  static getDisasterIcon(type) {
    const icons = {
      earthquakes: 'fas fa-mountain',
      volcanoes: 'fas fa-volcano',
      floods: 'fas fa-water',
      storms: 'fas fa-cloud-rain',
      wildfires: 'fas fa-fire',
      severeStorms: 'fas fa-bolt',
      default: 'fas fa-exclamation-triangle'
    };
    return icons[type] || icons.default;
  }

  /**
   * Get disaster type color
   * @param {string} type - Disaster type
   * @returns {string} Color hex code
   */
  static getDisasterColor(type) {
    const colors = {
      earthquakes: '#ff4444',
      volcanoes: '#ff8800',
      floods: '#0088ff',
      storms: '#8800ff',
      wildfires: '#ff0088',
      severeStorms: '#ff4400',
      default: '#666666'
    };
    return colors[type] || colors.default;
  }

  /**
   * Show notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, warning, error, info)
   * @param {number} duration - Duration in milliseconds
   */
  static showNotification(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-header">
        <h4 class="notification-title">${this.sanitizeHtml(title)}</h4>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="notification-body">
        ${this.sanitizeHtml(message)}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-remove notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * Show loading state
   * @param {HTMLElement} element - Element to show loading state
   * @param {string} text - Loading text
   */
  static showLoading(element, text = 'Loading...') {
    element.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>${text}</p>
      </div>
    `;
  }

  /**
   * Show error state
   * @param {HTMLElement} element - Element to show error state
   * @param {string} message - Error message
   * @param {Function} retryCallback - Retry callback function
   */
  static showError(element, message, retryCallback = null) {
    element.innerHTML = `
      <div class="error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Something went wrong</h3>
        <p>${this.sanitizeHtml(message)}</p>
        ${retryCallback ? '<button class="btn btn-primary" onclick="retryCallback()">Try Again</button>' : ''}
      </div>
    `;
  }

  /**
   * Show empty state
   * @param {HTMLElement} element - Element to show empty state
   * @param {string} message - Empty state message
   * @param {string} icon - Icon class
   */
  static showEmpty(element, message, icon = 'fas fa-search') {
    element.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="${icon}"></i>
        </div>
        <h3>No results found</h3>
        <p>${this.sanitizeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * Animate element into view
   * @param {HTMLElement} element - Element to animate
   * @param {string} animation - Animation class
   */
  static animateIntoView(element, animation = 'fade-in') {
    element.classList.add(animation);
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    });
    
    observer.observe(element);
  }

  /**
   * Scroll to element smoothly
   * @param {string} selector - Element selector
   * @param {number} offset - Offset from top
   */
  static scrollTo(selector, offset = 0) {
    const element = document.querySelector(selector);
    if (element) {
      const top = element.offsetTop - offset;
      window.scrollTo({
        top: top,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Get user's location
   * @returns {Promise} Promise resolving to location coordinates
   */
  static getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes
        }
      );
    });
  }

  /**
   * Request notification permission
   * @returns {Promise} Promise resolving to permission state
   */
  static async requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }
    
    return Notification.permission;
  }

  /**
   * Send browser notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {string} icon - Notification icon
   * @param {Object} options - Additional options
   */
  static sendNotification(title, body, icon = '/assets/icons/icon-192.svg', options = {}) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: icon,
        badge: icon,
        tag: 'disaster-alert',
        requireInteraction: true,
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      return notification;
    }
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise} Promise resolving when copied
   */
  static async copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return Promise.resolve();
      } catch (err) {
        document.body.removeChild(textArea);
        return Promise.reject(err);
      }
    }
  }

  /**
   * Check if device is mobile
   * @returns {boolean} Whether device is mobile
   */
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if device supports vibration
   * @returns {boolean} Whether device supports vibration
   */
  static supportsVibration() {
    return 'vibrate' in navigator;
  }

  /**
   * Vibrate device
   * @param {number|Array} pattern - Vibration pattern
   */
  static vibrate(pattern = 200) {
    if (this.supportsVibration()) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Get device info
   * @returns {Object} Device information
   */
  static getDeviceInfo() {
    return {
      isMobile: this.isMobile(),
      supportsVibration: this.supportsVibration(),
      supportsNotifications: 'Notification' in window,
      supportsGeolocation: 'geolocation' in navigator,
      supportsServiceWorker: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimals
   * @returns {string} Formatted bytes string
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Deep clone object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }
}

// Global utility functions
window.scrollToSection = function(sectionId) {
  Utils.scrollTo(`#${sectionId}`, 80);
};

window.formatDate = Utils.formatDate;
window.formatDistance = Utils.formatDistance;
window.showNotification = Utils.showNotification;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
