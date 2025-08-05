import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/health - Health check endpoint
export async function GET() {
  try {
    const db = getDatabase();
    const stats = db.getStats();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        stats
      },
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      version: '1.0.0'
    }, { status: 500 });
  }
} 