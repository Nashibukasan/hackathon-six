import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'userId parameter is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const db = getDatabase();
    
    // Get user's journeys
    const journeys = await db.getJourneysByUserId(userId);
    
    // Calculate basic stats
    const completedJourneys = journeys.filter(j => j.status === 'completed');
    const totalJourneys = completedJourneys.length;
    
    // For now, return basic data - in a full implementation, this would include
    // journey analysis, location points, transport segments, etc.
    const dashboardData = {
      stats: {
        totalJourneys,
        totalDistance: 0, // Would calculate from location points
        totalDuration: 0, // Would calculate from journey times
        avgAccessibilityScore: 0, // Would calculate from analysis
        anomalyCount: 0,
        insightCount: 0
      },
      journeys: completedJourneys.map(journey => ({
        id: journey.id,
        startTime: journey.started_at,
        endTime: journey.ended_at,
        status: journey.status,
        metadata: journey.metadata
      }))
    };

    const response: ApiResponse<any> = {
      success: true,
      data: dashboardData
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch dashboard data'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 