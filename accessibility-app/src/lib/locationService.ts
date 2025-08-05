import { LocationData, LocationError, LocationOptions, LocationStatus, SensorData } from '@/types';
import { motionService } from './motionService';

export class LocationService {
  private watchId: number | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private status: LocationStatus;
  private options: LocationOptions;
  private onLocationUpdate: ((location: LocationData, sensorData?: SensorData) => void) | null = null;
  private onError: ((error: LocationError) => void) | null = null;
  private onStatusChange: ((status: LocationStatus) => void) | null = null;

  constructor(options: LocationOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      throttleInterval: 5000,
      ...options
    };

    this.status = {
      isSupported: !!navigator.geolocation,
      permissionGranted: false,
      isTracking: false,
      lastLocation: null,
      error: null,
      batteryLevel: null
    };

    this.checkBatteryStatus();
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return this.status.isSupported;
  }

  // Get current status
  getStatus(): LocationStatus {
    return { ...this.status };
  }

  // Set callbacks
  setCallbacks(
    onLocationUpdate: (location: LocationData, sensorData?: SensorData) => void,
    onError?: (error: LocationError) => void,
    onStatusChange?: (status: LocationStatus) => void
  ) {
    this.onLocationUpdate = onLocationUpdate;
    this.onError = onError || null;
    this.onStatusChange = onStatusChange || null;
  }

  // Check location permission
  async checkPermission(): Promise<boolean> {
    if (!navigator.permissions) {
      this.updateStatus({ permissionGranted: false, error: { code: -1, message: 'Permissions API not supported' } });
      return false;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const granted = permission.state === 'granted';
      
      this.updateStatus({ permissionGranted: granted });
      
      if (granted) {
        this.updateStatus({ error: null });
      } else {
        this.updateStatus({ error: { code: 1, message: 'Location permission denied' } });
      }

      // Listen for permission changes
      permission.onchange = () => {
        const newGranted = permission.state === 'granted';
        this.updateStatus({ 
          permissionGranted: newGranted,
          error: newGranted ? null : { code: 1, message: 'Location permission denied' }
        });
      };

      return granted;
    } catch (error) {
      console.error('Error checking location permission:', error);
      this.updateStatus({ 
        permissionGranted: false, 
        error: { code: -1, message: 'Failed to check permission' } 
      });
      return false;
    }
  }

  // Request location permission
  async requestPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      this.updateStatus({ 
        permissionGranted: false, 
        error: { code: -1, message: 'Geolocation not supported' } 
      });
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.updateStatus({ 
            permissionGranted: true, 
            error: null 
          });
          resolve(true);
        },
        (error) => {
          const locationError = this.mapGeolocationError(error);
          this.updateStatus({ 
            permissionGranted: false, 
            error: locationError 
          });
          resolve(false);
        },
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      );
    });
  }

  // Start location tracking
  async startTracking(): Promise<boolean> {
    if (!navigator.geolocation) {
      this.updateStatus({ 
        isTracking: false, 
        error: { code: -1, message: 'Geolocation not supported' } 
      });
      return false;
    }

    // Check permission first
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) {
        return false;
      }
    }

    this.updateStatus({ isTracking: true, error: null });

    // Start motion sensor listening if available
    try {
      await motionService.startListening();
    } catch (error) {
      console.warn('Failed to start motion sensors:', error);
    }

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleLocationUpdate(position);
      },
      (error) => {
        const locationError = this.mapGeolocationError(error);
        this.updateStatus({ error: locationError });
        this.onError?.(locationError);
      },
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge
      }
    );

    // Start fallback interval
    this.startFallbackInterval();

    return true;
  }

  // Stop location tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.fallbackInterval !== null) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    // Stop motion sensor listening
    motionService.stopListening();

    this.updateStatus({ isTracking: false });
  }

  // Get current position once
  async getCurrentPosition(): Promise<LocationData> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.positionToLocationData(position);
          resolve(locationData);
        },
        (error) => {
          const locationError = this.mapGeolocationError(error);
          reject(new Error(locationError.message));
        },
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      );
    });
  }

  // Private methods
  private handleLocationUpdate(position: GeolocationPosition): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    // Throttle updates for battery optimization
    if (timeSinceLastUpdate < (this.options.throttleInterval || 5000)) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    const locationData = this.positionToLocationData(position);
    this.status.lastLocation = locationData;
    
    // Get current motion sensor data
    const sensorData = motionService.getCurrentSensorData();
    
    this.onLocationUpdate?.(locationData, sensorData);
    this.onStatusChange?.({ ...this.status });
  }

  private startFallbackInterval(): void {
    // Fallback: periodic location updates if watchPosition fails
    this.fallbackInterval = setInterval(async () => {
      if (!this.status.isTracking) return;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 60000
          });
        });

        this.handleLocationUpdate(position);
      } catch (error) {
        console.error('Fallback location update failed:', error);
      }
    }, 30000); // Every 30 seconds as fallback
  }

  private positionToLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp
    };
  }

  private mapGeolocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return { code: 1, message: 'Location permission denied' };
      case error.POSITION_UNAVAILABLE:
        return { code: 2, message: 'Location information unavailable' };
      case error.TIMEOUT:
        return { code: 3, message: 'Location request timed out' };
      default:
        return { code: 0, message: 'Unknown location error' };
    }
  }

  private async checkBatteryStatus(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.updateStatus({ batteryLevel: battery.level * 100 });
        
        battery.addEventListener('levelchange', () => {
          this.updateStatus({ batteryLevel: battery.level * 100 });
        });
      } catch (error) {
        console.error('Error checking battery status:', error);
      }
    }
  }

  private updateStatus(updates: Partial<LocationStatus>): void {
    this.status = { ...this.status, ...updates };
    this.onStatusChange?.({ ...this.status });
  }

  // Cleanup
  destroy(): void {
    this.stopTracking();
    this.onLocationUpdate = null;
    this.onError = null;
    this.onStatusChange = null;
  }
}

// Export a singleton instance
export const locationService = new LocationService(); 