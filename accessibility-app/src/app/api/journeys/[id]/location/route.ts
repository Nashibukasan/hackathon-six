import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { LocationPoint, ApiResponse, LocationUpdateRequest } from '@/types';

// POST /api/journeys/[id]/location - Add location point to journey
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body: LocationUpdateRequest = await request.json();
    
    // Validate required fields
    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'latitude and longitude are required and must be numbers'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate coordinate ranges
    if (body.latitude < -90 || body.latitude > 90) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'latitude must be between -90 and 90'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (body.longitude < -180 || body.longitude > 180) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'longitude must be between -180 and 180'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const db = getDatabase();
    
    // Check if journey exists and is active
    const journey = db.getJourneyById(id);
    if (!journey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Journey not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    if (journey.status !== 'active') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Cannot add location to inactive journey'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Generate location point ID
    const pointId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Create location point
    const locationPoint: LocationPoint = {
      id: pointId,
      journey_id: id,
      timestamp: new Date().toISOString(),
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      speed: body.speed,
      heading: body.heading,
      sensor_data: body.sensor_data
    };
    
    db.addLocationPoint(locationPoint);
    
    const response: ApiResponse<LocationPoint> = {
      success: true,
      data: locationPoint
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error adding location point:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to add location point'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// GET /api/journeys/[id]/location - Get all location points for a journey
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDatabase();
    
    // Check if journey exists
    const journey = db.getJourneyById(id);
    if (!journey) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Journey not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    const locationPoints = db.getLocationPointsByJourneyId(id);
    
    const response: ApiResponse<LocationPoint[]> = {
      success: true,
      data: locationPoints
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching location points:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch location points'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 