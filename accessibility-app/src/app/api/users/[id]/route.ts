import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ApiResponse } from '@/types';

// GET /api/users/[id] - Get user by email or ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = decodeURIComponent(params.id);
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
    
    const response: ApiResponse<any> = {
      success: true,
      data: user
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch user'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDatabase();
    
    // Check if user exists
    const existingUser = await db.getUserById(id);
    if (!existingUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // For now, return success - in a full implementation, we'd update the user
    // This would require adding update methods to the database class
    
    const response: ApiResponse<any> = {
      success: true,
      data: existingUser
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update user'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDatabase();
    
    // Check if user exists
    const existingUser = await db.getUserById(id);
    if (!existingUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found'
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // For now, return success - in a full implementation, we'd delete the user
    // This would require adding delete methods to the database class
    
    const response: ApiResponse<null> = {
      success: true
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting user:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete user'
    };
    return NextResponse.json(response, { status: 500 });
  }
} 