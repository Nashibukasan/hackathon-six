'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

interface FilterOptions {
  dateRange: { start: Date; end: Date };
  transportModes: string[];
  accessibilityScoreRange: { min: number; max: number };
  showAnomalies: boolean;
  showInsights: boolean;
}

interface JourneyData {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  metadata: any;
}

interface DashboardData {
  stats: {
    totalJourneys: number;
    totalDistance: number;
    totalDuration: number;
    avgAccessibilityScore: number;
    anomalyCount: number;
    insightCount: number;
  };
  journeys: JourneyData[];
}

export default function AccessibilityDashboard() {
  const { currentUser } = useUser();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<JourneyData | null>(null);
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

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, filters]);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/dashboard?userId=${currentUser.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      } else {
        console.error('Error loading dashboard data:', data.error);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
                  onClick={loadDashboardData}
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
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.stats.totalJourneys || 0}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{formatDistance(dashboardData?.stats.totalDistance || 0)}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{formatDuration(dashboardData?.stats.totalDuration || 0)}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.stats.avgAccessibilityScore || 0}/100</p>
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
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.stats.anomalyCount || 0}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{dashboardData?.stats.insightCount || 0}</p>
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
                {dashboardData?.journeys.map((journey) => (
                  <div
                    key={journey.id}
                    className={`p-6 cursor-pointer hover:bg-gray-50 ${
                      selectedJourney?.id === journey.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {new Date(journey.startTime).toLocaleDateString()} at {new Date(journey.startTime).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Journey ID: {journey.id.slice(-8)}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {journey.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          View Details
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!dashboardData || dashboardData.journeys.length === 0) && (
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
                        Journey ID: {selectedJourney.id}
                      </p>
                      <p className="text-sm text-gray-900">
                        Start Time: {new Date(selectedJourney.startTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-900">
                        End Time: {selectedJourney.endTime ? new Date(selectedJourney.endTime).toLocaleString() : 'Not ended'}
                      </p>
                      <p className="text-sm text-gray-900">
                        Status: {selectedJourney.status}
                      </p>
                    </div>
                  </div>

                  {selectedJourney.metadata && Object.keys(selectedJourney.metadata).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Metadata</h4>
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <pre className="text-xs text-gray-700 overflow-auto">
                          {JSON.stringify(selectedJourney.metadata, null, 2)}
                        </pre>
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