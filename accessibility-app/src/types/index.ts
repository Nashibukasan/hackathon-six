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
  [key: string]: any; // Allow string indexing for dynamic form fields
}

export interface ConsentSettings {
  location_tracking: boolean;
  motion_sensors: boolean;
  data_sharing: boolean;
  analytics: boolean;
  notifications: boolean;
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
  deviceOrientation?: {
    alpha: number;
    beta: number;
    gamma: number;
  };
  battery_level?: number;
  timestamp?: number;
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

// Location Service Types
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  throttleInterval?: number; // Minimum time between updates in ms
}

export interface LocationStatus {
  isSupported: boolean;
  permissionGranted: boolean;
  isTracking: boolean;
  lastLocation: LocationData | null;
  error: LocationError | null;
  batteryLevel: number | null;
}

// Motion Service Types
export interface MotionOptions {
  throttleInterval?: number; // Minimum time between updates in ms
  enableAccelerometer?: boolean;
  enableGyroscope?: boolean;
  enableDeviceOrientation?: boolean;
  bufferSize?: number;
}

export interface MotionStatus {
  isSupported: boolean;
  permissionGranted: boolean;
  isListening: boolean;
  lastSensorData: SensorData | null;
  error: Error | null;
  batteryLevel: number | null;
}

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