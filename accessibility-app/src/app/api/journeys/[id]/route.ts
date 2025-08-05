import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { Journey, ApiResponse } from '@/types';

// GET /api/journeys/[id] - Get journey details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDatabase();
    const journey = db.getJourneyById(id);
    
    if (!journey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Journey not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const response: ApiResponse<Journey> = {
      success: true,
      data: journey
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching journey:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch journey'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/journeys/[id] - Update journey (e.g., end journey)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDatabase();
    
    // Check if journey exists
    const existingJourney = db.getJourneyById(id);
    if (!existingJourney) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Journey not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Update journey status
    if (body.status) {
      const ended_at = body.status === 'completed' ? new Date().toISOString() : undefined;
      db.updateJourneyStatus(id, body.status, ended_at);
      
      // Get updated journey
      const updatedJourney = db.getJourneyById(id);
      
      const response: ApiResponse<Journey> = {
        success: true,
        data: updatedJourney!
      };
      
      return NextResponse.json(response);
    }
    
    const response: ApiResponse<Journey> = {
      success: true,
      data: existingJourney
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating journey:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update journey'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 