'use client';

import { useState, useEffect } from 'react';
import { mlService, SensorDataPoint, PredictionResult, ModelInfo } from '@/lib/mlService';

export default function TestMLPage() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [selectedMode, setSelectedMode] = useState('walking');
  const [duration, setDuration] = useState(60);
  const [sampleRate, setSampleRate] = useState(10);
  const [status, setStatus] = useState('');

  const transportModes = [
    'walking', 'cycling', 'bus', 'train', 'tram', 'car', 'stationary'
  ];

  useEffect(() => {
    checkMLService();
  }, []);

  const checkMLService = async () => {
    try {
      setIsLoading(true);
      const isHealthy = await mlService.healthCheck();
      
      if (isHealthy) {
        const info = await mlService.getModelInfo();
        setModelInfo(info);
        setStatus('ML service is running and ready');
      } else {
        setStatus('ML service is not available');
      }
    } catch (error) {
      setStatus('Error connecting to ML service');
      console.error('ML service check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trainModel = async () => {
    try {
      setIsLoading(true);
      setStatus('Training model with synthetic data...');
      
      const result = await mlService.trainWithSyntheticData(1000);
      
      if (result.success) {
        setStatus(`Model trained successfully! ${result.message}`);
        await checkMLService(); // Refresh model info
      } else {
        setStatus('Model training failed');
      }
    } catch (error) {
      setStatus('Error training model');
      console.error('Training failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAndPredict = async () => {
    try {
      setIsLoading(true);
      setStatus('Generating synthetic data and making prediction...');
      
      // Generate synthetic sensor data
      const sensorData = mlService.generateSyntheticSensorData(
        selectedMode,
        duration,
        sampleRate
      );
      
      // Make prediction
      const results = await mlService.predictTransportMode(sensorData);
      setPredictions(results);
      
      setStatus(`Prediction completed! Generated ${sensorData.length} data points`);
    } catch (error) {
      setStatus('Error making prediction');
      console.error('Prediction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeJourney = async () => {
    try {
      setIsLoading(true);
      setStatus('Analyzing journey with hybrid inference...');
      
      // Generate synthetic sensor data
      const sensorData = mlService.generateSyntheticSensorData(
        selectedMode,
        duration,
        sampleRate
      );
      
      // Analyze journey
      const analysis = await mlService.analyzeJourney(sensorData);
      setPredictions(analysis.predictions);
      
      setStatus(`Analysis completed! ${analysis.insights.join(', ')}`);
    } catch (error) {
      setStatus('Error analyzing journey');
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Transport Mode Detection - ML Service Test
          </h1>
          
          {/* Status */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg ${
              status.includes('Error') || status.includes('not available') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              <p className="font-semibold">Status: {status}</p>
            </div>
          </div>

          {/* Model Info */}
          {modelInfo && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-3">Model Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Trained</p>
                  <p className="font-semibold">{modelInfo.is_trained ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Features</p>
                  <p className="font-semibold">{modelInfo.feature_count || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Modes</p>
                  <p className="font-semibold">{modelInfo.transport_modes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Trained</p>
                  <p className="font-semibold">{modelInfo.last_trained ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Training Controls */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Model Training</h3>
              <button
                onClick={trainModel}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Training...' : 'Train Model (1000 samples)'}
              </button>
            </div>

            {/* Prediction Controls */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Test Parameters</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport Mode
                  </label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    {transportModes.map(mode => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min="10"
                    max="300"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Rate (Hz)
                  </label>
                  <input
                    type="number"
                    value={sampleRate}
                    onChange={(e) => setSampleRate(Number(e.target.value))}
                    min="1"
                    max="50"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={generateAndPredict}
              disabled={isLoading || !modelInfo?.is_trained}
              className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Generate & Predict'}
            </button>
            
            <button
              onClick={analyzeJourney}
              disabled={isLoading || !modelInfo?.is_trained}
              className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Journey'}
            </button>
          </div>

          {/* Results */}
          {predictions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Prediction Results</h3>
              
              {/* Summary */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Windows</p>
                    <p className="font-semibold">{predictions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Confidence</p>
                    <p className="font-semibold">
                      {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length).toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Most Common Mode</p>
                    <p className="font-semibold">
                      {(() => {
                        const modeCounts: Record<string, number> = {};
                        predictions.forEach(p => {
                          modeCounts[p.transport_mode] = (modeCounts[p.transport_mode] || 0) + 1;
                        });
                        return Object.entries(modeCounts).reduce((a, b) => 
                          modeCounts[a[0]] > modeCounts[b[0]] ? a : b
                        )[0];
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Data Points</p>
                    <p className="font-semibold">{duration * sampleRate}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Window</th>
                      <th className="px-4 py-2 text-left">Mode</th>
                      <th className="px-4 py-2 text-left">Confidence</th>
                      <th className="px-4 py-2 text-left">Probabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.slice(0, 10).map((pred, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{pred.window_index}</td>
                        <td className="px-4 py-2">
                          <span className="capitalize">{pred.transport_mode}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">{(pred.confidence * 100).toFixed(1)}%</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${pred.confidence * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-xs">
                            {Object.entries(pred.probabilities)
                              .sort(([,a], [,b]) => b - a)
                              .slice(0, 3)
                              .map(([mode, prob]) => (
                                <div key={mode} className="flex justify-between">
                                  <span className="capitalize">{mode}:</span>
                                  <span>{(prob * 100).toFixed(1)}%</span>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {predictions.length > 10 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Showing first 10 of {predictions.length} predictions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 