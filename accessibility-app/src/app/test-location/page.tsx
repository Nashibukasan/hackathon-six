'use client';

import { useState, useEffect } from 'react';
import { locationService } from '@/lib/locationService';
import { LocationData, LocationStatus } from '@/types';

export default function TestLocationPage() {
  const [status, setStatus] = useState<LocationStatus | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Set up location service callbacks
    locationService.setCallbacks(
      handleLocationUpdate,
      handleLocationError,
      handleLocationStatusChange
    );

    // Get initial status
    setStatus(locationService.getStatus());

    // Cleanup on unmount
    return () => {
      locationService.destroy();
    };
  }, []);

  const handleLocationUpdate = (locationData: LocationData) => {
    setLocations(prev => [...prev, locationData]);
  };

  const handleLocationError = (error: any) => {
    console.error('Location error:', error);
  };

  const handleLocationStatusChange = (newStatus: LocationStatus) => {
    setStatus(newStatus);
  };

  const handleStartTracking = async () => {
    const success = await locationService.startTracking();
    if (success) {
      setIsTracking(true);
    }
  };

  const handleStopTracking = () => {
    locationService.stopTracking();
    setIsTracking(false);
  };

  const handleGetCurrentPosition = async () => {
    try {
      const position = await locationService.getCurrentPosition();
      setLocations(prev => [...prev, position]);
    } catch (error) {
      console.error('Error getting current position:', error);
    }
  };

  const clearLocations = () => {
    setLocations([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Location Tracking Test
          </h1>
          <p className="text-lg text-gray-600">
            Test the Web Geolocation API implementation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
            
            {status && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Geolocation Supported:</span>
                  <span className={`text-sm ${status.isSupported ? 'text-green-600' : 'text-red-600'}`}>
                    {status.isSupported ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Permission Granted:</span>
                  <span className={`text-sm ${status.permissionGranted ? 'text-green-600' : 'text-red-600'}`}>
                    {status.permissionGranted ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Currently Tracking:</span>
                  <span className={`text-sm ${status.isTracking ? 'text-green-600' : 'text-red-600'}`}>
                    {status.isTracking ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Battery Level:</span>
                  <span className="text-sm text-gray-600">
                    {status.batteryLevel ? `${Math.round(status.batteryLevel)}%` : 'Unknown'}
                  </span>
                </div>
                
                {status.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-700">
                      Error: {status.error.message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleStartTracking}
                disabled={isTracking}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {isTracking ? 'Tracking Active' : 'Start Tracking'}
              </button>
              
              <button
                onClick={handleStopTracking}
                disabled={!isTracking}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Stop Tracking
              </button>
              
              <button
                onClick={handleGetCurrentPosition}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Current Position
              </button>
              
              <button
                onClick={clearLocations}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear Locations
              </button>
            </div>
          </div>
        </div>

        {/* Locations Display */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Location Data ({locations.length} points)
            </h2>
            {locations.length > 0 && (
              <span className="text-sm text-gray-500">
                Last update: {new Date(locations[locations.length - 1]?.timestamp || Date.now()).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {locations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No location data yet. Start tracking or get current position to see data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latitude
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Longitude
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Speed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Heading
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locations.slice(-10).reverse().map((location, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(location.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.latitude.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.longitude.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.accuracy ? `${Math.round(location.accuracy)}m` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.speed ? `${(location.speed * 3.6).toFixed(1)} km/h` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.heading ? `${Math.round(location.heading)}°` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Test Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Click "Start Tracking" to begin continuous location monitoring</li>
            <li>• Click "Get Current Position" for a single location reading</li>
            <li>• Check the status panel to verify geolocation support and permissions</li>
            <li>• Monitor the location data table for real-time updates</li>
            <li>• Use "Stop Tracking" to end continuous monitoring</li>
            <li>• Use "Clear Locations" to reset the data table</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 