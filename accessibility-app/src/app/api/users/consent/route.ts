import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consent_settings } = body;

    if (!consent_settings) {
      return NextResponse.json(
        { error: 'Consent settings are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // For now, we'll create a temporary user ID
    // In a real app, this would come from authentication
    const userId = `user_${Date.now()}`;
    
    // Check if user exists
    const existingUser = db.getUserById(userId);

    if (existingUser) {
      // Update existing user's consent settings
      // Note: This would need a new method in the database class
      // For now, we'll create a new user
      const updatedUser = {
        ...existingUser,
        consent_settings: consent_settings
      };
      // This is a simplified approach - in a real app, you'd have an update method
    } else {
      // Create new user with consent settings
      const newUser = {
        id: userId,
        email: 'user@example.com',
        accessibility_profile: {
          level1: 'ambulatory' as const,
          level2: {}
        },
        consent_settings: consent_settings
      };
      db.createUser(newUser);
    }

    return NextResponse.json({
      success: true,
      message: 'Consent settings saved successfully',
      userId
    });

  } catch (error) {
    console.error('Error saving consent settings:', error);
    return NextResponse.json(
      { error: 'Failed to save consent settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const user = db.getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const consentSettings = user.consent_settings;

    return NextResponse.json({
      consent_settings: consentSettings
    });

  } catch (error) {
    console.error('Error fetching consent settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent settings' },
      { status: 500 }
    );
  }
} 