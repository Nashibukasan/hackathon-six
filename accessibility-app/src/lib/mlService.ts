/**
 * ML Service Integration
 * Provides TypeScript interfaces and functions to interact with the Python ML service
 */

export interface SensorDataPoint {
  timestamp: number;
  acceleration_x: number;
  acceleration_y: number;
  acceleration_z: number;
  gyroscope_x?: number;
  gyroscope_y?: number;
  gyroscope_z?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface PredictionResult {
  window_index: number;
  transport_mode: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface TrainingSample {
  sensor_data: SensorDataPoint[];
  transport_mode: string;
}

export interface ModelInfo {
  is_trained: boolean;
  model_path: string;
  feature_count?: number;
  transport_modes: string[];
  last_trained?: string;
}

export interface FeatureImportance {
  feature_importance: Record<string, number>;
}

export interface TrainingResponse {
  success: boolean;
  message: string;
  metrics?: Record<string, number>;
}

export interface HybridInferenceResult extends PredictionResult {
  evidence: {
    sensor_based: boolean;
    gtfs_matched: boolean;
    gtfs_vehicles: any[];
    spatial_matches: any[];
    temporal_matches: any[];
  };
}

export interface InferenceSummary {
  total_windows: number;
  mode_distribution: Record<string, number>;
  most_common_mode: string;
  average_confidence: number;
  gtfs_match_rate: number;
  gtfs_matches: number;
}

class MLService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the ML service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('ML service health check failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(`${this.baseUrl}/model/info`);
    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get feature importance scores
   */
  async getFeatureImportance(): Promise<FeatureImportance> {
    const response = await fetch(`${this.baseUrl}/model/features/importance`);
    if (!response.ok) {
      throw new Error(`Failed to get feature importance: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get supported transport modes
   */
  async getTransportModes(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/transport-modes`);
    if (!response.ok) {
      throw new Error(`Failed to get transport modes: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Train the model with synthetic data
   */
  async trainWithSyntheticData(numSamples: number = 1000): Promise<TrainingResponse> {
    const response = await fetch(`${this.baseUrl}/train/synthetic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ num_samples: numSamples }),
    });

    if (!response.ok) {
      throw new Error(`Training failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Train the model with custom data
   */
  async trainWithCustomData(
    trainingData: TrainingSample[],
    generateSynthetic: boolean = false,
    numSyntheticSamples: number = 1000
  ): Promise<TrainingResponse> {
    const response = await fetch(`${this.baseUrl}/train`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        training_data: trainingData,
        generate_synthetic: generateSynthetic,
        num_synthetic_samples: numSyntheticSamples,
      }),
    });

    if (!response.ok) {
      throw new Error(`Training failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Predict transport mode for sensor data
   */
  async predictTransportMode(sensorData: SensorDataPoint[]): Promise<PredictionResult[]> {
    const response = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensor_data: sensorData }),
    });

    if (!response.ok) {
      throw new Error(`Prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Predict transport mode for a single window
   */
  async predictSingleWindow(sensorData: SensorDataPoint[]): Promise<PredictionResult> {
    const response = await fetch(`${this.baseUrl}/predict/single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensor_data: sensorData }),
    });

    if (!response.ok) {
      throw new Error(`Prediction failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform hybrid inference (combines sensor data with GTFS)
   * This is a wrapper that uses the basic prediction for now
   * In a full implementation, this would call a hybrid inference endpoint
   */
  async hybridInference(sensorData: SensorDataPoint[]): Promise<HybridInferenceResult[]> {
    // For now, use the basic prediction and add hybrid evidence structure
    const predictions = await this.predictTransportMode(sensorData);
    
    return predictions.map(pred => ({
      ...pred,
      evidence: {
        sensor_based: true,
        gtfs_matched: false, // Would be determined by hybrid inference
        gtfs_vehicles: [],
        spatial_matches: [],
        temporal_matches: [],
      },
    }));
  }

  /**
   * Generate synthetic sensor data for testing
   */
  generateSyntheticSensorData(
    transportMode: string,
    duration: number = 60, // seconds
    sampleRate: number = 10 // Hz
  ): SensorDataPoint[] {
    const numSamples = duration * sampleRate;
    const data: SensorDataPoint[] = [];
    const baseTime = Date.now() / 1000;

    // Mode-specific parameters
    const modeParams = {
      walking: { speed: 1.4, accelStd: 0.5, vibrationFreq: 2.0 },
      cycling: { speed: 5.0, accelStd: 0.8, vibrationFreq: 1.5 },
      bus: { speed: 12.0, accelStd: 1.2, vibrationFreq: 0.8 },
      train: { speed: 25.0, accelStd: 0.6, vibrationFreq: 0.5 },
      tram: { speed: 15.0, accelStd: 0.7, vibrationFreq: 0.6 },
      car: { speed: 20.0, accelStd: 1.0, vibrationFreq: 0.3 },
      stationary: { speed: 0.0, accelStd: 0.1, vibrationFreq: 0.0 },
    };

    const params = modeParams[transportMode as keyof typeof modeParams] || modeParams.walking;

    for (let i = 0; i < numSamples; i++) {
      const timestamp = baseTime + i / sampleRate;
      
      // Generate accelerometer data
      const vibration = params.vibrationFreq * Math.sin(2 * Math.PI * i * 0.1);
      const acceleration_x = (Math.random() - 0.5) * params.accelStd + vibration;
      const acceleration_y = (Math.random() - 0.5) * params.accelStd + vibration;
      const acceleration_z = 9.81 + (Math.random() - 0.5) * params.accelStd;

      // Generate gyroscope data
      const gyroscope_x = (Math.random() - 0.5) * 0.1;
      const gyroscope_y = (Math.random() - 0.5) * 0.1;
      const gyroscope_z = (Math.random() - 0.5) * 0.1;

      // Generate GPS data
      const speed = Math.max(0, params.speed + (Math.random() - 0.5) * params.speed * 0.3);
      
      // Simulate movement for non-stationary modes
      let latitude = -37.8136; // Melbourne coordinates
      let longitude = 144.9631;
      let heading = 0;

      if (transportMode !== 'stationary') {
        const distance = speed * (i / sampleRate) / 111320; // Convert to degrees
        latitude += distance * Math.cos(heading);
        longitude += distance * Math.sin(heading);
        heading = Math.random() * 360;
      }

      data.push({
        timestamp,
        acceleration_x,
        acceleration_y,
        acceleration_z,
        gyroscope_x,
        gyroscope_y,
        gyroscope_z,
        latitude,
        longitude,
        speed,
        heading,
        accuracy: 5.0,
      });
    }

    return data;
  }

  /**
   * Analyze journey data and provide insights
   */
  async analyzeJourney(sensorData: SensorDataPoint[]): Promise<{
    predictions: HybridInferenceResult[];
    summary: InferenceSummary;
    insights: string[];
  }> {
    const predictions = await this.hybridInference(sensorData);
    
    // Calculate summary statistics
    const modeCounts: Record<string, number> = {};
    let totalConfidence = 0;
    let gtfsMatches = 0;

    predictions.forEach(pred => {
      modeCounts[pred.transport_mode] = (modeCounts[pred.transport_mode] || 0) + 1;
      totalConfidence += pred.confidence;
      if (pred.evidence.gtfs_matched) gtfsMatches++;
    });

    const mostCommonMode = Object.entries(modeCounts).reduce((a, b) => 
      modeCounts[a[0]] > modeCounts[b[0]] ? a : b
    )[0];

    const summary: InferenceSummary = {
      total_windows: predictions.length,
      mode_distribution: modeCounts,
      most_common_mode: mostCommonMode,
      average_confidence: totalConfidence / predictions.length,
      gtfs_match_rate: gtfsMatches / predictions.length,
      gtfs_matches: gtfsMatches,
    };

    // Generate insights
    const insights: string[] = [];
    
    if (summary.average_confidence > 0.8) {
      insights.push('High confidence predictions detected');
    } else if (summary.average_confidence < 0.6) {
      insights.push('Low confidence predictions - consider improving sensor data quality');
    }

    if (summary.gtfs_match_rate > 0.5) {
      insights.push('Good GTFS integration detected for public transport modes');
    }

    const modeVariety = Object.keys(summary.mode_distribution).length;
    if (modeVariety > 3) {
      insights.push('Multiple transport modes detected - complex journey pattern');
    }

    return {
      predictions,
      summary,
      insights,
    };
  }
}

// Export singleton instance
export const mlService = new MLService();

// Export for testing
export { MLService }; 