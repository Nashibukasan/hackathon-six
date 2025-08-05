'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motionService } from '@/lib/motionService';
import { dataPreprocessingService } from '@/lib/dataPreprocessing';
import { SensorData, MotionStatus } from '@/types';

interface MotionSensorTestProps {
  className?: string;
}

export default function MotionSensorTest({ className = '' }: MotionSensorTestProps) {
  const [status, setStatus] = useState<MotionStatus>(motionService.getStatus());
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [bufferedData, setBufferedData] = useState<SensorData[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Handle motion updates
  const handleMotionUpdate = useCallback((data: SensorData) => {
    setSensorData(data);
    setBufferedData(motionService.getBufferedData());
    
    // Process data for transport mode detection
    const processedPoint = dataPreprocessingService.addDataPoint(undefined, data);
    setProcessedData(dataPreprocessingService.getAllData());
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback((newStatus: MotionStatus) => {
    setStatus(newStatus);
    setIsListening(newStatus.isListening);
  }, []);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Motion sensor error:', error);
  }, []);

  // Set up callbacks
  useEffect(() => {
    motionService.setCallbacks(handleMotionUpdate, handleError, handleStatusChange);
    
    return () => {
      motionService.destroy();
    };
  }, [handleMotionUpdate, handleError, handleStatusChange]);

  // Request permission
  const requestPermission = async () => {
    setPermissionRequested(true);
    const granted = await motionService.requestPermission();
    if (granted) {
      console.log('Motion sensor permission granted');
    } else {
      console.log('Motion sensor permission denied');
    }
  };

  // Start listening
  const startListening = async () => {
    const success = await motionService.startListening();
    if (success) {
      console.log('Motion sensor listening started');
    } else {
      console.log('Failed to start motion sensor listening');
    }
  };

  // Stop listening
  const stopListening = () => {
    motionService.stopListening();
    console.log('Motion sensor listening stopped');
  };

  // Clear buffer
  const clearBuffer = () => {
    motionService.clearBuffer();
    dataPreprocessingService.clearBuffer();
    setBufferedData([]);
    setProcessedData([]);
  };

  // Get statistical features
  const getStatisticalFeatures = () => {
    return motionService.getStatisticalFeatures();
  };

  // Get processed statistical features
  const getProcessedFeatures = () => {
    return dataPreprocessingService.getStatisticalFeatures();
  };

  const features = getStatisticalFeatures();
  const processedFeatures = getProcessedFeatures();

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Motion Sensor Test</h2>
      
      {/* Status Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Supported:</span>
            <span className={`px-2 py-1 rounded text-xs ${status.isSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status.isSupported ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Permission:</span>
            <span className={`px-2 py-1 rounded text-xs ${status.permissionGranted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {status.permissionGranted ? 'Granted' : 'Denied'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Listening:</span>
            <span className={`px-2 py-1 rounded text-xs ${status.isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {status.isListening ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Battery:</span>
            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
              {status.batteryLevel !== null ? `${Math.round(status.batteryLevel)}%` : 'Unknown'}
            </span>
          </div>
        </div>
        
        {status.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            Error: {status.error.message}
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Controls</h3>
        <div className="flex flex-wrap gap-3">
          {!status.permissionGranted && !permissionRequested && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Request Permission
            </button>
          )}
          
          {status.permissionGranted && !status.isListening && (
            <button
              onClick={startListening}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Start Listening
            </button>
          )}
          
          {status.isListening && (
            <button
              onClick={stopListening}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Stop Listening
            </button>
          )}
          
          <button
            onClick={clearBuffer}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Clear Buffer
          </button>
        </div>
      </div>

      {/* Real-time Data Section */}
      {sensorData && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Real-time Sensor Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sensorData.accelerometer && (
              <div className="p-4 bg-blue-50 rounded">
                <h4 className="font-medium text-blue-800 mb-2">Accelerometer</h4>
                <div className="space-y-1 text-sm">
                  <div>X: {sensorData.accelerometer.x.toFixed(2)}</div>
                  <div>Y: {sensorData.accelerometer.y.toFixed(2)}</div>
                  <div>Z: {sensorData.accelerometer.z.toFixed(2)}</div>
                  <div className="font-medium">
                    Magnitude: {Math.sqrt(
                      Math.pow(sensorData.accelerometer.x, 2) + 
                      Math.pow(sensorData.accelerometer.y, 2) + 
                      Math.pow(sensorData.accelerometer.z, 2)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            
            {sensorData.gyroscope && (
              <div className="p-4 bg-green-50 rounded">
                <h4 className="font-medium text-green-800 mb-2">Gyroscope</h4>
                <div className="space-y-1 text-sm">
                  <div>X: {sensorData.gyroscope.x.toFixed(2)}</div>
                  <div>Y: {sensorData.gyroscope.y.toFixed(2)}</div>
                  <div>Z: {sensorData.gyroscope.z.toFixed(2)}</div>
                  <div className="font-medium">
                    Magnitude: {Math.sqrt(
                      Math.pow(sensorData.gyroscope.x, 2) + 
                      Math.pow(sensorData.gyroscope.y, 2) + 
                      Math.pow(sensorData.gyroscope.z, 2)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
            
            {sensorData.deviceOrientation && (
              <div className="p-4 bg-purple-50 rounded">
                <h4 className="font-medium text-purple-800 mb-2">Device Orientation</h4>
                <div className="space-y-1 text-sm">
                  <div>Alpha: {sensorData.deviceOrientation.alpha.toFixed(2)}°</div>
                  <div>Beta: {sensorData.deviceOrientation.beta.toFixed(2)}°</div>
                  <div>Gamma: {sensorData.deviceOrientation.gamma.toFixed(2)}°</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistical Features Section */}
      {bufferedData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Statistical Features ({bufferedData.length} samples)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-sm font-medium text-yellow-800">Mean Acceleration</div>
              <div className="text-lg font-bold">{features.meanAcceleration.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-sm font-medium text-yellow-800">Std Acceleration</div>
              <div className="text-lg font-bold">{features.stdAcceleration.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <div className="text-sm font-medium text-yellow-800">Accel Range</div>
              <div className="text-lg font-bold">{features.accelerationRange.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="text-sm font-medium text-orange-800">Mean Rotation</div>
              <div className="text-lg font-bold">{features.meanRotation.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="text-sm font-medium text-orange-800">Std Rotation</div>
              <div className="text-lg font-bold">{features.stdRotation.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <div className="text-sm font-medium text-orange-800">Rotation Range</div>
              <div className="text-lg font-bold">{features.rotationRange.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Processed Features Section */}
      {processedData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Processed Features ({processedData.length} samples)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-800">Mean Speed</div>
              <div className="text-lg font-bold">{processedFeatures.meanSpeed.toFixed(2)} m/s</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-800">Std Speed</div>
              <div className="text-lg font-bold">{processedFeatures.stdSpeed.toFixed(2)} m/s</div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-800">Speed Range</div>
              <div className="text-lg font-bold">{processedFeatures.speedRange.toFixed(2)} m/s</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-sm font-medium text-purple-800">Heading Variance</div>
              <div className="text-lg font-bold">{processedFeatures.headingVariance.toFixed(2)}°</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-sm font-medium text-purple-800">Sample Count</div>
              <div className="text-lg font-bold">{processedFeatures.sampleCount}</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-sm font-medium text-purple-800">Enough Data</div>
              <div className="text-lg font-bold">{dataPreprocessingService.hasEnoughData() ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Buffer Info */}
      <div className="text-sm text-gray-600">
        Motion buffer: {bufferedData.length} samples | 
        Processed buffer: {processedData.length} samples
        {bufferedData.length > 0 && (
          <span className="ml-2">
            (Last update: {new Date(sensorData?.timestamp || 0).toLocaleTimeString()})
          </span>
        )}
      </div>
    </div>
  );
} 