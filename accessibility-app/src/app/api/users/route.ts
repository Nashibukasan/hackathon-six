import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { User, ApiResponse } from '@/types';

// GET /api/users - Get all users (for admin purposes)
export async function GET() {
  try {
    const db = getDatabase();
    // For now, return empty array - in production this would be admin-only
    const users: User[] = [];
    
    const response: ApiResponse<User[]> = {
      success: true,
      data: users
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch users'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/users - Starting user creation');
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate required fields
    if (!body.email || !body.accessibility_profile || !body.consent_settings) {
      console.log('Missing required fields:', { email: !!body.email, accessibility_profile: !!body.accessibility_profile, consent_settings: !!body.consent_settings });
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing required fields: email, accessibility_profile, consent_settings'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid email format'
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const db = getDatabase();
    
    // Check if user already exists
    const existingUser = await db.getUserByEmail(body.email);
    if (existingUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User with this email already exists'
      };
      return NextResponse.json(response, { status: 409 });
    }
    
    // Generate user ID
    const userId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Create user
    const newUser = await db.createUser({
      id: userId,
      email: body.email,
      accessibility_profile: body.accessibility_profile,
      consent_settings: body.consent_settings
    });
    
    const response: ApiResponse<User> = {
      success: true,
      data: newUser
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: ApiResponse<null> = {
      success: false,
      error: `Failed to create user: ${errorMessage}`
    };
    return NextResponse.json(response, { status: 500 });
  }
} 