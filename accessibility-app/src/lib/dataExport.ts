import { getDatabase } from './database';
import { journeyAnalysisService, JourneyAnalysis } from './journeyAnalysis';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: { start: Date; end: Date };
  includePersonalData: boolean;
  anonymizeData: boolean;
  includeAnalysis: boolean;
  includeAnomalies: boolean;
  includeInsights: boolean;
}

export interface ExportResult {
  data: string | Blob;
  filename: string;
  mimeType: string;
  recordCount: number;
  summary: ExportSummary;
}

export interface ExportSummary {
  totalJourneys: number;
  totalDistance: number;
  totalDuration: number;
  avgAccessibilityScore: number;
  transportModeBreakdown: Record<string, number>;
  anomalyCount: number;
  insightCount: number;
  dateRange: { start: Date; end: Date };
}

export interface AnonymizedData {
  userId: string;
  journeyId: string;
  startTime: Date;
  endTime: Date;
  totalDistance: number;
  totalDuration: number;
  accessibilityScore: number;
  transportModes: string[];
  hasAnomalies: boolean;
  hasInsights: boolean;
  locationHash: string; // Hashed location for privacy
}

class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Export journey data based on specified options
   */
  async exportJourneyData(userId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      const db = getDatabase();
      
      // Get journeys for the user in the specified date range
      const allJourneys = db.getJourneysByUserId(userId);
      const filteredJourneys = allJourneys.filter(journey => 
        journey.status === 'completed' &&
        new Date(journey.started_at) >= options.dateRange.start &&
        new Date(journey.started_at) <= options.dateRange.end
      );

      // Get detailed analysis for each journey
      const journeyAnalyses: JourneyAnalysis[] = [];
      for (const journey of filteredJourneys) {
        try {
          const analysis = await journeyAnalysisService.analyzeJourney(journey.id);
          journeyAnalyses.push(analysis);
        } catch (error) {
          console.error(`Error analyzing journey ${journey.id}:`, error);
        }
      }

      // Generate summary statistics
      const summary = this.generateSummary(journeyAnalyses, options.dateRange);

      // Prepare data based on format and options
      let exportData: any;
      let filename: string;
      let mimeType: string;

      if (options.anonymizeData) {
        exportData = this.anonymizeJourneyData(journeyAnalyses, options);
      } else {
        exportData = this.prepareJourneyData(journeyAnalyses, options);
      }

      switch (options.format) {
        case 'csv':
          const csvData = this.convertToCSV(exportData);
          filename = `accessibility_journeys_${userId}_${options.dateRange.start.toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          return {
            data: csvData,
            filename,
            mimeType,
            recordCount: exportData.length,
            summary
          };

        case 'json':
          const jsonData = JSON.stringify(exportData, null, 2);
          filename = `accessibility_journeys_${userId}_${options.dateRange.start.toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          return {
            data: jsonData,
            filename,
            mimeType,
            recordCount: exportData.length,
            summary
          };

        case 'pdf':
          const pdfData = await this.generatePDFReport(exportData, summary, options);
          filename = `accessibility_report_${userId}_${options.dateRange.start.toISOString().split('T')[0]}.pdf`;
          mimeType = 'application/pdf';
          return {
            data: pdfData,
            filename,
            mimeType,
            recordCount: exportData.length,
            summary
          };

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Error exporting journey data:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics for the exported data
   */
  private generateSummary(journeys: JourneyAnalysis[], dateRange: { start: Date; end: Date }): ExportSummary {
    const totalJourneys = journeys.length;
    const totalDistance = journeys.reduce((sum, j) => sum + j.totalDistance, 0);
    const totalDuration = journeys.reduce((sum, j) => sum + j.totalDuration, 0);
    const avgAccessibilityScore = totalJourneys > 0 
      ? journeys.reduce((sum, j) => sum + j.accessibilityScore, 0) / totalJourneys 
      : 0;

    // Calculate transport mode breakdown
    const transportModeBreakdown: Record<string, number> = {};
    journeys.forEach(journey => {
      journey.transportSegments.forEach(segment => {
        transportModeBreakdown[segment.transportMode] = 
          (transportModeBreakdown[segment.transportMode] || 0) + segment.duration;
      });
    });

    const anomalyCount = journeys.reduce((sum, j) => sum + j.anomalies.length, 0);
    const insightCount = journeys.reduce((sum, j) => sum + j.insights.length, 0);

    return {
      totalJourneys,
      totalDistance,
      totalDuration,
      avgAccessibilityScore: Math.round(avgAccessibilityScore),
      transportModeBreakdown,
      anomalyCount,
      insightCount,
      dateRange
    };
  }

  /**
   * Prepare journey data for export based on options
   */
  private prepareJourneyData(journeys: JourneyAnalysis[], options: ExportOptions): any[] {
    return journeys.map(journey => {
      const baseData = {
        journeyId: journey.journeyId,
        userId: journey.userId,
        startTime: journey.startTime.toISOString(),
        endTime: journey.endTime.toISOString(),
        totalDistance: journey.totalDistance,
        totalDuration: journey.totalDuration,
        accessibilityScore: journey.accessibilityScore,
        transportModes: journey.transportSegments.map(s => s.transportMode),
        transportSegments: options.includeAnalysis ? journey.transportSegments : undefined,
        anomalies: options.includeAnomalies ? journey.anomalies : undefined,
        insights: options.includeInsights ? journey.insights : undefined
      };

      if (!options.includePersonalData) {
        delete baseData.userId;
      }

      return baseData;
    });
  }

  /**
   * Anonymize journey data for privacy compliance
   */
  private anonymizeJourneyData(journeys: JourneyAnalysis[], options: ExportOptions): AnonymizedData[] {
    return journeys.map(journey => {
      // Generate consistent hash for user ID
      const userIdHash = this.hashString(journey.userId);
      const journeyIdHash = this.hashString(journey.journeyId);
      
      // Generate location hash from first and last points
      const locationHash = this.generateLocationHash(journey);

      return {
        userId: userIdHash,
        journeyId: journeyIdHash,
        startTime: journey.startTime,
        endTime: journey.endTime,
        totalDistance: Math.round(journey.totalDistance * 100) / 100, // Round to 2 decimal places
        totalDuration: Math.round(journey.totalDuration),
        accessibilityScore: journey.accessibilityScore,
        transportModes: [...new Set(journey.transportSegments.map(s => s.transportMode))],
        hasAnomalies: journey.anomalies.length > 0,
        hasInsights: journey.insights.length > 0,
        locationHash
      };
    });
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate PDF report (simplified implementation)
   */
  private async generatePDFReport(data: any[], summary: ExportSummary, options: ExportOptions): Promise<Blob> {
    // This is a simplified PDF generation
    // In a real implementation, you would use a library like jsPDF or puppeteer
    
    const reportContent = `
Accessibility Transport Report
Generated: ${new Date().toISOString()}
Date Range: ${summary.dateRange.start.toISOString().split('T')[0]} to ${summary.dateRange.end.toISOString().split('T')[0]}

Summary:
- Total Journeys: ${summary.totalJourneys}
- Total Distance: ${summary.totalDistance.toFixed(2)} km
- Total Duration: ${this.formatDuration(summary.totalDuration)}
- Average Accessibility Score: ${summary.avgAccessibilityScore}/100
- Anomalies Detected: ${summary.anomalyCount}
- Insights Generated: ${summary.insightCount}

Transport Mode Breakdown:
${Object.entries(summary.transportModeBreakdown)
  .map(([mode, duration]) => `- ${mode}: ${this.formatDuration(duration)}`)
  .join('\n')}

Journey Details:
${data.map(journey => `
Journey ${journey.journeyId || journey.journeyIdHash}:
- Date: ${new Date(journey.startTime).toLocaleDateString()}
- Distance: ${journey.totalDistance.toFixed(2)} km
- Duration: ${this.formatDuration(journey.totalDuration)}
- Accessibility Score: ${journey.accessibilityScore}/100
- Transport Modes: ${journey.transportModes?.join(', ') || 'N/A'}
`).join('\n')}
    `;

    // Create a simple text blob as PDF (in real implementation, use proper PDF library)
    return new Blob([reportContent], { type: 'application/pdf' });
  }

  /**
   * Hash a string for anonymization
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate location hash for privacy
   */
  private generateLocationHash(journey: JourneyAnalysis): string {
    if (journey.mapMatchedRoute.length === 0) return 'no-location-data';
    
    const firstPoint = journey.mapMatchedRoute[0];
    const lastPoint = journey.mapMatchedRoute[journey.mapMatchedRoute.length - 1];
    
    // Round coordinates to reduce precision for privacy
    const startLat = Math.round(firstPoint.matchedLat * 100) / 100;
    const startLng = Math.round(firstPoint.matchedLng * 100) / 100;
    const endLat = Math.round(lastPoint.matchedLat * 100) / 100;
    const endLng = Math.round(lastPoint.matchedLng * 100) / 100;
    
    return this.hashString(`${startLat},${startLng}-${endLat},${endLng}`);
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Export accessibility insights report
   */
  async exportInsightsReport(userId: string, dateRange: { start: Date; end: Date }): Promise<ExportResult> {
    try {
      const db = getDatabase();
      const allJourneys = db.getJourneysByUserId(userId);
      const filteredJourneys = allJourneys.filter(journey => 
        journey.status === 'completed' &&
        new Date(journey.started_at) >= dateRange.start &&
        new Date(journey.started_at) <= dateRange.end
      );

      const insights: any[] = [];
      const anomalies: any[] = [];

      for (const journey of filteredJourneys) {
        try {
          const analysis = await journeyAnalysisService.analyzeJourney(journey.id);
          
          analysis.insights.forEach(insight => {
            insights.push({
              journeyId: journey.id,
              date: journey.started_at,
              type: insight.type,
              title: insight.title,
              description: insight.description,
              confidence: insight.confidence,
              recommendations: insight.recommendations.join('; ')
            });
          });

          analysis.anomalies.forEach(anomaly => {
            anomalies.push({
              journeyId: journey.id,
              date: journey.started_at,
              type: anomaly.type,
              severity: anomaly.severity,
              description: anomaly.description,
              timestamp: anomaly.timestamp.toISOString()
            });
          });
        } catch (error) {
          console.error(`Error processing journey ${journey.id}:`, error);
        }
      }

      const reportData = {
        summary: {
          totalJourneys: filteredJourneys.length,
          totalInsights: insights.length,
          totalAnomalies: anomalies.length,
          dateRange
        },
        insights,
        anomalies
      };

      const jsonData = JSON.stringify(reportData, null, 2);
      const filename = `accessibility_insights_${userId}_${dateRange.start.toISOString().split('T')[0]}.json`;
      
      return {
        data: jsonData,
        filename,
        mimeType: 'application/json',
        recordCount: insights.length + anomalies.length,
        summary: {
          totalJourneys: filteredJourneys.length,
          totalDistance: 0,
          totalDuration: 0,
          avgAccessibilityScore: 0,
          transportModeBreakdown: {},
          anomalyCount: anomalies.length,
          insightCount: insights.length,
          dateRange
        }
      };
    } catch (error) {
      console.error('Error exporting insights report:', error);
      throw error;
    }
  }

  /**
   * Export transport mode analysis
   */
  async exportTransportModeAnalysis(userId: string, dateRange: { start: Date; end: Date }): Promise<ExportResult> {
    try {
      const db = getDatabase();
      const allJourneys = db.getJourneysByUserId(userId);
      const filteredJourneys = allJourneys.filter(journey => 
        journey.status === 'completed' &&
        new Date(journey.started_at) >= dateRange.start &&
        new Date(journey.started_at) <= dateRange.end
      );

      const modeAnalysis: Record<string, any> = {};
      let totalDistance = 0;
      let totalDuration = 0;

      for (const journey of filteredJourneys) {
        try {
          const analysis = await journeyAnalysisService.analyzeJourney(journey.id);
          
          analysis.transportSegments.forEach(segment => {
            if (!modeAnalysis[segment.transportMode]) {
              modeAnalysis[segment.transportMode] = {
                mode: segment.transportMode,
                totalDuration: 0,
                totalDistance: 0,
                journeyCount: 0,
                avgAccessibilityScore: 0,
                accessibilityScores: []
              };
            }

            modeAnalysis[segment.transportMode].totalDuration += segment.duration;
            modeAnalysis[segment.transportMode].totalDistance += segment.distance;
            modeAnalysis[segment.transportMode].accessibilityScores.push(segment.accessibilityScore);
          });

          totalDistance += analysis.totalDistance;
          totalDuration += analysis.totalDuration;
        } catch (error) {
          console.error(`Error processing journey ${journey.id}:`, error);
        }
      }

      // Calculate averages
      Object.values(modeAnalysis).forEach(mode => {
        mode.journeyCount = filteredJourneys.length;
        mode.avgAccessibilityScore = mode.accessibilityScores.length > 0 
          ? Math.round(mode.accessibilityScores.reduce((sum, score) => sum + score, 0) / mode.accessibilityScores.length)
          : 0;
        delete mode.accessibilityScores;
      });

      const reportData = {
        summary: {
          totalJourneys: filteredJourneys.length,
          totalDistance,
          totalDuration,
          dateRange
        },
        modeAnalysis: Object.values(modeAnalysis)
      };

      const jsonData = JSON.stringify(reportData, null, 2);
      const filename = `transport_mode_analysis_${userId}_${dateRange.start.toISOString().split('T')[0]}.json`;
      
      return {
        data: jsonData,
        filename,
        mimeType: 'application/json',
        recordCount: Object.keys(modeAnalysis).length,
        summary: {
          totalJourneys: filteredJourneys.length,
          totalDistance,
          totalDuration,
          avgAccessibilityScore: 0,
          transportModeBreakdown: modeAnalysis,
          anomalyCount: 0,
          insightCount: 0,
          dateRange
        }
      };
    } catch (error) {
      console.error('Error exporting transport mode analysis:', error);
      throw error;
    }
  }
}

export const dataExportService = DataExportService.getInstance(); 