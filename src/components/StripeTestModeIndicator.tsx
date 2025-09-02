'use client';

import { useEffect, useState } from 'react';
import { getStripeTestModeInfo } from '@/lib/stripe';

interface StripeTestModeInfo {
  isTestMode: boolean;
  message: string;
  badgeColor: string;
}

export default function StripeTestModeIndicator() {
  const [testModeInfo, setTestModeInfo] = useState<StripeTestModeInfo | null>(null);

  useEffect(() => {
    // Only show the indicator if we have Stripe keys configured
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setTestModeInfo(getStripeTestModeInfo());
    }
  }, []);

  // Don't render anything if Stripe is not configured or in production
  if (!testModeInfo || (!testModeInfo.isTestMode && process.env.NODE_ENV === 'production')) {
    return null;
  }

  const badgeClasses = testModeInfo.isTestMode
    ? 'bg-orange-100 text-orange-800 border-orange-200'
    : 'bg-green-100 text-green-800 border-green-200';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
          ${badgeClasses}
          shadow-sm
        `}
        title={testModeInfo.message}
      >
        <div
          className={`
            w-2 h-2 rounded-full mr-2
            ${testModeInfo.isTestMode ? 'bg-orange-400' : 'bg-green-400'}
          `}
        />
        {testModeInfo.isTestMode ? 'Stripe Test Mode' : 'Stripe Live Mode'}
      </div>
    </div>
  );
}

// Alternative inline component for use within forms/checkout flows
export function InlineStripeTestModeIndicator({ className = '' }: { className?: string }) {
  const [testModeInfo, setTestModeInfo] = useState<StripeTestModeInfo | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setTestModeInfo(getStripeTestModeInfo());
    }
  }, []);

  if (!testModeInfo?.isTestMode) {
    return null;
  }

  return (
    <div className={`flex items-center text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-md border border-orange-200 ${className}`}>
      <svg
        className="w-4 h-4 mr-2 text-orange-500"
        fill="currentColor"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">Test Mode:</span>
      <span className="ml-1">No real payments will be processed</span>
    </div>
  );
}

// Hook for accessing Stripe test mode info in components
export function useStripeTestMode() {
  const [testModeInfo, setTestModeInfo] = useState<StripeTestModeInfo | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setTestModeInfo(getStripeTestModeInfo());
    }
  }, []);

  return testModeInfo;
}
