# Implementation Prompt Queue

This file contains all the implementation prompts from the plan in order, ready to be executed one by one.

## Phase 1: Foundation & Core Infrastructure (Week 1)

### 1.1 Project Setup & Basic Architecture
**Prompt**: "Create a Next.js TypeScript project with Tailwind CSS, ESLint, and Prettier. Set up the folder structure with app directory (Next.js 13+), components, lib, and types directories. Include basic configuration for Tailwind, TypeScript, and development tools."

### 1.2 Database Schema Design
**Prompt**: "Design a SQLite database schema for the accessibility tracking app. Include tables for users, accessibility profiles, journey sessions, location points, and transport segments. Store spatial data as JSON or separate lat/lng columns. Include proper indexes and foreign key relationships. Use better-sqlite3 for Node.js integration."

### 1.3 Basic Backend API
**Prompt**: "Create Next.js API routes with TypeScript, SQLite database connection using better-sqlite3, and basic REST API endpoints for user management and journey tracking. Include proper error handling, input validation, and database utility functions."

## Phase 2: User Interface & Accessibility Profiles (Week 2)

### 2.1 Accessibility Profile System
**Prompt**: "Create a multi-step accessibility profile form using Next.js and Tailwind CSS. Include the hierarchical profile system from the document: Level 1 (Primary Mobility/Sensory Profile) and Level 2 (Specific Needs). Make it fully accessible with proper ARIA labels, keyboard navigation, and screen reader support. Use Tailwind's accessibility utilities and custom components."

### 2.2 User Onboarding & Consent Flow
**Prompt**: "Design an onboarding flow using Next.js and Tailwind CSS that explains the app's purpose, data collection practices, and privacy protections. Include granular consent checkboxes for location tracking, motion sensors, and data sharing. Use clear, simple language, visual aids, and Tailwind's design system for a polished user experience."

### 2.3 Journey Tracking Interface
**Prompt**: "Create a simple, intuitive interface for starting and stopping journey tracking. Include a prominent start/stop button, real-time status indicator, and clear visual feedback. Design for minimal interaction during journeys."

## Phase 3: Location Tracking & Data Collection (Week 3)

### 3.1 Web Geolocation Implementation
**Prompt**: "Implement location tracking using the Web Geolocation API. Include fallback mechanisms, error handling, and battery optimization. Store location data with timestamps and accuracy metrics."

### 3.2 Device Motion Sensors
**Prompt**: "Implement device motion and orientation sensors using the Web Device Motion API. Collect accelerometer and gyroscope data for transport mode detection. Handle browser compatibility and permission requests."

### 3.3 Real-time Data Visualization
**Prompt**: "Create a real-time map interface using OpenStreetMap with Leaflet.js that shows the user's current location and journey path. Include transport mode indicators and journey statistics. Make it responsive and accessible with proper ARIA labels and keyboard navigation."

## Phase 4: AI Core - Transport Mode Detection (Week 4)

### 4.1 Basic TMD Model
**Prompt**: "Implement a basic transport mode detection model using scikit-learn. Start with a Random Forest classifier trained on simulated data. Include feature extraction from accelerometer and GPS data."

### 4.2 GTFS Data Integration
**Prompt**: "Set up data ingestion from Victorian GTFS feeds. Create services to fetch and parse GTFS Schedule and GTFS-Realtime data. Store and index the data for efficient querying."

### 4.3 Hybrid Inference Engine
**Prompt**: "Implement the hybrid inference engine that combines sensor-based TMD with GTFS vehicle position data. Create logic to resolve transport mode ambiguities using real-time vehicle locations."

## Phase 5: Data Analysis & Visualization (Week 5)

### 5.1 Journey Analysis Pipeline
**Prompt**: "Create a data processing pipeline that analyzes completed journeys. Include map matching, segment classification, and anomaly detection. Generate accessibility insights from journey data."

### 5.2 Dashboard Development
**Prompt**: "Build an interactive dashboard using Next.js and Tailwind CSS for visualizing accessibility data. Include heatmaps using Leaflet.js, charts with Chart.js or Recharts, and filters for different accessibility profiles. Make it responsive and accessible with proper ARIA labels and keyboard navigation."

### 5.3 Data Export & Reporting
**Prompt**: "Create data export functionality for generating reports. Include CSV/JSON exports, summary statistics, and visual reports. Implement proper data anonymization."

## Phase 6: Polish & Demo Preparation (Week 6)

### 6.1 PWA Features
**Prompt**: "Implement Progressive Web App features including service worker, offline support, and app-like experience. Add push notifications for journey reminders."

### 6.2 Performance Optimization
**Prompt**: "Optimize the application for performance and accessibility. Include code splitting, lazy loading, and performance monitoring. Ensure WCAG 2.1 AA compliance."

### 6.3 Demo Preparation
**Prompt**: "Create a compelling demo presentation with sample data and user scenarios. Include a demo script, sample journeys, and key insights to showcase."

## Additional Component Prompts

### User Profile Form Component
**Prompt**: "Create a Next.js component for the accessibility profile form with the following requirements:
- Multi-step wizard with progress indicator
- Level 1: Primary mobility/sensory profile selection (wheelchair, ambulatory, blind, deaf, neurodivergent, assistance animal)
- Level 2: Specific needs based on Level 1 selection
- Form validation and error handling
- Accessibility features (ARIA labels, keyboard navigation)
- Tailwind CSS styling with custom components
- TypeScript interfaces for form data"

### Journey Tracking Interface Component
**Prompt**: "Create a Next.js component for journey tracking with:
- Large, prominent start/stop button
- Real-time status indicator showing tracking state
- Current location display on OSM map with Leaflet
- Journey statistics (duration, distance, transport modes)
- Battery level indicator
- Emergency stop functionality
- Responsive design for mobile devices using Tailwind CSS"

### Accessibility Dashboard Component
**Prompt**: "Create a Next.js dashboard component with:
- Interactive OSM map showing accessibility heatmap using Leaflet
- Filter controls for accessibility profiles
- Statistical charts using Chart.js or Recharts
- Data tables with sorting and filtering
- Export functionality
- Real-time data updates
- Responsive grid layout using Tailwind CSS"

### Location Tracking API
**Prompt**: "Create Next.js API routes for location tracking:
- POST /api/journeys/start - Start new journey
- POST /api/journeys/[id]/location - Add location point
- POST /api/journeys/[id]/stop - End journey
- GET /api/journeys/[id] - Get journey details
- GET /api/journeys - List user journeys
Include validation, error handling, proper HTTP status codes, and SQLite database operations"

### Transport Mode Detection Service
**Prompt**: "Create a Python service for transport mode detection:
- Feature extraction from accelerometer and GPS data
- Random Forest classifier for mode detection
- GTFS data integration for vehicle matching
- Confidence scoring and ambiguity resolution
- Model training and evaluation utilities
- REST API endpoints for real-time classification"

### Data Analysis Pipeline
**Prompt**: "Create a data processing pipeline that:
- Processes completed journeys
- Performs map matching using GTFS data
- Calculates accessibility metrics
- Detects anomalies and issues
- Generates insights and recommendations
- Updates dashboard data in real-time"

---

**Total Prompts: 18 main implementation prompts + 6 additional component prompts = 24 total prompts**

This queue can be processed sequentially, with each prompt building upon the previous ones. The prompts are designed to be executed one at a time to ensure proper development flow and dependency management. 