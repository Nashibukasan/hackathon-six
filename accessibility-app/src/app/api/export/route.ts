import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ApiResponse } from '@/types';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  includePersonalData: boolean;
  anonymizeData: boolean;
  includeAnalysis: boolean;
  includeAnomalies: boolean;
  includeInsights: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, exportOptions }: { userId: string; exportOptions: ExportOptions } = body;

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'userId is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const db = getDatabase();
    
    // Get user's journeys
    const journeys = await db.getJourneysByUserId(userId);
    
    // Filter by date range if specified
    const filteredJourneys = journeys.filter(journey => {
      const journeyDate = new Date(journey.started_at);
      const startDate = new Date(exportOptions.dateRange.start);
      const endDate = new Date(exportOptions.dateRange.end);
      return journeyDate >= startDate && journeyDate <= endDate;
    });

    // Prepare export data
    const exportData = {
      userId: exportOptions.anonymizeData ? 'anonymous' : userId,
      exportDate: new Date().toISOString(),
      dateRange: exportOptions.dateRange,
      journeys: filteredJourneys.map(journey => ({
        id: exportOptions.anonymizeData ? `journey_${Math.random().toString(36).substr(2, 9)}` : journey.id,
        started_at: journey.started_at,
        ended_at: journey.ended_at,
        status: journey.status,
        metadata: exportOptions.includePersonalData ? journey.metadata : {}
      })),
      stats: {
        totalJourneys: filteredJourneys.length,
        completedJourneys: filteredJourneys.filter(j => j.status === 'completed').length,
        activeJourneys: filteredJourneys.filter(j => j.status === 'active').length
      }
    };

    // Generate export based on format
    let data: string;
    let mimeType: string;
    let filename: string;

    switch (exportOptions.format) {
      case 'json':
        data = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        filename = `accessibility_data_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'csv':
        // Convert to CSV format
        const csvHeaders = ['Journey ID', 'Start Date', 'End Date', 'Status'];
        const csvRows = filteredJourneys.map(journey => [
          journey.id,
          journey.started_at,
          journey.ended_at || '',
          journey.status
        ]);
        
        data = [csvHeaders, ...csvRows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        mimeType = 'text/csv';
        filename = `accessibility_data_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      case 'pdf':
        // For now, return JSON as PDF is complex to generate
        data = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        filename = `accessibility_data_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      default:
        throw new Error('Unsupported export format');
    }

    const response: ApiResponse<any> = {
      success: true,
      data: {
        data,
        mimeType,
        filename,
        recordCount: filteredJourneys.length
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error exporting data:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to export data'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 