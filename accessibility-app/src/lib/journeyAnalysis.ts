import { mlService } from './mlService';
import { database } from './database';

export interface JourneyAnalysis {
  journeyId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  totalDistance: number;
  totalDuration: number;
  transportSegments: TransportSegment[];
  accessibilityScore: number;
  anomalies: Anomaly[];
  insights: Insight[];
  mapMatchedRoute: MapMatchedPoint[];
}

export interface TransportSegment {
  id: string;
  startTime: Date;
  endTime: Date;
  transportMode: string;
  confidence: number;
  distance: number;
  duration: number;
  accessibilityScore: number;
  gtfsTripId?: string;
  gtfsRouteId?: string;
  gtfsStopId?: string;
}

export interface Anomaly {
  type: 'accessibility_issue' | 'route_deviation' | 'unexpected_delay' | 'sensor_error';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: Date;
  location?: { lat: number; lng: number };
  metadata?: Record<string, any>;
}

export interface Insight {
  type: 'accessibility_improvement' | 'route_optimization' | 'transport_preference' | 'accessibility_trend';
  title: string;
  description: string;
  confidence: number;
  recommendations: string[];
  metadata?: Record<string, any>;
}

export interface MapMatchedPoint {
  timestamp: Date;
  originalLat: number;
  originalLng: number;
  matchedLat: number;
  matchedLng: number;
  transportMode: string;
  confidence: number;
  gtfsTripId?: string;
  gtfsRouteId?: string;
  gtfsStopId?: string;
}

export interface AccessibilityMetrics {
  overallScore: number;
  walkingAccessibility: number;
  publicTransportAccessibility: number;
  routeEfficiency: number;
  barrierFreeAccess: number;
  assistanceRequired: number;
}

class JourneyAnalysisService {
  private static instance: JourneyAnalysisService;

  private constructor() {}

  static getInstance(): JourneyAnalysisService {
    if (!JourneyAnalysisService.instance) {
      JourneyAnalysisService.instance = new JourneyAnalysisService();
    }
    return JourneyAnalysisService.instance;
  }

  /**
   * Analyze a completed journey and generate comprehensive insights
   */
  async analyzeJourney(journeyId: string): Promise<JourneyAnalysis> {
    try {
      // Get journey data
      const journey = await this.getJourneyData(journeyId);
      if (!journey) {
        throw new Error(`Journey ${journeyId} not found`);
      }

      // Get location points
      const locationPoints = await this.getLocationPoints(journeyId);
      if (locationPoints.length === 0) {
        throw new Error(`No location data found for journey ${journeyId}`);
      }

      // Perform transport mode detection
      const transportSegments = await this.detectTransportSegments(locationPoints);

      // Perform map matching
      const mapMatchedRoute = await this.performMapMatching(locationPoints, transportSegments);

      // Calculate accessibility metrics
      const accessibilityScore = await this.calculateAccessibilityMetrics(
        journey,
        transportSegments,
        mapMatchedRoute
      );

      // Detect anomalies
      const anomalies = await this.detectAnomalies(journey, transportSegments, mapMatchedRoute);

      // Generate insights
      const insights = await this.generateInsights(journey, transportSegments, anomalies);

      // Save analysis results
      await this.saveAnalysisResults(journeyId, {
        transportSegments,
        accessibilityScore,
        anomalies,
        insights,
        mapMatchedRoute
      });

      return {
        journeyId,
        userId: journey.userId,
        startTime: journey.startedAt,
        endTime: journey.endedAt || new Date(),
        totalDistance: this.calculateTotalDistance(locationPoints),
        totalDuration: this.calculateTotalDuration(journey.startedAt, journey.endedAt),
        transportSegments,
        accessibilityScore,
        anomalies,
        insights,
        mapMatchedRoute
      };
    } catch (error) {
      console.error('Error analyzing journey:', error);
      throw error;
    }
  }

  /**
   * Get journey data from database
   */
  private async getJourneyData(journeyId: string) {
    const db = await database.getConnection();
    return db.prepare(
      'SELECT * FROM journeys WHERE id = ?'
    ).get(journeyId) as any;
  }

  /**
   * Get location points for a journey
   */
  private async getLocationPoints(journeyId: string) {
    const db = await database.getConnection();
    return db.prepare(
      'SELECT * FROM location_points WHERE journey_id = ? ORDER BY timestamp'
    ).all(journeyId) as any[];
  }

  /**
   * Detect transport segments using ML service
   */
  private async detectTransportSegments(locationPoints: any[]): Promise<TransportSegment[]> {
    const segments: TransportSegment[] = [];
    const windowSize = 10; // 10 seconds of data per window

    for (let i = 0; i < locationPoints.length; i += windowSize) {
      const window = locationPoints.slice(i, i + windowSize);
      if (window.length < 5) continue; // Need minimum data points

      try {
        // Prepare sensor data for ML service
        const sensorData = window.map(point => ({
          timestamp: new Date(point.timestamp).getTime(),
          accelerometer: point.sensor_data ? JSON.parse(point.sensor_data).accelerometer : null,
          gyroscope: point.sensor_data ? JSON.parse(point.sensor_data).gyroscope : null,
          gps: {
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy: point.accuracy,
            speed: point.speed,
            heading: point.heading
          }
        }));

        // Get ML prediction
        const prediction = await mlService.predictTransportMode(sensorData);
        
        if (prediction && prediction.predictions && prediction.predictions.length > 0) {
          const mode = prediction.predictions[0];
          const confidence = prediction.confidences ? prediction.confidences[0] : 0.8;

          segments.push({
            id: `segment_${i}`,
            startTime: new Date(window[0].timestamp),
            endTime: new Date(window[window.length - 1].timestamp),
            transportMode: mode,
            confidence,
            distance: this.calculateSegmentDistance(window),
            duration: (new Date(window[window.length - 1].timestamp).getTime() - 
                      new Date(window[0].timestamp).getTime()) / 1000,
            accessibilityScore: this.calculateSegmentAccessibilityScore(mode, confidence),
            gtfsTripId: undefined,
            gtfsRouteId: undefined,
            gtfsStopId: undefined
          });
        }
      } catch (error) {
        console.error('Error detecting transport segment:', error);
      }
    }

    return this.mergeSimilarSegments(segments);
  }

  /**
   * Perform map matching using GTFS data
   */
  private async performMapMatching(
    locationPoints: any[], 
    transportSegments: TransportSegment[]
  ): Promise<MapMatchedPoint[]> {
    const matchedPoints: MapMatchedPoint[] = [];

    for (const point of locationPoints) {
      const segment = this.findSegmentForPoint(point, transportSegments);
      
      if (segment && segment.transportMode === 'bus' || segment?.transportMode === 'train' || segment?.transportMode === 'tram') {
        try {
          // Query GTFS for nearby vehicles
          const nearbyVehicles = await mlService.queryNearbyVehicles(
            point.latitude,
            point.longitude,
            50 // 50m radius
          );

          if (nearbyVehicles && nearbyVehicles.length > 0) {
            const bestMatch = nearbyVehicles[0];
            matchedPoints.push({
              timestamp: new Date(point.timestamp),
              originalLat: point.latitude,
              originalLng: point.longitude,
              matchedLat: bestMatch.latitude,
              matchedLng: bestMatch.longitude,
              transportMode: segment.transportMode,
              confidence: segment.confidence,
              gtfsTripId: bestMatch.trip_id,
              gtfsRouteId: bestMatch.route_id,
              gtfsStopId: bestMatch.stop_id
            });

            // Update segment with GTFS info
            segment.gtfsTripId = bestMatch.trip_id;
            segment.gtfsRouteId = bestMatch.route_id;
            segment.gtfsStopId = bestMatch.stop_id;
          } else {
            // No GTFS match, use original coordinates
            matchedPoints.push({
              timestamp: new Date(point.timestamp),
              originalLat: point.latitude,
              originalLng: point.longitude,
              matchedLat: point.latitude,
              matchedLng: point.longitude,
              transportMode: segment.transportMode,
              confidence: segment.confidence
            });
          }
        } catch (error) {
          console.error('Error in map matching:', error);
          // Fallback to original coordinates
          matchedPoints.push({
            timestamp: new Date(point.timestamp),
            originalLat: point.latitude,
            originalLng: point.longitude,
            matchedLat: point.latitude,
            matchedLng: point.longitude,
            transportMode: segment.transportMode,
            confidence: segment.confidence
          });
        }
      } else {
        // Non-public transport, use original coordinates
        matchedPoints.push({
          timestamp: new Date(point.timestamp),
          originalLat: point.latitude,
          originalLng: point.longitude,
          matchedLat: point.latitude,
          matchedLng: point.longitude,
          transportMode: segment?.transportMode || 'unknown',
          confidence: segment?.confidence || 0.5
        });
      }
    }

    return matchedPoints;
  }

  /**
   * Calculate accessibility metrics for the journey
   */
  private async calculateAccessibilityMetrics(
    journey: any,
    transportSegments: TransportSegment[],
    mapMatchedRoute: MapMatchedPoint[]
  ): Promise<number> {
    let totalScore = 0;
    let totalWeight = 0;

    // Calculate mode-specific accessibility scores
    for (const segment of transportSegments) {
      const modeScore = this.getModeAccessibilityScore(segment.transportMode);
      const weight = segment.duration; // Weight by duration
      
      totalScore += modeScore * weight;
      totalWeight += weight;
    }

    // Apply GTFS accessibility bonuses
    const gtfsBonus = this.calculateGTFSAccessibilityBonus(mapMatchedRoute);
    
    // Apply route efficiency bonus
    const efficiencyBonus = this.calculateRouteEfficiencyBonus(transportSegments);

    const baseScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const finalScore = Math.min(100, baseScore + gtfsBonus + efficiencyBonus);

    return Math.round(finalScore);
  }

  /**
   * Detect anomalies in the journey
   */
  private async detectAnomalies(
    journey: any,
    transportSegments: TransportSegment[],
    mapMatchedRoute: MapMatchedPoint[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for accessibility issues
    const lowAccessibilitySegments = transportSegments.filter(s => s.accessibilityScore < 30);
    for (const segment of lowAccessibilitySegments) {
      anomalies.push({
        type: 'accessibility_issue',
        severity: 'medium',
        description: `Low accessibility score (${segment.accessibilityScore}) for ${segment.transportMode} segment`,
        timestamp: segment.startTime,
        metadata: {
          segmentId: segment.id,
          transportMode: segment.transportMode,
          accessibilityScore: segment.accessibilityScore
        }
      });
    }

    // Check for route deviations
    const deviations = this.detectRouteDeviations(mapMatchedRoute);
    anomalies.push(...deviations);

    // Check for unexpected delays
    const delays = this.detectUnexpectedDelays(transportSegments);
    anomalies.push(...delays);

    return anomalies;
  }

  /**
   * Generate insights from journey analysis
   */
  private async generateInsights(
    journey: any,
    transportSegments: TransportSegment[],
    anomalies: Anomaly[]
  ): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Analyze transport mode preferences
    const modeAnalysis = this.analyzeTransportModePreferences(transportSegments);
    if (modeAnalysis) {
      insights.push(modeAnalysis);
    }

    // Analyze accessibility trends
    const accessibilityTrend = this.analyzeAccessibilityTrends(transportSegments);
    if (accessibilityTrend) {
      insights.push(accessibilityTrend);
    }

    // Generate route optimization insights
    const routeOptimization = this.generateRouteOptimizationInsights(transportSegments, anomalies);
    if (routeOptimization) {
      insights.push(routeOptimization);
    }

    return insights;
  }

  // Helper methods
  private calculateTotalDistance(locationPoints: any[]): number {
    let totalDistance = 0;
    for (let i = 1; i < locationPoints.length; i++) {
      const prev = locationPoints[i - 1];
      const curr = locationPoints[i];
      totalDistance += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    return totalDistance;
  }

  private calculateTotalDuration(startTime: Date, endTime: Date | null): number {
    if (!endTime) return 0;
    return (endTime.getTime() - startTime.getTime()) / 1000;
  }

  private calculateSegmentDistance(points: any[]): number {
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      distance += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    return distance;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateSegmentAccessibilityScore(mode: string, confidence: number): number {
    const baseScores: Record<string, number> = {
      'walking': 80,
      'cycling': 70,
      'bus': 60,
      'train': 65,
      'tram': 55,
      'car': 50,
      'stationary': 100
    };

    const baseScore = baseScores[mode] || 50;
    return Math.round(baseScore * confidence);
  }

  private mergeSimilarSegments(segments: TransportSegment[]): TransportSegment[] {
    if (segments.length <= 1) return segments;

    const merged: TransportSegment[] = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      
      // Merge if same mode and adjacent
      if (current.transportMode === next.transportMode && 
          Math.abs(next.startTime.getTime() - current.endTime.getTime()) < 30000) { // 30s gap
        current = {
          ...current,
          endTime: next.endTime,
          distance: current.distance + next.distance,
          duration: current.duration + next.duration,
          confidence: Math.min(current.confidence, next.confidence)
        };
      } else {
        merged.push(current);
        current = next;
      }
    }
    
    merged.push(current);
    return merged;
  }

  private findSegmentForPoint(point: any, segments: TransportSegment[]): TransportSegment | undefined {
    const pointTime = new Date(point.timestamp).getTime();
    return segments.find(segment => 
      pointTime >= segment.startTime.getTime() && pointTime <= segment.endTime.getTime()
    );
  }

  private getModeAccessibilityScore(mode: string): number {
    const scores: Record<string, number> = {
      'walking': 85,
      'cycling': 75,
      'bus': 65,
      'train': 70,
      'tram': 60,
      'car': 55,
      'stationary': 100
    };
    return scores[mode] || 50;
  }

  private calculateGTFSAccessibilityBonus(mapMatchedRoute: MapMatchedPoint[]): number {
    const gtfsMatches = mapMatchedRoute.filter(point => point.gtfsTripId);
    return gtfsMatches.length > 0 ? 5 : 0; // 5 point bonus for GTFS matches
  }

  private calculateRouteEfficiencyBonus(segments: TransportSegment[]): number {
    const totalDistance = segments.reduce((sum, s) => sum + s.distance, 0);
    const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
    
    if (totalDuration === 0) return 0;
    
    const efficiency = totalDistance / totalDuration; // km/h
    return efficiency > 20 ? 3 : 0; // Bonus for efficient routes
  }

  private detectRouteDeviations(mapMatchedRoute: MapMatchedPoint[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    for (let i = 1; i < mapMatchedRoute.length; i++) {
      const prev = mapMatchedRoute[i - 1];
      const curr = mapMatchedRoute[i];
      
      const distance = this.calculateDistance(
        prev.matchedLat, prev.matchedLng,
        curr.matchedLat, curr.matchedLng
      );
      
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      const speed = distance / (timeDiff / 3600); // km/h
      
      if (speed > 120) { // Unrealistic speed
        anomalies.push({
          type: 'sensor_error',
          severity: 'medium',
          description: `Unrealistic speed detected: ${speed.toFixed(1)} km/h`,
          timestamp: curr.timestamp,
          location: { lat: curr.matchedLat, lng: curr.matchedLng },
          metadata: { speed, distance, timeDiff }
        });
      }
    }
    
    return anomalies;
  }

  private detectUnexpectedDelays(segments: TransportSegment[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    for (const segment of segments) {
      if (segment.transportMode === 'bus' || segment.transportMode === 'train' || segment.transportMode === 'tram') {
        const avgSpeed = segment.distance / (segment.duration / 3600); // km/h
        
        if (avgSpeed < 5) { // Very slow public transport
          anomalies.push({
            type: 'unexpected_delay',
            severity: 'low',
            description: `Slow ${segment.transportMode} segment: ${avgSpeed.toFixed(1)} km/h average speed`,
            timestamp: segment.startTime,
            metadata: { transportMode: segment.transportMode, avgSpeed, duration: segment.duration }
          });
        }
      }
    }
    
    return anomalies;
  }

  private analyzeTransportModePreferences(segments: TransportSegment[]): Insight | null {
    const modeCounts: Record<string, number> = {};
    let totalDuration = 0;
    
    for (const segment of segments) {
      modeCounts[segment.transportMode] = (modeCounts[segment.transportMode] || 0) + segment.duration;
      totalDuration += segment.duration;
    }
    
    if (totalDuration === 0) return null;
    
    const preferredMode = Object.entries(modeCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (preferredMode) {
      const percentage = (preferredMode[1] / totalDuration) * 100;
      
      return {
        type: 'transport_preference',
        title: `Preferred Transport Mode: ${preferredMode[0]}`,
        description: `You spent ${percentage.toFixed(1)}% of your journey using ${preferredMode[0]}`,
        confidence: 0.9,
        recommendations: [
          `Consider optimizing routes to maximize ${preferredMode[0]} usage`,
          `Look for more ${preferredMode[0]} options in your area`
        ],
        metadata: { modeCounts, totalDuration }
      };
    }
    
    return null;
  }

  private analyzeAccessibilityTrends(segments: TransportSegment[]): Insight | null {
    const accessibilityScores = segments.map(s => s.accessibilityScore);
    const avgScore = accessibilityScores.reduce((sum, score) => sum + score, 0) / accessibilityScores.length;
    
    if (avgScore < 50) {
      return {
        type: 'accessibility_trend',
        title: 'Low Overall Accessibility',
        description: `Your journey had an average accessibility score of ${avgScore.toFixed(1)}/100`,
        confidence: 0.8,
        recommendations: [
          'Consider alternative routes with better accessibility',
          'Look for wheelchair-accessible transport options',
          'Plan journeys during off-peak hours for better accessibility'
        ],
        metadata: { avgScore, segmentCount: segments.length }
      };
    }
    
    return null;
  }

  private generateRouteOptimizationInsights(
    segments: TransportSegment[], 
    anomalies: Anomaly[]
  ): Insight | null {
    const delayAnomalies = anomalies.filter(a => a.type === 'unexpected_delay');
    
    if (delayAnomalies.length > 0) {
      return {
        type: 'route_optimization',
        title: 'Route Optimization Opportunities',
        description: `Found ${delayAnomalies.length} delays that could be optimized`,
        confidence: 0.7,
        recommendations: [
          'Consider alternative routes to avoid common delays',
          'Plan journeys with buffer time for unexpected delays',
          'Use real-time transport apps for live updates'
        ],
        metadata: { delayCount: delayAnomalies.length }
      };
    }
    
    return null;
  }

  private async saveAnalysisResults(journeyId: string, results: any) {
    const db = await database.getConnection();
    
    // Save transport segments
    for (const segment of results.transportSegments) {
      db.prepare(`
        INSERT OR REPLACE INTO transport_segments 
        (id, journey_id, start_time, end_time, transport_mode, confidence, 
         gtfs_trip_id, accessibility_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        segment.id,
        journeyId,
        segment.startTime.toISOString(),
        segment.endTime.toISOString(),
        segment.transportMode,
        segment.confidence,
        segment.gtfsTripId,
        segment.accessibilityScore
      );
    }
    
    // Save analysis metadata
    db.prepare(`
      UPDATE journeys 
      SET analysis_data = ? 
      WHERE id = ?
    `).run(JSON.stringify({
      accessibilityScore: results.accessibilityScore,
      anomalies: results.anomalies,
      insights: results.insights,
      analyzedAt: new Date().toISOString()
    }), journeyId);
  }
}

export const journeyAnalysisService = JourneyAnalysisService.getInstance(); 