'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserRegistration from '@/components/UserRegistration';

interface UserRegistrationData {
  email: string;
  name: string;
  agreeToTerms: boolean;
}

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegistration = async (data: UserRegistrationData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create user account
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          consent_settings: {
            location_tracking: false,
            motion_sensors: false,
            data_sharing: false,
            analytics: false,
            notifications: false
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const result = await response.json();
      
      // Redirect to onboarding to set up consent and profile
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-2">
              Create Your Account
            </h1>
            <p className="text-gray-600">
              Join us in making public transport more accessible for everyone
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error-800">
                    Error creating account
                  </h3>
                  <div className="mt-2 text-sm text-error-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <UserRegistration 
              onSubmit={handleRegistration}
              isLoading={isSubmitting}
            />
          </div>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-500 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-500 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 