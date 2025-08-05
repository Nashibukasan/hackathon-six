'use client';

import React, { useState, useEffect } from 'react';
import { journeyAnalysisService, JourneyAnalysis } from '@/lib/journeyAnalysis';
import { getDatabase } from '@/lib/database';

interface DashboardProps {
  userId?: string;
}

interface FilterOptions {
  dateRange: { start: Date; end: Date };
  transportModes: string[];
  accessibilityScoreRange: { min: number; max: number };
  showAnomalies: boolean;
  showInsights: boolean;
}

export default function AccessibilityDashboard({ userId }: DashboardProps) {
  const [journeys, setJourneys] = useState<JourneyAnalysis[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<JourneyAnalysis | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    transportModes: [],
    accessibilityScoreRange: { min: 0, max: 100 },
    showAnomalies: true,
    showInsights: true
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJourneys: 0,
    totalDistance: 0,
    totalDuration: 0,
    avgAccessibilityScore: 0,
    anomalyCount: 0,
    insightCount: 0
  });

  useEffect(() => {
    loadJourneys();
  }, [userId, filters]);

  useEffect(() => {
    if (journeys.length > 0) {
      calculateStats();
    }
  }, [journeys]);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const db = getDatabase();
      
      // Get all journeys for the user and filter by date range
      const allJourneys = db.getJourneysByUserId(userId || 'demo');
      const journeyRows = allJourneys.filter(journey => 
        journey.status === 'completed' &&
        new Date(journey.started_at) >= filters.dateRange.start &&
        new Date(journey.started_at) <= filters.dateRange.end
      );

      const journeyAnalyses: JourneyAnalysis[] = [];
      
      for (const journeyRow of journeyRows) {
        try {
          // Check if analysis data exists in metadata
          const analysisData = journeyRow.metadata?.analysis_data;
          if (analysisData) {
            const locationPoints = getLocationPoints(journeyRow.id);
            
            journeyAnalyses.push({
              journeyId: journeyRow.id,
              userId: journeyRow.user_id,
              startTime: new Date(journeyRow.started_at),
              endTime: journeyRow.ended_at ? new Date(journeyRow.ended_at) : new Date(),
              totalDistance: calculateTotalDistance(locationPoints),
              totalDuration: journeyRow.ended_at ? 
                (new Date(journeyRow.ended_at).getTime() - new Date(journeyRow.started_at).getTime()) / 1000 : 0,
              transportSegments: getTransportSegments(journeyRow.id),
              accessibilityScore: analysisData.accessibilityScore || 0,
              anomalies: analysisData.anomalies || [],
              insights: analysisData.insights || [],
              mapMatchedRoute: []
            });
          } else {
            const analysis = await journeyAnalysisService.analyzeJourney(journeyRow.id);
            journeyAnalyses.push(analysis);
          }
        } catch (error) {
          console.error(`Error loading journey ${journeyRow.id}:`, error);
        }
      }

      let filteredJourneys = journeyAnalyses;
      
      if (filters.transportModes.length > 0) {
        filteredJourneys = filteredJourneys.filter(journey =>
          journey.transportSegments.some(segment =>
            filters.transportModes.includes(segment.transportMode)
          )
        );
      }

      filteredJourneys = filteredJourneys.filter(journey =>
        journey.accessibilityScore >= filters.accessibilityScoreRange.min &&
        journey.accessibilityScore <= filters.accessibilityScoreRange.max
      );

      setJourneys(filteredJourneys);
    } catch (error) {
      console.error('Error loading journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationPoints = (journeyId: string) => {
    const db = getDatabase();
    return db.getLocationPointsByJourneyId(journeyId);
  };

  const getTransportSegments = (journeyId: string) => {
    const db = getDatabase();
    const segments = db.getTransportSegmentsByJourneyId(journeyId);
    
    return segments.map(segment => ({
      id: segment.id,
      startTime: new Date(segment.start_time),
      endTime: new Date(segment.end_time),
      transportMode: segment.transport_mode,
      confidence: segment.confidence,
      distance: 0, // Calculate from location points if needed
      duration: (new Date(segment.end_time).getTime() - new Date(segment.start_time).getTime()) / 1000,
      accessibilityScore: segment.accessibility_score || 0,
      gtfsTripId: segment.gtfs_trip_id,
      gtfsRouteId: undefined,
      gtfsStopId: undefined
    }));
  };

  const calculateTotalDistance = (points: any[]): number => {
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      distance += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }
    return distance;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateStats = () => {
    const totalJourneys = journeys.length;
    const totalDistance = journeys.reduce((sum, j) => sum + j.totalDistance, 0);
    const totalDuration = journeys.reduce((sum, j) => sum + j.totalDuration, 0);
    const avgAccessibilityScore = journeys.length > 0 
      ? journeys.reduce((sum, j) => sum + j.accessibilityScore, 0) / journeys.length 
      : 0;
    const anomalyCount = journeys.reduce((sum, j) => sum + j.anomalies.length, 0);
    const insightCount = journeys.reduce((sum, j) => sum + j.insights.length, 0);

    setStats({
      totalJourneys,
      totalDistance,
      totalDuration,
      avgAccessibilityScore: Math.round(avgAccessibilityScore),
      anomalyCount,
      insightCount
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const getAccessibilityScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accessibility Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track and analyze your transport accessibility
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadJourneys}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Journeys</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalJourneys}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Distance</p>
                <p className="text-2xl font-semibold text-gray-900">{formatDistance(stats.totalDistance)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Duration</p>
                <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats.totalDuration)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Accessibility</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.avgAccessibilityScore}/100</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Anomalies</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.anomalyCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Insights</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.insightCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Journey List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Journey History</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {journeys.map((journey) => (
                  <div
                    key={journey.journeyId}
                    className={`p-6 cursor-pointer hover:bg-gray-50 ${
                      selectedJourney?.journeyId === journey.journeyId ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {journey.startTime.toLocaleDateString()} at {journey.startTime.toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDistance(journey.totalDistance)} • {formatDuration(journey.totalDuration)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {journey.transportSegments.map((segment) => (
                            <span
                              key={segment.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {segment.transportMode} ({formatDuration(segment.duration)})
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            journey.accessibilityScore >= 80
                              ? 'bg-green-100 text-green-800'
                              : journey.accessibilityScore >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {journey.accessibilityScore}/100
                        </div>
                        {journey.anomalies.length > 0 && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              {journey.anomalies.length} issues
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {journeys.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No journeys found for the selected filters
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters and Details */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accessibility Score Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.accessibilityScoreRange.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        accessibilityScoreRange: { ...prev.accessibilityScoreRange, min: parseInt(e.target.value) }
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.accessibilityScoreRange.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        accessibilityScoreRange: { ...prev.accessibilityScoreRange, max: parseInt(e.target.value) }
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showAnomalies}
                      onChange={(e) => setFilters(prev => ({ ...prev, showAnomalies: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Anomalies</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.showInsights}
                      onChange={(e) => setFilters(prev => ({ ...prev, showInsights: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Insights</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Selected Journey Details */}
            {selectedJourney && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Journey Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Overview</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-900">
                        Distance: {formatDistance(selectedJourney.totalDistance)}
                      </p>
                      <p className="text-sm text-gray-900">
                        Duration: {formatDuration(selectedJourney.totalDuration)}
                      </p>
                      <p className={`text-sm font-medium ${getAccessibilityScoreColor(selectedJourney.accessibilityScore)}`}>
                        Accessibility: {selectedJourney.accessibilityScore}/100
                      </p>
                    </div>
                  </div>

                  {filters.showAnomalies && selectedJourney.anomalies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Anomalies</h4>
                      <div className="mt-2 space-y-2">
                        {selectedJourney.anomalies.map((anomaly, index) => (
                          <div key={index} className="text-sm p-2 bg-red-50 rounded">
                            <p className="text-red-800 font-medium">{anomaly.description}</p>
                            <p className="text-xs text-red-600 mt-1">
                              {anomaly.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filters.showInsights && selectedJourney.insights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Insights</h4>
                      <div className="mt-2 space-y-2">
                        {selectedJourney.insights.map((insight, index) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                            <p className="text-blue-800 font-medium">{insight.title}</p>
                            <p className="text-xs text-blue-600 mt-1">{insight.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 