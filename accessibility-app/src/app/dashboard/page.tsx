'use client';

import React, { useState } from 'react';
import AccessibilityDashboard from '@/components/AccessibilityDashboard';
import { useUser } from '@/contexts/UserContext';

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  includePersonalData: boolean;
  anonymizeData: boolean;
  includeAnalysis: boolean;
  includeAnomalies: boolean;
  includeInsights: boolean;
}

export default function DashboardPage() {
  const { currentUser } = useUser();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    },
    includePersonalData: false,
    anonymizeData: true,
    includeAnalysis: true,
    includeAnomalies: true,
    includeInsights: true
  });
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const handleExport = async () => {
    if (!currentUser) {
      setExportMessage('Please log in to export data.');
      return;
    }

    try {
      setExporting(true);
      setExportMessage('Exporting data...');
      
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          exportOptions: {
            ...exportOptions,
            dateRange: {
              start: exportOptions.dateRange.start.toISOString(),
              end: exportOptions.dateRange.end.toISOString()
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const result = await response.json();
      
      if (result.success) {
        // Create download link
        const blob = new Blob([result.data.data], { type: result.data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportMessage(`Successfully exported ${result.data.recordCount} records to ${result.data.filename}`);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportMessage('Error exporting data. Please try again.');
    } finally {
      setExporting(false);
    }
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
                Analyze your transport accessibility data and generate insights
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export Data'}
              </button>
            </div>
          </div>
          
          {exportMessage && (
            <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">{exportMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ 
                  ...prev, 
                  format: e.target.value as 'csv' | 'json' | 'pdf' 
                }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range Start
              </label>
              <input
                type="date"
                value={exportOptions.dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: new Date(e.target.value) }
                }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range End
              </label>
              <input
                type="date"
                value={exportOptions.dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: new Date(e.target.value) }
                }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.anonymizeData}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    anonymizeData: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Anonymize Data</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includePersonalData}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    includePersonalData: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Include Personal Data</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalysis}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    includeAnalysis: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Include Analysis</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      <AccessibilityDashboard />
    </div>
  );
} 