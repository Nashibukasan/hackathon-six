import { getDatabase } from './database';

// Simple ID generator
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function initializeDatabase() {
  const db = getDatabase();
  
  console.log('Initializing database...');
  
  // Check if database is empty
  const stats = db.getStats();
  
  if (stats.users === 0) {
    console.log('Adding sample data...');
    
    // Add sample user
    const sampleUser = {
      id: generateId(),
      email: 'test@example.com',
      accessibility_profile: {
        level1: 'wheelchair' as const,
        level2: {
          mobility_aid_dimensions: {
            width: 650,
            length: 1200
          },
          ramp_gradient_tolerance: 8,
          assistance_needs: false
        }
      },
      consent_settings: {
        location_tracking: true,
        motion_sensors: true,
        data_sharing: true,
        analytics: true,
        notifications: true
      }
    };
    
    db.createUser(sampleUser);
    console.log('Sample user created:', sampleUser.email);
  }
  
  console.log('Database initialization complete');
  console.log('Database stats:', db.getStats());
}

// Run initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
} 