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

// Import sqlite3 - this is required for the application to work
let sqlite3: any;
try {
  sqlite3 = require('sqlite3').verbose();
  console.log('sqlite3 available and working');
} catch (error: any) {
  console.error('sqlite3 is required but not available. Please install it with: npm install sqlite3');
  throw new Error('sqlite3 is required but not available. Please install it with: npm install sqlite3');
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
  private db: any = null;

  constructor() {
    try {
      console.log('Initializing SQLite database at:', DB_PATH);
      this.db = new sqlite3.Database(DB_PATH);
      console.log('SQLite database initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize SQLite database:', error.message);
      throw new Error(`Failed to initialize SQLite database: ${error.message}`);
    }
  }

  async ensureInitialized(): Promise<void> {
    console.log('Ensuring database is initialized...');
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      await this.init();
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  private async init(): Promise<void> {
    console.log('Starting database schema initialization...');
    if (this.db) {
      // Create tables asynchronously
      return new Promise((resolve, reject) => {
        console.log('Executing database schema...');
        this.db.exec(SCHEMA, (err: any) => {
          if (err) {
            console.error('Error creating database schema:', err);
            reject(err);
          } else {
            console.log('Database schema created successfully');
            resolve();
          }
        });
      });
    } else {
      throw new Error('Database connection not available');
    }
  }

  // User operations
  async createUser(user: Omit<User, 'created_at'>): Promise<User> {
    // Ensure database is initialized
    await this.ensureInitialized();

    const newUser: User = {
      ...user,
      created_at: new Date().toISOString(),
    };

    console.log('Creating user:', newUser);

    // Use SQLite with Promise
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, email, created_at, accessibility_profile, consent_settings)
         VALUES (?, ?, ?, ?, ?)`,
        [
          newUser.id,
          newUser.email,
          newUser.created_at,
          JSON.stringify(newUser.accessibility_profile),
          JSON.stringify(newUser.consent_settings)
        ],
        (err: any) => {
          if (err) {
            console.error('Error creating user:', err);
            reject(new Error(`Database error: ${err.message}`));
          } else {
            console.log('User created successfully');
            resolve(newUser);
          }
        }
      );
    });
  }

  async getUserById(id: string): Promise<User | null> {
    // Use SQLite
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err: any, row: any) => {
          if (err) {
            console.error('Error getting user by ID:', err);
            resolve(null);
          } else if (row) {
            resolve({
              id: row.id,
              email: row.email,
              created_at: row.created_at,
              accessibility_profile: JSON.parse(row.accessibility_profile || '{}'),
              consent_settings: JSON.parse(row.consent_settings || '{}')
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    console.log('Getting user by email:', email);
    // Ensure database is initialized
    await this.ensureInitialized();

    // Use SQLite
    return new Promise((resolve) => {
      console.log('Executing getUserByEmail query...');
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err: any, row: any) => {
          if (err) {
            console.error('Error getting user by email:', err);
            resolve(null);
          } else if (row) {
            console.log('User found:', row);
            resolve({
              id: row.id,
              email: row.email,
              created_at: row.created_at,
              accessibility_profile: JSON.parse(row.accessibility_profile || '{}'),
              consent_settings: JSON.parse(row.consent_settings || '{}')
            });
          } else {
            console.log('No user found with email:', email);
            resolve(null);
          }
        }
      );
    });
  }

  updateUserConsent(userId: string, consentSettings: any): void {
    // Update in SQLite
    this.db.run(
      'UPDATE users SET consent_settings = ? WHERE id = ?',
      [JSON.stringify(consentSettings), userId],
      (err: any) => {
        if (err) {
          console.error('Error updating user consent:', err);
        }
      }
    );
  }

  updateUserAccessibilityProfile(userId: string, accessibilityProfile: any): void {
    // Update in SQLite
    this.db.run(
      'UPDATE users SET accessibility_profile = ? WHERE id = ?',
      [JSON.stringify(accessibilityProfile), userId],
      (err: any) => {
        if (err) {
          console.error('Error updating user accessibility profile:', err);
        }
      }
    );
  }

  // Journey operations
  createJourney(journey: Omit<Journey, 'ended_at'>): Journey {
    // Use SQLite
    this.db.run(
      `INSERT INTO journeys (id, user_id, started_at, status, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        journey.id,
        journey.user_id,
        journey.started_at,
        journey.status,
        JSON.stringify(journey.metadata)
      ],
      (err: any) => {
        if (err) {
          console.error('Error creating journey:', err);
        }
      }
    );
    return journey;
  }

  updateJourneyStatus(id: string, status: Journey['status'], ended_at?: string): void {
    // Use SQLite
    const updateQuery = ended_at 
      ? 'UPDATE journeys SET status = ?, ended_at = ? WHERE id = ?'
      : 'UPDATE journeys SET status = ? WHERE id = ?';
    const params = ended_at ? [status, ended_at, id] : [status, id];
    
    this.db.run(updateQuery, params, (err: any) => {
      if (err) {
        console.error('Error updating journey status:', err);
      }
    });
  }

  async getJourneyById(id: string): Promise<Journey | null> {
    // Use SQLite
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM journeys WHERE id = ?',
        [id],
        (err: any, row: any) => {
          if (err) {
            console.error('Error getting journey by ID:', err);
            resolve(null);
          } else if (row) {
            resolve({
              id: row.id,
              user_id: row.user_id,
              started_at: row.started_at,
              ended_at: row.ended_at,
              status: row.status,
              metadata: JSON.parse(row.metadata || '{}')
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getJourneysByUserId(userId: string): Promise<Journey[]> {
    // Use SQLite
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM journeys WHERE user_id = ? ORDER BY started_at DESC',
        [userId],
        (err: any, rows: any[]) => {
          if (err) {
            console.error('Error getting journeys by user ID:', err);
            resolve([]);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              user_id: row.user_id,
              started_at: row.started_at,
              ended_at: row.ended_at,
              status: row.status,
              metadata: JSON.parse(row.metadata || '{}')
            })));
          }
        }
      );
    });
  }

  // Location point operations
  addLocationPoint(point: LocationPoint): void {
    // Use SQLite
    this.db.run(
      `INSERT INTO location_points (id, journey_id, timestamp, latitude, longitude, accuracy, speed, heading, sensor_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        point.id,
        point.journey_id,
        point.timestamp,
        point.latitude,
        point.longitude,
        point.accuracy,
        point.speed,
        point.heading,
        JSON.stringify(point.sensor_data)
      ],
      (err: any) => {
        if (err) {
          console.error('Error adding location point:', err);
        }
      }
    );
  }

  async getLocationPointsByJourneyId(journeyId: string): Promise<LocationPoint[]> {
    // Use SQLite
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM location_points WHERE journey_id = ? ORDER BY timestamp ASC',
        [journeyId],
        (err: any, rows: any[]) => {
          if (err) {
            console.error('Error getting location points by journey ID:', err);
            resolve([]);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              journey_id: row.journey_id,
              timestamp: row.timestamp,
              latitude: row.latitude,
              longitude: row.longitude,
              accuracy: row.accuracy,
              speed: row.speed,
              heading: row.heading,
              sensor_data: JSON.parse(row.sensor_data || '{}')
            })));
          }
        }
      );
    });
  }

  // Transport segment operations
  addTransportSegment(segment: TransportSegment): void {
    // Use SQLite
    this.db.run(
      `INSERT INTO transport_segments (id, journey_id, start_time, end_time, transport_mode, confidence, gtfs_trip_id, accessibility_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        segment.id,
        segment.journey_id,
        segment.start_time,
        segment.end_time,
        segment.transport_mode,
        segment.confidence,
        segment.gtfs_trip_id,
        segment.accessibility_score
      ],
      (err: any) => {
        if (err) {
          console.error('Error adding transport segment:', err);
        }
      }
    );
  }

  async getTransportSegmentsByJourneyId(journeyId: string): Promise<TransportSegment[]> {
    // Use SQLite
    return new Promise((resolve) => {
      this.db.all(
        'SELECT * FROM transport_segments WHERE journey_id = ? ORDER BY start_time ASC',
        [journeyId],
        (err: any, rows: any[]) => {
          if (err) {
            console.error('Error getting transport segments by journey ID:', err);
            resolve([]);
          } else {
            resolve(rows.map(row => ({
              id: row.id,
              journey_id: row.journey_id,
              start_time: row.start_time,
              end_time: row.end_time,
              transport_mode: row.transport_mode,
              confidence: row.confidence,
              gtfs_trip_id: row.gtfs_trip_id,
              accessibility_score: row.accessibility_score
            })));
          }
        }
      );
    });
  }

  // Utility methods
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // Backup database
  backup(backupPath: string): void {
    // SQLite backup implementation
    if (this.db) {
      const backupDb = new sqlite3.Database(backupPath);
      this.db.backup(backupDb, (err: any) => {
        if (err) {
          console.error('Error backing up database:', err);
        } else {
          console.log('Database backed up successfully');
        }
        backupDb.close();
      });
    }
  }

  // Get database statistics
  async getStats() {
    // Use SQLite stats
    return new Promise((resolve) => {
      const stats = {
        users: 0,
        journeys: 0,
        locationPoints: 0,
        transportSegments: 0
      };
      
      let completedQueries = 0;
      const totalQueries = 4;
      
      const checkComplete = () => {
        completedQueries++;
        if (completedQueries === totalQueries) {
          resolve(stats);
        }
      };
      
      // Count users
      this.db.get('SELECT COUNT(*) as count FROM users', (err: any, row: any) => {
        if (!err && row) stats.users = row.count;
        checkComplete();
      });
      
      // Count journeys
      this.db.get('SELECT COUNT(*) as count FROM journeys', (err: any, row: any) => {
        if (!err && row) stats.journeys = row.count;
        checkComplete();
      });
      
      // Count location points
      this.db.get('SELECT COUNT(*) as count FROM location_points', (err: any, row: any) => {
        if (!err && row) stats.locationPoints = row.count;
        checkComplete();
      });
      
      // Count transport segments
      this.db.get('SELECT COUNT(*) as count FROM transport_segments', (err: any, row: any) => {
        if (!err && row) stats.transportSegments = row.count;
        checkComplete();
      });
    });
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