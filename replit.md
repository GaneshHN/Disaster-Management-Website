# DisasterAlert - Real-time Disaster Tracking System

## Overview

DisasterAlert is a Progressive Web Application (PWA) designed to provide real-time disaster tracking and emergency response capabilities. The application serves as a comprehensive platform for monitoring natural disasters, accessing emergency guides, and facilitating emergency communication through an SOS system.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3
- **Architecture Pattern**: Modular JavaScript classes with clear separation of concerns
- **PWA Features**: Service Worker for offline functionality, Web App Manifest for installability
- **UI Framework**: Custom CSS with responsive design using CSS Grid and Flexbox

### Key Components

#### 1. Core Application (`js/app.js`)
- **Purpose**: Main application controller that orchestrates all components
- **Responsibilities**: Initialize components, manage application state, handle loading states
- **Architecture Decision**: Centralized controller pattern for better coordination between modules

#### 2. Interactive Map System (`js/map.js`)
- **Technology**: Leaflet.js for mapping functionality
- **Features**: Real-time disaster visualization, user location tracking, custom markers
- **Data Sources**: NASA EONET API for disaster events, USGS for earthquake data

#### 3. Emergency Response System (`js/sos.js`)
- **Features**: Hold-to-activate SOS button, location sharing, emergency contact management
- **User Interaction**: 3-second hold activation to prevent accidental triggers
- **Safety Measures**: Visual feedback and confirmation dialogs

#### 4. API Integration (`js/api.js`)
- **External APIs**: NASA EONET, USGS Earthquake API, OpenWeatherMap
- **Features**: Rate limiting, caching, error handling, retry mechanisms
- **Architecture Decision**: Centralized API client with consistent error handling

#### 5. Data Management (`js/storage.js`)
- **Storage Strategy**: LocalStorage with fallback to in-memory storage
- **Features**: Data versioning, migration support, error recovery
- **Data Types**: User preferences, emergency contacts, cached disaster data

#### 6. Utility Functions (`js/utils.js`)
- **Purpose**: Shared utility functions for common operations
- **Features**: Debouncing, throttling, date formatting, distance calculations

## Data Flow

1. **Initialization**: App loads, initializes core components, fetches initial disaster data
2. **Real-time Updates**: Periodic API calls to fetch latest disaster information
3. **User Interactions**: Map interactions, SOS activation, guide navigation
4. **Data Persistence**: User preferences and emergency contacts saved locally
5. **Offline Support**: Service Worker caches resources for offline functionality

## External Dependencies

### CDN Resources
- **Leaflet.js**: Interactive mapping library
- **Font Awesome**: Icon library for UI elements
- **Google Fonts**: Inter font family for typography
- **Chart.js**: Data visualization (referenced in service worker)

### API Integrations
- **NASA EONET**: Natural disaster event data
- **USGS**: Earthquake monitoring data
- **OpenWeatherMap**: Weather data integration

## Deployment Strategy

### Progressive Web App Features
- **Service Worker**: Implements caching strategies for offline functionality
- **Web App Manifest**: Enables installation on mobile devices
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Caching Strategy
- **Static Resources**: Cache-first strategy for assets and stylesheets
- **API Data**: Network-first with fallback to cache for disaster data
- **External Libraries**: Cache-first for CDN resources

### Performance Optimizations
- **Lazy Loading**: Components initialized on demand
- **Rate Limiting**: Prevents API abuse and manages request frequency
- **Resource Preloading**: Critical resources preloaded for faster initial load

## Changelog

```
Changelog:
- July 05, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## Architecture Decisions

### 1. Vanilla JavaScript Choice
- **Problem**: Need for lightweight, fast-loading application
- **Solution**: Vanilla JavaScript with modular class structure
- **Rationale**: Reduces bundle size, improves performance, maintains simplicity
- **Trade-offs**: More manual DOM manipulation but better performance

### 2. PWA Implementation
- **Problem**: Need for offline functionality and mobile app-like experience
- **Solution**: Service Worker with comprehensive caching strategy
- **Benefits**: Offline access, faster loading, installable on mobile devices

### 3. Modular Component Architecture
- **Problem**: Managing complex application state and interactions
- **Solution**: Separate classes for each major component (Map, SOS, API, Storage)
- **Benefits**: Clear separation of concerns, easier testing, maintainable code

### 4. Multi-API Integration
- **Problem**: Single API sources may be unreliable or incomplete
- **Solution**: Integration with multiple authoritative data sources
- **Benefits**: Comprehensive disaster coverage, redundancy, specialized data types

### 5. Safety-First Emergency System
- **Problem**: Preventing accidental emergency activations
- **Solution**: 3-second hold mechanism with visual feedback
- **Benefits**: Reduces false alarms while maintaining quick access in emergencies