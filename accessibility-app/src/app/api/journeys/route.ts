import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { Journey, ApiResponse, JourneyStartRequest } from '@/types';

// GET /api/journeys - Get all journeys (for admin purposes)
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
    const journeys = db.getJourneysByUserId(userId);
    
    const response: ApiResponse<Journey[]> = {
      success: true,
      data: journeys
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching journeys:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch journeys'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/journeys - Start a new journey
export async function POST(request: NextRequest) {
  try {
    const body: JourneyStartRequest = await request.json();
    
    // Validate required fields
    if (!body.user_id) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'user_id is required'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const db = getDatabase();
    
    // Check if user exists
    const user = db.getUserById(body.user_id);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Generate journey ID
    const journeyId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Create journey
    const newJourney = db.createJourney({
      id: journeyId,
      user_id: body.user_id,
      started_at: new Date().toISOString(),
      status: 'active',
      metadata: body.metadata || {}
    });
    
    const response: ApiResponse<Journey> = {
      success: true,
      data: newJourney
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating journey:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create journey'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 