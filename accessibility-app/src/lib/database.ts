import Database from 'better-sqlite3';
import path from 'path';
import { User, Journey, LocationPoint, TransportSegment } from '@/types';

// Database file path
const DB_PATH = path.join(process.cwd(), 'data', 'accessibility.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database schema
const SCHEMA = `
-- Users table with accessibility profiles
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessibility_profile TEXT, -- JSON string
    consent_settings TEXT -- JSON string
);

-- Journey sessions
CREATE TABLE IF NOT EXISTS journeys (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    status TEXT DEFAULT 'active',
    metadata TEXT -- JSON string
);

-- Location points (spatial data as separate columns)
CREATE TABLE IF NOT EXISTS location_points (
    id TEXT PRIMARY KEY,
    journey_id TEXT REFERENCES journeys(id),
    timestamp DATETIME NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    speed REAL,
    heading REAL,
    sensor_data TEXT -- JSON string
);

-- Transport segments
CREATE TABLE IF NOT EXISTS transport_segments (
    id TEXT PRIMARY KEY,
    journey_id TEXT REFERENCES journeys(id),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    transport_mode TEXT,
    confidence REAL,
    gtfs_trip_id TEXT,
    accessibility_score REAL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_points_journey_id ON location_points(journey_id);
CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON location_points(timestamp);
CREATE INDEX IF NOT EXISTS idx_transport_segments_journey_id ON transport_segments(journey_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
CREATE INDEX IF NOT EXISTS idx_location_points_coords ON location_points(latitude, longitude);
`;

// Database class
class AccessibilityDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init() {
    // Create tables
    this.db.exec(SCHEMA);
  }

  // User operations
  createUser(user: Omit<User, 'created_at'>): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, accessibility_profile, consent_settings)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      user.id,
      user.email,
      JSON.stringify(user.accessibility_profile),
      JSON.stringify(user.consent_settings)
    );

    return {
      ...user,
      created_at: new Date().toISOString()
    };
  }

  getUserById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      accessibility_profile: JSON.parse(row.accessibility_profile),
      consent_settings: JSON.parse(row.consent_settings)
    };
  }

  getUserByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      accessibility_profile: JSON.parse(row.accessibility_profile),
      consent_settings: JSON.parse(row.consent_settings)
    };
  }

  // Journey operations
  createJourney(journey: Omit<Journey, 'ended_at'>): Journey {
    const stmt = this.db.prepare(`
      INSERT INTO journeys (id, user_id, started_at, status, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      journey.id,
      journey.user_id,
      journey.started_at,
      journey.status,
      JSON.stringify(journey.metadata)
    );

    return journey;
  }

  updateJourneyStatus(id: string, status: Journey['status'], ended_at?: string): void {
    const stmt = this.db.prepare(`
      UPDATE journeys 
      SET status = ?, ended_at = ?
      WHERE id = ?
    `);
    
    stmt.run(status, ended_at || null, id);
  }

  getJourneyById(id: string): Journey | null {
    const stmt = this.db.prepare('SELECT * FROM journeys WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      status: row.status,
      metadata: JSON.parse(row.metadata)
    };
  }

  getJourneysByUserId(userId: string): Journey[] {
    const stmt = this.db.prepare('SELECT * FROM journeys WHERE user_id = ? ORDER BY started_at DESC');
    const rows = stmt.all(userId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      status: row.status,
      metadata: JSON.parse(row.metadata)
    }));
  }

  // Location point operations
  addLocationPoint(point: LocationPoint): void {
    const stmt = this.db.prepare(`
      INSERT INTO location_points (id, journey_id, timestamp, latitude, longitude, accuracy, speed, heading, sensor_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      point.id,
      point.journey_id,
      point.timestamp,
      point.latitude,
      point.longitude,
      point.accuracy || null,
      point.speed || null,
      point.heading || null,
      point.sensor_data ? JSON.stringify(point.sensor_data) : null
    );
  }

  getLocationPointsByJourneyId(journeyId: string): LocationPoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM location_points 
      WHERE journey_id = ? 
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(journeyId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      journey_id: row.journey_id,
      timestamp: row.timestamp,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      speed: row.speed,
      heading: row.heading,
      sensor_data: row.sensor_data ? JSON.parse(row.sensor_data) : undefined
    }));
  }

  // Transport segment operations
  addTransportSegment(segment: TransportSegment): void {
    const stmt = this.db.prepare(`
      INSERT INTO transport_segments (id, journey_id, start_time, end_time, transport_mode, confidence, gtfs_trip_id, accessibility_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      segment.id,
      segment.journey_id,
      segment.start_time,
      segment.end_time,
      segment.transport_mode,
      segment.confidence,
      segment.gtfs_trip_id || null,
      segment.accessibility_score || null
    );
  }

  getTransportSegmentsByJourneyId(journeyId: string): TransportSegment[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transport_segments 
      WHERE journey_id = ? 
      ORDER BY start_time ASC
    `);
    const rows = stmt.all(journeyId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      journey_id: row.journey_id,
      start_time: row.start_time,
      end_time: row.end_time,
      transport_mode: row.transport_mode,
      confidence: row.confidence,
      gtfs_trip_id: row.gtfs_trip_id,
      accessibility_score: row.accessibility_score
    }));
  }

  // Utility methods
  close(): void {
    this.db.close();
  }

  // Backup database
  backup(backupPath: string): void {
    const backup = new Database(backupPath);
    this.db.backup(backupPath);
    backup.close();
  }

  // Get database statistics
  getStats() {
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const journeyCount = this.db.prepare('SELECT COUNT(*) as count FROM journeys').get() as { count: number };
    const locationCount = this.db.prepare('SELECT COUNT(*) as count FROM location_points').get() as { count: number };
    const segmentCount = this.db.prepare('SELECT COUNT(*) as count FROM transport_segments').get() as { count: number };

    return {
      users: userCount.count,
      journeys: journeyCount.count,
      locationPoints: locationCount.count,
      transportSegments: segmentCount.count
    };
  }
}

// Export singleton instance
let dbInstance: AccessibilityDatabase | null = null;

export function getDatabase(): AccessibilityDatabase {
  if (!dbInstance) {
    dbInstance = new AccessibilityDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default AccessibilityDatabase; 