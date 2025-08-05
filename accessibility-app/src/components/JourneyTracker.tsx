'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { locationService } from '@/lib/locationService';
import { LocationData, LocationError, LocationStatus } from '@/types';

interface JourneyTrackerProps {
  onJourneyStart?: (journeyId: string) => void;
  onJourneyStop?: (journeyId: string) => void;
}

interface JourneyStatus {
  isTracking: boolean;
  journeyId: string | null;
  startTime: Date | null;
  duration: number; // in seconds
  locationCount: number;
  lastLocation: { lat: number; lng: number } | null;
  locationAccuracy: number | null;
  locationError: string | null;
  batteryLevel: number | null;
  isLocationPermissionGranted: boolean;
}

export default function JourneyTracker({ onJourneyStart, onJourneyStop }: JourneyTrackerProps) {
  const [status, setStatus] = useState<JourneyStatus>({
    isTracking: false,
    journeyId: null,
    startTime: null,
    duration: 0,
    locationCount: 0,
    lastLocation: null,
    locationAccuracy: null,
    locationError: null,
    batteryLevel: null,
    isLocationPermissionGranted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Initialize location service
  useEffect(() => {
    // Set up location service callbacks
    locationService.setCallbacks(
      handleLocationUpdate,
      handleLocationError,
      handleLocationStatusChange
    );

    // Check initial permission
    locationService.checkPermission();

    // Cleanup on unmount
    return () => {
      locationService.destroy();
    };
  }, []);

  // Update duration timer when tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status.isTracking && status.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - status.startTime!.getTime()) / 1000);
        setStatus(prev => ({ ...prev, duration }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status.isTracking, status.startTime]);

  const handleLocationUpdate = (locationData: LocationData) => {
    setStatus(prev => ({
      ...prev,
      lastLocation: { lat: locationData.latitude, lng: locationData.longitude },
      locationAccuracy: locationData.accuracy,
      locationCount: prev.locationCount + 1,
      locationError: null
    }));

    // Send to API
    sendLocationToAPI(locationData);
  };

  const handleLocationError = (locationError: LocationError) => {
    setStatus(prev => ({
      ...prev,
      locationError: locationError.message
    }));
  };

  const handleLocationStatusChange = (locationStatus: LocationStatus) => {
    setStatus(prev => ({
      ...prev,
      isLocationPermissionGranted: locationStatus.permissionGranted,
      batteryLevel: locationStatus.batteryLevel,
      locationError: locationStatus.error?.message || null
    }));
  };

  const sendLocationToAPI = async (locationData: LocationData) => {
    if (!status.journeyId) return;

    try {
      const response = await fetch(`/api/journeys/${status.journeyId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed: locationData.speed,
          heading: locationData.heading,
          sensor_data: {
            timestamp: locationData.timestamp,
            battery_level: status.batteryLevel
          }
        }),
      });

      if (!response.ok) {
        console.error('Failed to send location to API');
      }
    } catch (error) {
      console.error('Error sending location to API:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartJourney = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Start location tracking
      const trackingStarted = await locationService.startTracking();
      if (!trackingStarted) {
        throw new Error('Failed to start location tracking. Please check location permissions.');
      }

      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user_1', // TODO: Get from auth context
          start_time: new Date().toISOString(),
          status: 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start journey');
      }

      const data = await response.json();
      const journeyId = data.data.id;
      const startTime = new Date();

      setStatus(prev => ({
        ...prev,
        isTracking: true,
        journeyId,
        startTime,
        duration: 0,
        locationCount: 0,
        lastLocation: null,
        locationError: null
      }));

      onJourneyStart?.(journeyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start journey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopJourney = async () => {
    if (!status.journeyId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Stop location tracking
      locationService.stopTracking();

      const response = await fetch(`/api/journeys/${status.journeyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_time: new Date().toISOString(),
          status: 'completed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to stop journey');
      }

      setStatus(prev => ({
        ...prev,
        isTracking: false,
        journeyId: null,
        startTime: null,
        duration: 0,
        locationCount: 0,
        lastLocation: null,
        locationError: null
      }));

      onJourneyStop?.(status.journeyId);
      
      // Redirect to journey summary or dashboard
      router.push(`/journeys/${status.journeyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop journey');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
        <h2 className="text-xl font-semibold text-white">Journey Tracker</h2>
        <p className="text-primary-100 text-sm mt-1">
          Track your accessibility journey
        </p>
      </div>

      {/* Status Display */}
      <div className="p-6">
        {/* Tracking Status */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              status.isTracking 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-gray-300'
            }`} />
            <span className="font-medium text-gray-700">
              {status.isTracking ? 'Tracking Active' : 'Not Tracking'}
            </span>
          </div>
          {status.isTracking && (
            <div className="text-sm text-gray-500">
              ID: {status.journeyId?.slice(-8)}
            </div>
          )}
        </div>

        {/* Location Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Location Status</span>
            <div className={`w-2 h-2 rounded-full ${
              status.isLocationPermissionGranted ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          
          {status.locationError ? (
            <div className="text-xs text-red-600">{status.locationError}</div>
          ) : status.lastLocation ? (
            <div className="text-xs text-gray-600">
              Lat: {status.lastLocation.lat.toFixed(6)}, Lng: {status.lastLocation.lng.toFixed(6)}
              {status.locationAccuracy && ` (Accuracy: ${Math.round(status.locationAccuracy)}m)`}
            </div>
          ) : (
            <div className="text-xs text-gray-500">No location data</div>
          )}
        </div>

        {/* Duration Display */}
        {status.isTracking && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-primary-600">
                {formatDuration(status.duration)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Duration</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  {status.locationCount}
                </div>
                <div className="text-xs text-gray-500">Locations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  {status.lastLocation ? '✓' : '—'}
                </div>
                <div className="text-xs text-gray-500">GPS</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  {status.batteryLevel ? `${Math.round(status.batteryLevel)}%` : '—'}
                </div>
                <div className="text-xs text-gray-500">Battery</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!status.isTracking ? (
            <button
              onClick={handleStartJourney}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Start Journey
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStopJourney}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Stopping...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop Journey
                </>
              )}
            </button>
          )}

          {/* Emergency Stop */}
          {status.isTracking && (
            <button
              onClick={handleStopJourney}
              disabled={isLoading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm"
            >
              Emergency Stop
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tap "Start Journey" to begin tracking</li>
            <li>• Keep the app open for accurate tracking</li>
            <li>• Tap "Stop Journey" when you reach your destination</li>
            <li>• Use "Emergency Stop" if you need to stop quickly</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 