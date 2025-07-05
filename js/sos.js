// SOS Emergency System

class SOSSystem {
  constructor() {
    this.button = null;
    this.isActive = false;
    this.holdTimer = null;
    this.countdownTimer = null;
    this.holdDuration = 3000; // 3 seconds
    this.currentLocation = null;
    this.emergencyContacts = [];
    this.init();
  }

  /**
   * Initialize SOS system
   */
  init() {
    this.button = document.getElementById('sos-button');
    this.statusElement = document.getElementById('sos-status');
    
    if (!this.button) {
      console.error('SOS button not found');
      return;
    }
    
    this.setupEventListeners();
    this.loadEmergencyContacts();
    this.updateStatus('ready');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.button.addEventListener('mousedown', (e) => this.startHold(e));
    this.button.addEventListener('mouseup', (e) => this.endHold(e));
    this.button.addEventListener('mouseleave', (e) => this.endHold(e));
    
    // Touch events
    this.button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startHold(e);
    });
    
    this.button.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.endHold(e);
    });
    
    this.button.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.endHold(e);
    });
    
    // Keyboard events
    this.button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.startHold(e);
      }
    });
    
    this.button.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.endHold(e);
      }
    });
  }

  /**
   * Start hold timer
   */
  startHold(e) {
    if (this.isActive) return;
    
    this.button.classList.add('active');
    this.updateStatus('holding');
    
    // Start countdown
    this.startCountdown();
    
    // Set hold timer
    this.holdTimer = setTimeout(() => {
      this.activateSOS();
    }, this.holdDuration);
    
    // Vibrate on start
    if (Utils.supportsVibration()) {
      Utils.vibrate(100);
    }
  }

  /**
   * End hold timer
   */
  endHold(e) {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    
    if (!this.isActive) {
      this.button.classList.remove('active');
      this.updateStatus('ready');
    }
  }

  /**
   * Start countdown display
   */
  startCountdown() {
    let remainingTime = this.holdDuration;
    const interval = 100;
    
    this.countdownTimer = setInterval(() => {
      remainingTime -= interval;
      const seconds = Math.ceil(remainingTime / 1000);
      
      if (seconds > 0) {
        this.updateStatus('holding', `Activating in ${seconds}s...`);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, interval);
  }

  /**
   * Activate SOS
   */
  async activateSOS() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.button.classList.add('active');
    this.updateStatus('active', 'SOS ACTIVATED');
    
    try {
      // Get current location
      await this.getCurrentLocation();
      
      // Send SOS signal
      await this.sendSOSSignal();
      
      // Show success message
      this.showSOSSuccess();
      
    } catch (error) {
      console.error('SOS activation failed:', error);
      this.showSOSError(error.message);
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation() {
    try {
      this.updateStatus('active', 'Getting location...');
      
      // Try to get fresh location
      const location = await Utils.getUserLocation();
      this.currentLocation = location;
      storage.setUserLocation(location);
      
    } catch (error) {
      // Use cached location if available
      const cachedLocation = storage.getUserLocation();
      if (cachedLocation && storage.isUserLocationValid(3600000)) { // 1 hour
        this.currentLocation = cachedLocation;
        console.log('Using cached location for SOS');
      } else {
        throw new Error('Unable to determine your location');
      }
    }
  }

  /**
   * Send SOS signal
   */
  async sendSOSSignal() {
    this.updateStatus('active', 'Sending SOS signal...');
    
    const sosData = {
      timestamp: new Date().toISOString(),
      location: this.currentLocation,
      userAgent: navigator.userAgent,
      type: 'emergency',
      message: 'Emergency SOS activated from DisasterAlert app'
    };
    
    // Store SOS entry locally
    storage.addSOSEntry(sosData);
    
    // Send notifications
    await this.sendNotifications(sosData);
    
    // Try to send to emergency services API (if available)
    await this.sendToEmergencyServices(sosData);
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('sos-activated', {
      detail: sosData
    }));
  }

  /**
   * Send notifications
   */
  async sendNotifications(sosData) {
    // Browser notification
    if (Notification.permission === 'granted') {
      const notification = new Notification('SOS Activated', {
        body: 'Emergency signal sent successfully',
        icon: '/assets/icons/icon-192.svg',
        tag: 'sos-activation',
        requireInteraction: true
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
    
    // SMS/Call emergency contacts
    await this.contactEmergencyContacts(sosData);
  }

  /**
   * Contact emergency contacts
   */
  async contactEmergencyContacts(sosData) {
    const contacts = storage.getEmergencyContacts();
    
    if (contacts.length === 0) {
      console.log('No emergency contacts configured');
      return;
    }
    
    const message = this.formatEmergencyMessage(sosData);
    
    // For demo purposes, we'll show the contacts and message
    // In a real app, this would integrate with SMS/email services
    this.showEmergencyContactDialog(contacts, message);
  }

  /**
   * Format emergency message
   */
  formatEmergencyMessage(sosData) {
    const location = sosData.location;
    const coords = location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Unknown';
    const timestamp = new Date(sosData.timestamp).toLocaleString();
    
    return `EMERGENCY ALERT from DisasterAlert app
    
Time: ${timestamp}
Location: ${coords}
Google Maps: https://maps.google.com/maps?q=${coords}

This is an automated emergency message. Please respond immediately.`;
  }

  /**
   * Show emergency contact dialog
   */
  showEmergencyContactDialog(contacts, message) {
    const dialog = document.createElement('div');
    dialog.className = 'emergency-dialog';
    dialog.innerHTML = `
      <div class="emergency-dialog-content">
        <div class="emergency-dialog-header">
          <h3><i class="fas fa-exclamation-triangle"></i> Emergency Contacts</h3>
        </div>
        <div class="emergency-dialog-body">
          <p><strong>The following contacts will be notified:</strong></p>
          <div class="emergency-contacts-list">
            ${contacts.map(contact => `
              <div class="emergency-contact">
                <div class="contact-info">
                  <strong>${Utils.sanitizeHtml(contact.name)}</strong>
                  <span>${Utils.sanitizeHtml(contact.phone)}</span>
                </div>
                <div class="contact-actions">
                  <a href="tel:${contact.phone}" class="btn btn-sm btn-primary">
                    <i class="fas fa-phone"></i> Call
                  </a>
                  <a href="sms:${contact.phone}?body=${encodeURIComponent(message)}" class="btn btn-sm btn-outline">
                    <i class="fas fa-sms"></i> SMS
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="emergency-message">
            <h4>Emergency Message:</h4>
            <textarea readonly class="emergency-message-text">${message}</textarea>
            <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText(this.previousElementSibling.value)">
              <i class="fas fa-copy"></i> Copy Message
            </button>
          </div>
        </div>
        <div class="emergency-dialog-actions">
          <button class="btn btn-primary" onclick="this.closest('.emergency-dialog').remove()">
            <i class="fas fa-check"></i> Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (dialog.parentElement) {
        dialog.parentElement.removeChild(dialog);
      }
    }, 30000);
  }

  /**
   * Send to emergency services
   */
  async sendToEmergencyServices(sosData) {
    // In a real implementation, this would send to emergency services API
    // For now, we'll just log the attempt
    console.log('SOS data that would be sent to emergency services:', sosData);
  }

  /**
   * Show SOS success
   */
  showSOSSuccess() {
    this.updateStatus('success', 'SOS signal sent successfully');
    
    // Vibrate success pattern
    if (Utils.supportsVibration()) {
      Utils.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Show success notification
    Utils.showNotification(
      'SOS Activated',
      'Emergency signal sent successfully. Help is on the way.',
      'success',
      10000
    );
    
    // Reset after 10 seconds
    setTimeout(() => {
      this.resetSOS();
    }, 10000);
  }

  /**
   * Show SOS error
   */
  showSOSError(message) {
    this.updateStatus('error', `SOS failed: ${message}`);
    
    // Vibrate error pattern
    if (Utils.supportsVibration()) {
      Utils.vibrate([500, 200, 500]);
    }
    
    // Show error notification
    Utils.showNotification(
      'SOS Failed',
      message,
      'error',
      10000
    );
    
    // Reset after 5 seconds
    setTimeout(() => {
      this.resetSOS();
    }, 5000);
  }

  /**
   * Reset SOS state
   */
  resetSOS() {
    this.isActive = false;
    this.button.classList.remove('active');
    this.updateStatus('ready');
    
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Update status display
   */
  updateStatus(status, message = null) {
    if (!this.statusElement) return;
    
    const statusConfig = {
      ready: {
        icon: 'fas fa-shield-alt',
        text: 'Ready for Emergency',
        class: 'ready'
      },
      holding: {
        icon: 'fas fa-hand-paper',
        text: message || 'Hold to activate...',
        class: 'holding'
      },
      active: {
        icon: 'fas fa-exclamation-triangle',
        text: message || 'SOS ACTIVE',
        class: 'active'
      },
      success: {
        icon: 'fas fa-check-circle',
        text: message || 'SOS sent successfully',
        class: 'success'
      },
      error: {
        icon: 'fas fa-exclamation-circle',
        text: message || 'SOS failed',
        class: 'error'
      }
    };
    
    const config = statusConfig[status] || statusConfig.ready;
    
    this.statusElement.className = `sos-status ${config.class}`;
    this.statusElement.innerHTML = `
      <i class="${config.icon}"></i>
      <span>${config.text}</span>
    `;
  }

  /**
   * Load emergency contacts
   */
  loadEmergencyContacts() {
    this.emergencyContacts = storage.getEmergencyContacts();
  }

  /**
   * Test SOS system
   */
  testSOS() {
    if (this.isActive) {
      console.log('SOS system is currently active');
      return;
    }
    
    console.log('Testing SOS system...');
    
    // Simulate SOS activation for testing
    this.isActive = true;
    this.updateStatus('active', 'TEST MODE - SOS ACTIVATED');
    
    setTimeout(() => {
      this.updateStatus('success', 'Test completed successfully');
      setTimeout(() => {
        this.resetSOS();
      }, 3000);
    }, 2000);
  }

  /**
   * Get SOS history
   */
  getSOSHistory() {
    return storage.getSOSHistory();
  }

  /**
   * Clear SOS history
   */
  clearSOSHistory() {
    storage.clearSOSHistory();
  }

  /**
   * Add emergency contact
   */
  addEmergencyContact(contact) {
    if (!contact.name || !contact.phone) {
      throw new Error('Contact name and phone are required');
    }
    
    storage.addEmergencyContact(contact);
    this.loadEmergencyContacts();
    
    Utils.showNotification(
      'Contact Added',
      `${contact.name} has been added to your emergency contacts`,
      'success'
    );
  }

  /**
   * Remove emergency contact
   */
  removeEmergencyContact(contactId) {
    storage.removeEmergencyContact(contactId);
    this.loadEmergencyContacts();
    
    Utils.showNotification(
      'Contact Removed',
      'Emergency contact has been removed',
      'success'
    );
  }

  /**
   * Check if SOS is available
   */
  isSOSAvailable() {
    return !this.isActive && this.button && !this.button.disabled;
  }

  /**
   * Enable SOS button
   */
  enableSOS() {
    if (this.button) {
      this.button.disabled = false;
      this.updateStatus('ready');
    }
  }

  /**
   * Disable SOS button
   */
  disableSOS(reason = 'SOS is temporarily disabled') {
    if (this.button) {
      this.button.disabled = true;
      this.updateStatus('error', reason);
    }
  }
}

// CSS for SOS system
const sosStyles = `
  .sos-status.ready {
    background-color: var(--success-color);
  }
  
  .sos-status.holding {
    background-color: var(--warning-color);
    animation: pulse 0.5s infinite;
  }
  
  .sos-status.active {
    background-color: var(--danger-color);
    animation: pulse 0.5s infinite;
  }
  
  .sos-status.success {
    background-color: var(--success-color);
  }
  
  .sos-status.error {
    background-color: var(--danger-color);
  }
  
  .emergency-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }
  
  .emergency-dialog-content {
    background: var(--bg-primary);
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .emergency-dialog-header {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--danger-color);
    color: white;
    border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  }
  
  .emergency-dialog-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .emergency-dialog-body {
    padding: 20px;
  }
  
  .emergency-contacts-list {
    margin: 15px 0;
  }
  
  .emergency-contact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: 10px;
  }
  
  .contact-info {
    display: flex;
    flex-direction: column;
  }
  
  .contact-actions {
    display: flex;
    gap: 5px;
  }
  
  .emergency-message {
    margin-top: 20px;
    padding: 15px;
    background: var(--bg-secondary);
    border-radius: var(--border-radius);
  }
  
  .emergency-message h4 {
    margin-top: 0;
    margin-bottom: 10px;
  }
  
  .emergency-message-text {
    width: 100%;
    height: 100px;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    resize: vertical;
    font-family: monospace;
    font-size: 12px;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  
  .emergency-dialog-actions {
    padding: 20px;
    border-top: 1px solid var(--border-color);
    text-align: center;
  }
  
  @media (max-width: 768px) {
    .emergency-contact {
      flex-direction: column;
      gap: 10px;
    }
    
    .contact-actions {
      width: 100%;
      justify-content: center;
    }
  }
`;

// Inject CSS
const sosStyle = document.createElement('style');
sosStyle.textContent = sosStyles;
document.head.appendChild(sosStyle);

