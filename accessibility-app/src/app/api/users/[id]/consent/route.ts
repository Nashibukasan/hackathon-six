import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ApiResponse } from '@/types';

// PUT /api/users/[id]/consent - Update user consent settings and accessibility profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const userId = decodeURIComponent(params.id);
    
    // Validate required fields
    if (!body.consent_settings || !body.accessibility_profile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing required fields: consent_settings, accessibility_profile'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const db = getDatabase();
    
    // First try to find user by email
    let user = await db.getUserByEmail(userId);
    
    // If not found by email, try by ID
    if (!user) {
      user = await db.getUserById(userId);
    }
    
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Update user consent settings and accessibility profile
    db.updateUserConsent(user.id, body.consent_settings);
    db.updateUserAccessibilityProfile(user.id, body.accessibility_profile);
    
    // Get updated user
    const updatedUser = await db.getUserById(user.id);
    
    const response: ApiResponse<any> = {
      success: true,
      data: updatedUser
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating user consent:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update user consent'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 