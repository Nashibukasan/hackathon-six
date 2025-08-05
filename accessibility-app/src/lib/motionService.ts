import { SensorData, MotionStatus, MotionOptions } from '@/types';

export class MotionService {
  private isListening: boolean = false;
  private options: MotionOptions;
  private onMotionUpdate: ((sensorData: SensorData) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private onStatusChange: ((status: MotionStatus) => void) | null = null;
  private status: MotionStatus;
  private lastUpdateTime: number = 0;
  private dataBuffer: SensorData[] = [];
  private readonly BUFFER_SIZE = 50; // Keep last 50 readings for analysis

  constructor(options: MotionOptions = {}) {
    this.options = {
      throttleInterval: 100, // 10Hz sampling rate
      enableAccelerometer: true,
      enableGyroscope: true,
      enableDeviceOrientation: false,
      bufferSize: 50,
      ...options
    };

    this.status = {
      isSupported: this.checkSupport(),
      permissionGranted: false,
      isListening: false,
      lastSensorData: null,
      error: null,
      batteryLevel: null
    };

    this.checkBatteryStatus();
  }

  // Check if device motion is supported
  private checkSupport(): boolean {
    return !!(window.DeviceMotionEvent || window.DeviceOrientationEvent);
  }

  // Get current status
  getStatus(): MotionStatus {
    return { ...this.status };
  }

  // Set callbacks
  setCallbacks(
    onMotionUpdate: (sensorData: SensorData) => void,
    onError?: (error: Error) => void,
    onStatusChange?: (status: MotionStatus) => void
  ) {
    this.onMotionUpdate = onMotionUpdate;
    this.onError = onError || null;
    this.onStatusChange = onStatusChange || null;
  }

  // Check motion sensor permission (iOS 13+)
  async checkPermission(): Promise<boolean> {
    if (!navigator.permissions) {
      this.updateStatus({ 
        permissionGranted: false, 
        error: new Error('Permissions API not supported') 
      });
      return false;
    }

    try {
      // Request device motion permission (iOS 13+)
      if ('requestPermission' in DeviceMotionEvent) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        const granted = permission === 'granted';
        
        this.updateStatus({ permissionGranted: granted });
        
        if (!granted) {
          this.updateStatus({ 
            error: new Error('Motion sensor permission denied') 
          });
        }

        return granted;
      }

      // For browsers without explicit permission API, assume granted
      this.updateStatus({ permissionGranted: true });
      return true;
    } catch (error) {
      console.error('Error checking motion permission:', error);
      this.updateStatus({ 
        permissionGranted: false, 
        error: error instanceof Error ? error : new Error('Failed to check permission') 
      });
      return false;
    }
  }

  // Request motion sensor permission
  async requestPermission(): Promise<boolean> {
    if (!this.status.isSupported) {
      this.updateStatus({ 
        permissionGranted: false, 
        error: new Error('Device motion not supported') 
      });
      return false;
    }

    return await this.checkPermission();
  }

  // Start listening to motion sensors
  async startListening(): Promise<boolean> {
    if (!this.status.isSupported) {
      this.updateStatus({ 
        isListening: false, 
        error: new Error('Device motion not supported') 
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

    this.updateStatus({ isListening: true, error: null });
    this.isListening = true;

    // Start device motion listener
    if (this.options.enableAccelerometer || this.options.enableGyroscope) {
      window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this), { passive: true });
    }

    // Start device orientation listener (if enabled)
    if (this.options.enableDeviceOrientation) {
      window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this), { passive: true });
    }

    return true;
  }

  // Stop listening to motion sensors
  stopListening(): void {
    this.isListening = false;
    this.updateStatus({ isListening: false });

    window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
  }

  // Get current sensor data
  getCurrentSensorData(): SensorData | null {
    return this.status.lastSensorData;
  }

  // Get buffered sensor data for analysis
  getBufferedData(): SensorData[] {
    return [...this.dataBuffer];
  }

  // Clear data buffer
  clearBuffer(): void {
    this.dataBuffer = [];
  }

  // Private methods
  private handleDeviceMotion(event: DeviceMotionEvent): void {
    if (!this.isListening) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    // Throttle updates for battery optimization
    if (timeSinceLastUpdate < (this.options.throttleInterval || 100)) {
      return;
    }
    
    this.lastUpdateTime = now;

    const sensorData: SensorData = {
      timestamp: now
    };

    // Extract accelerometer data
    if (this.options.enableAccelerometer && event.accelerationIncludingGravity) {
      sensorData.accelerometer = {
        x: event.accelerationIncludingGravity.x || 0,
        y: event.accelerationIncludingGravity.y || 0,
        z: event.accelerationIncludingGravity.z || 0
      };
    }

    // Extract gyroscope data
    if (this.options.enableGyroscope && event.rotationRate) {
      sensorData.gyroscope = {
        x: event.rotationRate.alpha || 0,
        y: event.rotationRate.beta || 0,
        z: event.rotationRate.gamma || 0
      };
    }

    // Update status and callbacks
    this.status.lastSensorData = sensorData;
    this.addToBuffer(sensorData);
    
    this.onMotionUpdate?.(sensorData);
    this.onStatusChange?.({ ...this.status });
  }

  private handleDeviceOrientation(event: DeviceOrientationEvent): void {
    if (!this.isListening || !this.options.enableDeviceOrientation) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    // Throttle updates
    if (timeSinceLastUpdate < (this.options.throttleInterval || 100)) {
      return;
    }
    
    this.lastUpdateTime = now;

    const sensorData: SensorData = {
      timestamp: now,
      deviceOrientation: {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0
      }
    };

    // Update status and callbacks
    this.status.lastSensorData = sensorData;
    this.addToBuffer(sensorData);
    
    this.onMotionUpdate?.(sensorData);
    this.onStatusChange?.({ ...this.status });
  }

  private addToBuffer(sensorData: SensorData): void {
    this.dataBuffer.push(sensorData);
    
    // Keep buffer size manageable
    if (this.dataBuffer.length > this.options.bufferSize) {
      this.dataBuffer.shift();
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

  private updateStatus(updates: Partial<MotionStatus>): void {
    this.status = { ...this.status, ...updates };
    this.onStatusChange?.({ ...this.status });
  }

  // Utility methods for transport mode detection
  calculateAccelerationMagnitude(accelerometer: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(accelerometer.x, 2) + 
      Math.pow(accelerometer.y, 2) + 
      Math.pow(accelerometer.z, 2)
    );
  }

  calculateRotationMagnitude(gyroscope: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(gyroscope.x, 2) + 
      Math.pow(gyroscope.y, 2) + 
      Math.pow(gyroscope.z, 2)
    );
  }

  // Get statistical features from buffer for ML analysis
  getStatisticalFeatures(): {
    meanAcceleration: number;
    stdAcceleration: number;
    meanRotation: number;
    stdRotation: number;
    accelerationRange: number;
    rotationRange: number;
  } {
    if (this.dataBuffer.length === 0) {
      return {
        meanAcceleration: 0,
        stdAcceleration: 0,
        meanRotation: 0,
        stdRotation: 0,
        accelerationRange: 0,
        rotationRange: 0
      };
    }

    const accelerations = this.dataBuffer
      .filter(data => data.accelerometer)
      .map(data => this.calculateAccelerationMagnitude(data.accelerometer!));

    const rotations = this.dataBuffer
      .filter(data => data.gyroscope)
      .map(data => this.calculateRotationMagnitude(data.gyroscope!));

    const meanAcceleration = accelerations.length > 0 
      ? accelerations.reduce((sum, val) => sum + val, 0) / accelerations.length 
      : 0;

    const meanRotation = rotations.length > 0 
      ? rotations.reduce((sum, val) => sum + val, 0) / rotations.length 
      : 0;

    const stdAcceleration = accelerations.length > 0 
      ? Math.sqrt(accelerations.reduce((sum, val) => sum + Math.pow(val - meanAcceleration, 2), 0) / accelerations.length)
      : 0;

    const stdRotation = rotations.length > 0 
      ? Math.sqrt(rotations.reduce((sum, val) => sum + Math.pow(val - meanRotation, 2), 0) / rotations.length)
      : 0;

    const accelerationRange = accelerations.length > 0 
      ? Math.max(...accelerations) - Math.min(...accelerations)
      : 0;

    const rotationRange = rotations.length > 0 
      ? Math.max(...rotations) - Math.min(...rotations)
      : 0;

    return {
      meanAcceleration,
      stdAcceleration,
      meanRotation,
      stdRotation,
      accelerationRange,
      rotationRange
    };
  }

  // Cleanup
  destroy(): void {
    this.stopListening();
    this.onMotionUpdate = null;
    this.onError = null;
    this.onStatusChange = null;
    this.clearBuffer();
  }
}

// Export a singleton instance
export const motionService = new MotionService(); 