'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';

interface ConsentSettings {
  location_tracking: boolean;
  motion_sensors: boolean;
  data_sharing: boolean;
  analytics: boolean;
  notifications: boolean;
}

export default function OnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOnboardingComplete = async (consent: ConsentSettings) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save consent settings to the database
      const response = await fetch('/api/users/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consent_settings: consent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save consent settings');
      }

      // Redirect to profile page to complete setup
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingFlow onComplete={handleOnboardingComplete} />
      
      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-error-800">
                  Error Saving Settings
                </h3>
              </div>
            </div>
            <div className="text-sm text-error-700 mb-4">
              {error}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-gray-700">Saving your settings...</span>
          </div>
        </div>
      )}
    </>
  );
} 