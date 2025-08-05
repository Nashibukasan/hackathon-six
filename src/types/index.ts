// User and Profile Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  accessibility_profile: AccessibilityProfile;
  consent_settings: ConsentSettings;
}

export interface AccessibilityProfile {
  level1: PrimaryProfile;
  level2: SpecificNeeds;
}

export type PrimaryProfile = 
  | 'wheelchair'
  | 'ambulatory'
  | 'blind'
  | 'deaf'
  | 'neurodivergent'
  | 'assistance_animal';

export interface SpecificNeeds {
  mobility_aid_dimensions?: {
    width: number;
    length: number;
  };
  ramp_gradient_tolerance?: number;
  assistance_needs?: boolean;
  primary_navigation_aid?: 'audio' | 'tactile' | 'screen_reader';
  screen_reader_usage?: boolean;
  sensory_sensitivities?: string[];
  predictability_needs?: boolean;
}

export interface ConsentSettings {
  location_tracking: boolean;
  motion_sensors: boolean;
  data_sharing: boolean;
  analytics: boolean;
}

// Journey and Location Types
export interface Journey {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'cancelled';
  metadata: Record<string, any>;
}

export interface LocationPoint {
  id: string;
  journey_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  sensor_data?: SensorData;
}

export interface SensorData {
  accelerometer?: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
  battery_level?: number;
}

export interface TransportSegment {
  id: string;
  journey_id: string;
  start_time: string;
  end_time: string;
  transport_mode: TransportMode;
  confidence: number;
  gtfs_trip_id?: string;
  accessibility_score?: number;
}

export type TransportMode = 'walking' | 'bus' | 'train' | 'tram' | 'still';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JourneyStartRequest {
  user_id: string;
  metadata?: Record<string, any>;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  sensor_data?: SensorData;
} 