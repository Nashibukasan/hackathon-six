import { SensorData, LocationData } from '@/types';

export interface ProcessedDataPoint {
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
  };
  sensors?: {
    accelerometer?: {
      x: number;
      y: number;
      z: number;
      magnitude: number;
    };
    gyroscope?: {
      x: number;
      y: number;
      z: number;
      magnitude: number;
    };
    deviceOrientation?: {
      alpha: number;
      beta: number;
      gamma: number;
    };
  };
  features?: {
    accelerationMagnitude: number;
    rotationMagnitude: number;
    speed: number;
    headingChange: number;
  };
}

export interface StatisticalFeatures {
  meanAcceleration: number;
  stdAcceleration: number;
  meanRotation: number;
  stdRotation: number;
  meanSpeed: number;
  stdSpeed: number;
  accelerationRange: number;
  rotationRange: number;
  speedRange: number;
  headingVariance: number;
  sampleCount: number;
}

export class DataPreprocessingService {
  private dataBuffer: ProcessedDataPoint[] = [];
  private readonly maxBufferSize: number;

  constructor(maxBufferSize: number = 100) {
    this.maxBufferSize = maxBufferSize;
  }

  // Process and add a new data point
  addDataPoint(locationData?: LocationData, sensorData?: SensorData): ProcessedDataPoint {
    const processedPoint: ProcessedDataPoint = {
      timestamp: Date.now()
    };

    // Process location data
    if (locationData) {
      processedPoint.location = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading
      };
    }

    // Process sensor data
    if (sensorData) {
      processedPoint.sensors = {};

      if (sensorData.accelerometer) {
        const magnitude = this.calculateAccelerationMagnitude(sensorData.accelerometer);
        processedPoint.sensors.accelerometer = {
          ...sensorData.accelerometer,
          magnitude
        };
      }

      if (sensorData.gyroscope) {
        const magnitude = this.calculateRotationMagnitude(sensorData.gyroscope);
        processedPoint.sensors.gyroscope = {
          ...sensorData.gyroscope,
          magnitude
        };
      }

      if (sensorData.deviceOrientation) {
        processedPoint.sensors.deviceOrientation = sensorData.deviceOrientation;
      }
    }

    // Calculate derived features
    processedPoint.features = this.calculateFeatures(processedPoint);

    // Add to buffer
    this.dataBuffer.push(processedPoint);

    // Maintain buffer size
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }

    return processedPoint;
  }

  // Calculate derived features for transport mode detection
  private calculateFeatures(dataPoint: ProcessedDataPoint) {
    const features: ProcessedDataPoint['features'] = {
      accelerationMagnitude: 0,
      rotationMagnitude: 0,
      speed: 0,
      headingChange: 0
    };

    if (dataPoint.sensors?.accelerometer) {
      features.accelerationMagnitude = dataPoint.sensors.accelerometer.magnitude;
    }

    if (dataPoint.sensors?.gyroscope) {
      features.rotationMagnitude = dataPoint.sensors.gyroscope.magnitude;
    }

    if (dataPoint.location?.speed !== null && dataPoint.location?.speed !== undefined) {
      features.speed = dataPoint.location.speed;
    }

    // Calculate heading change (if we have previous data)
    if (this.dataBuffer.length > 0 && dataPoint.location?.heading !== null) {
      const previousPoint = this.dataBuffer[this.dataBuffer.length - 1];
      if (previousPoint.location?.heading !== null && previousPoint.location?.heading !== undefined) {
        const headingDiff = Math.abs(dataPoint.location.heading - previousPoint.location.heading);
        features.headingChange = Math.min(headingDiff, 360 - headingDiff); // Handle 0/360 wrap-around
      }
    }

    return features;
  }

  // Calculate acceleration magnitude
  private calculateAccelerationMagnitude(accelerometer: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(accelerometer.x, 2) + 
      Math.pow(accelerometer.y, 2) + 
      Math.pow(accelerometer.z, 2)
    );
  }

  // Calculate rotation magnitude
  private calculateRotationMagnitude(gyroscope: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(gyroscope.x, 2) + 
      Math.pow(gyroscope.y, 2) + 
      Math.pow(gyroscope.z, 2)
    );
  }

  // Get statistical features from the buffer
  getStatisticalFeatures(): StatisticalFeatures {
    if (this.dataBuffer.length === 0) {
      return {
        meanAcceleration: 0,
        stdAcceleration: 0,
        meanRotation: 0,
        stdRotation: 0,
        meanSpeed: 0,
        stdSpeed: 0,
        accelerationRange: 0,
        rotationRange: 0,
        speedRange: 0,
        headingVariance: 0,
        sampleCount: 0
      };
    }

    const accelerations = this.dataBuffer
      .map(point => point.features?.accelerationMagnitude || 0)
      .filter(acc => acc > 0);

    const rotations = this.dataBuffer
      .map(point => point.features?.rotationMagnitude || 0)
      .filter(rot => rot > 0);

    const speeds = this.dataBuffer
      .map(point => point.features?.speed || 0)
      .filter(speed => speed > 0);

    const headings = this.dataBuffer
      .map(point => point.location?.heading || 0)
      .filter(heading => heading !== null);

    // Calculate means
    const meanAcceleration = accelerations.length > 0 
      ? accelerations.reduce((sum, val) => sum + val, 0) / accelerations.length 
      : 0;

    const meanRotation = rotations.length > 0 
      ? rotations.reduce((sum, val) => sum + val, 0) / rotations.length 
      : 0;

    const meanSpeed = speeds.length > 0 
      ? speeds.reduce((sum, val) => sum + val, 0) / speeds.length 
      : 0;

    // Calculate standard deviations
    const stdAcceleration = accelerations.length > 0 
      ? Math.sqrt(accelerations.reduce((sum, val) => sum + Math.pow(val - meanAcceleration, 2), 0) / accelerations.length)
      : 0;

    const stdRotation = rotations.length > 0 
      ? Math.sqrt(rotations.reduce((sum, val) => sum + Math.pow(val - meanRotation, 2), 0) / rotations.length)
      : 0;

    const stdSpeed = speeds.length > 0 
      ? Math.sqrt(speeds.reduce((sum, val) => sum + Math.pow(val - meanSpeed, 2), 0) / speeds.length)
      : 0;

    // Calculate ranges
    const accelerationRange = accelerations.length > 0 
      ? Math.max(...accelerations) - Math.min(...accelerations)
      : 0;

    const rotationRange = rotations.length > 0 
      ? Math.max(...rotations) - Math.min(...rotations)
      : 0;

    const speedRange = speeds.length > 0 
      ? Math.max(...speeds) - Math.min(...speeds)
      : 0;

    // Calculate heading variance (circular variance)
    let headingVariance = 0;
    if (headings.length > 0) {
      const meanHeading = this.calculateCircularMean(headings);
      const circularVariance = headings.reduce((sum, heading) => {
        const diff = Math.abs(heading - meanHeading);
        const wrappedDiff = Math.min(diff, 360 - diff);
        return sum + Math.pow(wrappedDiff, 2);
      }, 0) / headings.length;
      headingVariance = circularVariance;
    }

    return {
      meanAcceleration,
      stdAcceleration,
      meanRotation,
      stdRotation,
      meanSpeed,
      stdSpeed,
      accelerationRange,
      rotationRange,
      speedRange,
      headingVariance,
      sampleCount: this.dataBuffer.length
    };
  }

  // Calculate circular mean for heading data
  private calculateCircularMean(headings: number[]): number {
    const radians = headings.map(h => (h * Math.PI) / 180);
    const meanSin = radians.reduce((sum, r) => sum + Math.sin(r), 0) / radians.length;
    const meanCos = radians.reduce((sum, r) => sum + Math.cos(r), 0) / radians.length;
    const meanAngle = Math.atan2(meanSin, meanCos);
    return (meanAngle * 180) / Math.PI;
  }

  // Get recent data points
  getRecentDataPoints(count: number = 10): ProcessedDataPoint[] {
    return this.dataBuffer.slice(-count);
  }

  // Get all buffered data
  getAllData(): ProcessedDataPoint[] {
    return [...this.dataBuffer];
  }

  // Clear the buffer
  clearBuffer(): void {
    this.dataBuffer = [];
  }

  // Get buffer size
  getBufferSize(): number {
    return this.dataBuffer.length;
  }

  // Check if we have enough data for analysis
  hasEnoughData(minSamples: number = 10): boolean {
    return this.dataBuffer.length >= minSamples;
  }

  // Get time span of buffered data
  getTimeSpan(): { start: number; end: number; duration: number } | null {
    if (this.dataBuffer.length === 0) {
      return null;
    }

    const start = this.dataBuffer[0].timestamp;
    const end = this.dataBuffer[this.dataBuffer.length - 1].timestamp;
    const duration = end - start;

    return { start, end, duration };
  }
}

// Export a singleton instance
export const dataPreprocessingService = new DataPreprocessingService(); 