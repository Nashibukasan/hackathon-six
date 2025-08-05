'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AccessibilityProfileForm from '@/components/AccessibilityProfileForm';
import { AccessibilityProfile } from '@/types';

export default function ProfilePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleProfileSubmit = async (profile: AccessibilityProfile) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // In a real app, this would save to the database
      // For now, we'll just simulate the API call
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com', // This would come from user input
          accessibility_profile: profile,
          consent_settings: {
            location_tracking: true,
            motion_sensors: true,
            data_sharing: true,
            analytics: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Redirect to tracking page
      router.push('/track');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary-900 mb-4">
              Create Your Accessibility Profile
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Help us understand your accessibility needs so we can provide better transport tracking and insights.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-8 bg-error-50 border border-error-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error-800">
                    Error saving profile
                  </h3>
                  <div className="mt-2 text-sm text-error-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <AccessibilityProfileForm 
              onSubmit={handleProfileSubmit}
            />
          </div>

          {/* Loading overlay */}
          {isSubmitting && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="text-gray-700">Saving your profile...</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              Your privacy is important to us. All data is anonymized and used only to improve transport accessibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 