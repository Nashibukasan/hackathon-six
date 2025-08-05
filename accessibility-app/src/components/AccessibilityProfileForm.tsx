'use client';

import { useState } from 'react';
import { AccessibilityProfile, PrimaryProfile, SpecificNeeds } from '@/types';

interface AccessibilityProfileFormProps {
  onSubmit: (profile: AccessibilityProfile) => void;
  initialData?: AccessibilityProfile;
}

const PRIMARY_PROFILES: { value: PrimaryProfile; label: string; description: string; icon: string }[] = [
  {
    value: 'wheelchair',
    label: 'Wheelchair User',
    description: 'Manual or powered wheelchair user',
    icon: '🦽'
  },
  {
    value: 'ambulatory',
    label: 'Ambulatory',
    description: 'Walking with mobility aids or assistance',
    icon: '🦯'
  },
  {
    value: 'blind',
    label: 'Blind',
    description: 'No or very limited vision',
    icon: '👁️'
  },
  {
    value: 'deaf',
    label: 'Deaf',
    description: 'No or very limited hearing',
    icon: '👂'
  },
  {
    value: 'neurodivergent',
    label: 'Neurodivergent',
    description: 'Autism, ADHD, or other neurodivergent conditions',
    icon: '🧠'
  },
  {
    value: 'assistance_animal',
    label: 'Assistance Animal',
    description: 'Guide dog, service animal, or emotional support animal',
    icon: '🐕'
  }
];

export default function AccessibilityProfileForm({ onSubmit, initialData }: AccessibilityProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<AccessibilityProfile>(
    initialData || {
      level1: 'wheelchair',
      level2: {}
    }
  );

  const handlePrimaryProfileSelect = (primaryProfile: PrimaryProfile) => {
    setProfile(prev => ({
      ...prev,
      level1: primaryProfile,
      level2: {} // Reset level 2 when level 1 changes
    }));
  };

  const handleLevel2Change = (field: keyof SpecificNeeds, value: any) => {
    setProfile(prev => ({
      ...prev,
      level2: {
        ...prev.level2,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(profile);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Primary Accessibility Profile
        </h2>
        <p className="text-gray-600">
          Please select the primary accessibility profile that best describes your needs.
        </p>
      </div>

      <div className="grid gap-4">
        {PRIMARY_PROFILES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePrimaryProfileSelect(option.value)}
            className={`p-4 border-2 rounded-lg text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              profile.level1 === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            aria-pressed={profile.level1 === option.value}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl" role="img" aria-label={option.label}>
                {option.icon}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">{option.label}</h3>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const specificNeeds = getSpecificNeedsForProfile(profile.level1);
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Specific Needs
          </h2>
          <p className="text-gray-600">
            Please provide additional details about your specific accessibility needs.
          </p>
        </div>

        <div className="space-y-6">
          {specificNeeds.map((need) => (
            <div key={need.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {need.label}
              </label>
              {need.type === 'boolean' && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={need.key}
                    checked={profile.level2[need.key] as boolean || false}
                    onChange={(e) => handleLevel2Change(need.key, e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">{need.description}</span>
                </div>
              )}
              {need.type === 'number' && (
                <input
                  type="number"
                  id={need.key}
                  value={profile.level2[need.key] as number || ''}
                  onChange={(e) => handleLevel2Change(need.key, parseFloat(e.target.value) || undefined)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder={need.placeholder}
                  min={need.min}
                  max={need.max}
                  step={need.step}
                />
              )}
              {need.type === 'select' && (
                <select
                  id={need.key}
                  value={profile.level2[need.key] as string || ''}
                  onChange={(e) => handleLevel2Change(need.key, e.target.value || undefined)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select an option</option>
                  {need.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Your Profile
        </h2>
        <p className="text-gray-600">
          Please review your accessibility profile before submitting.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Primary Profile</h3>
          <p className="text-gray-700">
            {PRIMARY_PROFILES.find(p => p.value === profile.level1)?.label}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Specific Needs</h3>
          <div className="space-y-2">
            {Object.entries(profile.level2).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{getFieldLabel(key)}:</span>
                <span className="text-gray-900 font-medium">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                </span>
              </div>
            ))}
            {Object.keys(profile.level2).length === 0 && (
              <p className="text-gray-500 italic">No specific needs selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  aria-current={step === currentStep ? 'step' : undefined}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600">
              Step {currentStep} of 3
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!profile.level1}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-success-600 border border-transparent rounded-md hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
              >
                Submit Profile
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// Helper functions
function getSpecificNeedsForProfile(primaryProfile: PrimaryProfile) {
  const needs = [];

  switch (primaryProfile) {
    case 'wheelchair':
      needs.push(
        {
          key: 'mobility_aid_dimensions',
          label: 'Wheelchair Dimensions',
          type: 'dimensions' as const,
          description: 'Please provide your wheelchair dimensions'
        },
        {
          key: 'ramp_gradient_tolerance',
          label: 'Maximum Ramp Gradient (%)',
          type: 'number' as const,
          description: 'Maximum ramp gradient you can safely navigate',
          placeholder: '8',
          min: 1,
          max: 20,
          step: 0.5
        },
        {
          key: 'assistance_needs',
          label: 'Require Assistance',
          type: 'boolean' as const,
          description: 'Do you require assistance with boarding/alighting?'
        }
      );
      break;

    case 'ambulatory':
      needs.push(
        {
          key: 'assistance_needs',
          label: 'Require Assistance',
          type: 'boolean' as const,
          description: 'Do you require assistance when walking?'
        }
      );
      break;

    case 'blind':
      needs.push(
        {
          key: 'primary_navigation_aid',
          label: 'Primary Navigation Aid',
          type: 'select' as const,
          description: 'What is your primary navigation aid?',
          options: [
            { value: 'audio', label: 'Audio cues' },
            { value: 'tactile', label: 'Tactile guidance' },
            { value: 'screen_reader', label: 'Screen reader' }
          ]
        },
        {
          key: 'screen_reader_usage',
          label: 'Use Screen Reader',
          type: 'boolean' as const,
          description: 'Do you use a screen reader for digital interfaces?'
        }
      );
      break;

    case 'deaf':
      needs.push(
        {
          key: 'assistance_needs',
          label: 'Require Assistance',
          type: 'boolean' as const,
          description: 'Do you require assistance for communication?'
        }
      );
      break;

    case 'neurodivergent':
      needs.push(
        {
          key: 'sensory_sensitivities',
          label: 'Sensory Sensitivities',
          type: 'select' as const,
          description: 'What sensory sensitivities do you have?',
          options: [
            { value: 'light', label: 'Light sensitivity' },
            { value: 'sound', label: 'Sound sensitivity' },
            { value: 'touch', label: 'Touch sensitivity' },
            { value: 'smell', label: 'Smell sensitivity' }
          ]
        },
        {
          key: 'predictability_needs',
          label: 'Need Predictability',
          type: 'boolean' as const,
          description: 'Do you need predictable routines and schedules?'
        }
      );
      break;

    case 'assistance_animal':
      needs.push(
        {
          key: 'assistance_needs',
          label: 'Require Assistance',
          type: 'boolean' as const,
          description: 'Do you require assistance with your service animal?'
        }
      );
      break;
  }

  return needs;
}

function getFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    mobility_aid_dimensions: 'Wheelchair Dimensions',
    ramp_gradient_tolerance: 'Maximum Ramp Gradient',
    assistance_needs: 'Require Assistance',
    primary_navigation_aid: 'Primary Navigation Aid',
    screen_reader_usage: 'Use Screen Reader',
    sensory_sensitivities: 'Sensory Sensitivities',
    predictability_needs: 'Need Predictability'
  };
  return labels[key] || key;
} 