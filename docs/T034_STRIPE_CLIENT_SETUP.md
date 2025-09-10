# T034: Stripe Client Setup

## Overview
Set up Stripe payment processing infrastructure for handling deposits and payments in the MatEx platform. This includes configuring Stripe client libraries, environment variables, and creating a foundation for secure payment processing with proper test/production mode handling.

## Implementation Details

### Environment Configuration
Configure Stripe API keys and webhook secrets for both development and production environments.

### Environment Variables Setup
```bash
# .env.local (development)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# .env.production (production)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Client Library Implementation
```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  appInfo: {
    name: 'MatEx',
    version: '1.0.0',
    url: 'https://matex.ca'
  }
});

// Client-side Stripe configuration
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  options: {
    stripeAccount: undefined, // For marketplace scenarios
  }
};

// Utility functions
export const formatAmountForStripe = (amount: number, currency: string = 'cad'): number => {
  // Stripe expects amounts in cents for CAD
  return Math.round(amount * 100);
};

export const formatAmountFromStripe = (amount: number, currency: string = 'cad'): number => {
  // Convert from cents back to dollars
  return amount / 100;
};

export const isTestMode = (): boolean => {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false;
};

export const getStripeMode = (): 'test' | 'live' => {
  return isTestMode() ? 'test' : 'live';
};

// Stripe webhook signature verification
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(payload, signature, secret);
};

// Common Stripe error handling
export const handleStripeError = (error: any): { message: string; code?: string } => {
  if (error.type === 'StripeCardError') {
    return {
      message: error.message,
      code: error.code
    };
  } else if (error.type === 'StripeRateLimitError') {
    return {
      message: 'Too many requests made to the API too quickly',
      code: 'rate_limit_error'
    };
  } else if (error.type === 'StripeInvalidRequestError') {
    return {
      message: 'Invalid parameters were supplied to Stripe\'s API',
      code: 'invalid_request_error'
    };
  } else if (error.type === 'StripeAPIError') {
    return {
      message: 'An error occurred internally with Stripe\'s API',
      code: 'api_error'
    };
  } else if (error.type === 'StripeConnectionError') {
    return {
      message: 'Some kind of error occurred during the HTTPS communication',
      code: 'connection_error'
    };
  } else if (error.type === 'StripeAuthenticationError') {
    return {
      message: 'You probably used an incorrect API key',
      code: 'authentication_error'
    };
  } else {
    return {
      message: 'An unexpected error occurred',
      code: 'unknown_error'
    };
  }
};
```

### Client-Side Stripe Provider
```typescript
// src/components/StripeProvider.tsx
'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode, useMemo } from 'react';

interface StripeProviderProps {
  children: ReactNode;
  options?: {
    clientSecret?: string;
    appearance?: any;
  };
}

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export function StripeProvider({ children, options = {} }: StripeProviderProps) {
  const stripeOptions = useMemo(() => ({
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '6px',
      },
    },
    ...options,
  }), [options]);

  return (
    <Elements stripe={getStripe()} options={stripeOptions}>
      {children}
    </Elements>
  );
}
```

### Test Mode Indicator Component
```typescript
// src/components/StripeTestModeIndicator.tsx
'use client';

import { useEffect, useState } from 'react';

export function StripeTestModeIndicator() {
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    // Check if we're in test mode by examining the publishable key
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    setIsTestMode(publishableKey?.startsWith('pk_test_') || false);
  }, []);

  if (!isTestMode) return null;

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>Test Mode:</strong> You're using Stripe in test mode. No real payments will be processed.
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Stripe Configuration Validation
```typescript
// src/lib/stripe-config.ts
export interface StripeConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  mode: 'test' | 'live' | 'unknown';
}

export function validateStripeConfig(): StripeConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Check for required environment variables
  if (!secretKey) {
    errors.push('STRIPE_SECRET_KEY is not set');
  }
  
  if (!publishableKey) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
  }
  
  if (!webhookSecret) {
    warnings.push('STRIPE_WEBHOOK_SECRET is not set - webhooks will not work');
  }

  // Determine mode and validate key consistency
  let mode: 'test' | 'live' | 'unknown' = 'unknown';
  
  if (secretKey && publishableKey) {
    const secretIsTest = secretKey.startsWith('sk_test_');
    const publishableIsTest = publishableKey.startsWith('pk_test_');
    
    if (secretIsTest && publishableIsTest) {
      mode = 'test';
    } else if (!secretIsTest && !publishableIsTest) {
      mode = 'live';
    } else {
      errors.push('Stripe keys are inconsistent - secret and publishable keys must both be test or both be live');
    }
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    if (mode === 'test') {
      warnings.push('Using test keys in production environment');
    }
    
    if (!webhookSecret) {
      errors.push('STRIPE_WEBHOOK_SECRET is required in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    mode
  };
}

// Startup validation
export function logStripeConfigStatus() {
  const validation = validateStripeConfig();
  
  console.log(`🔧 Stripe Configuration Status:`);
  console.log(`   Mode: ${validation.mode}`);
  console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
  
  if (validation.errors.length > 0) {
    console.error('   Errors:');
    validation.errors.forEach(error => console.error(`     - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('   Warnings:');
    validation.warnings.forEach(warning => console.warn(`     - ${warning}`));
  }
}
```

### API Route for Stripe Configuration Check
```typescript
// src/app/api/stripe/config/route.ts
import { NextResponse } from 'next/server';
import { validateStripeConfig } from '@/lib/stripe-config';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    
    // Only allow admins to check Stripe config
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = validateStripeConfig();
    
    // Don't expose sensitive details in response
    return NextResponse.json({
      isValid: validation.isValid,
      mode: validation.mode,
      hasErrors: validation.errors.length > 0,
      hasWarnings: validation.warnings.length > 0,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length
    });
  } catch (error) {
    console.error('Error checking Stripe config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### React Hook for Stripe Status
```typescript
// src/hooks/useStripeStatus.ts
import { useState, useEffect } from 'react';

interface StripeStatus {
  isValid: boolean;
  mode: 'test' | 'live' | 'unknown';
  hasErrors: boolean;
  hasWarnings: boolean;
  loading: boolean;
}

export function useStripeStatus() {
  const [status, setStatus] = useState<StripeStatus>({
    isValid: false,
    mode: 'unknown',
    hasErrors: false,
    hasWarnings: false,
    loading: true
  });

  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const response = await fetch('/api/stripe/config');
        if (response.ok) {
          const data = await response.json();
          setStatus({
            ...data,
            loading: false
          });
        } else {
          setStatus(prev => ({ ...prev, loading: false, hasErrors: true }));
        }
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
        setStatus(prev => ({ ...prev, loading: false, hasErrors: true }));
      }
    };

    checkStripeStatus();
  }, []);

  return status;
}
```

### Admin Dashboard Stripe Status Component
```typescript
// src/components/admin/StripeStatus.tsx
import { useStripeStatus } from '@/hooks/useStripeStatus';

export function StripeStatus() {
  const status = useStripeStatus();

  if (status.loading) {
    return <div className="animate-pulse">Checking Stripe configuration...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Stripe Configuration</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            status.isValid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {status.isValid ? 'Configured' : 'Issues Found'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Mode</span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            status.mode === 'live' 
              ? 'bg-blue-100 text-blue-800' 
              : status.mode === 'test'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
          }`}>
            {status.mode.toUpperCase()}
          </span>
        </div>
        
        {status.hasErrors && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Errors</span>
            <span className="text-sm text-red-600">Configuration errors detected</span>
          </div>
        )}
        
        {status.hasWarnings && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Warnings</span>
            <span className="text-sm text-yellow-600">Configuration warnings</span>
          </div>
        )}
      </div>
      
      {status.mode === 'test' && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            Running in test mode. No real payments will be processed.
          </p>
        </div>
      )}
    </div>
  );
}
```

### Package Dependencies
```json
{
  "dependencies": {
    "stripe": "^14.7.0",
    "@stripe/stripe-js": "^2.1.11",
    "@stripe/react-stripe-js": "^2.4.0"
  }
}
```

## Files Created/Modified
- `src/lib/stripe.ts` - Core Stripe client configuration and utilities
- `src/lib/stripe-config.ts` - Configuration validation and logging
- `src/components/StripeProvider.tsx` - Client-side Stripe Elements provider
- `src/components/StripeTestModeIndicator.tsx` - Test mode warning component
- `src/app/api/stripe/config/route.ts` - Configuration check API endpoint
- `src/hooks/useStripeStatus.ts` - React hook for Stripe status
- `src/components/admin/StripeStatus.tsx` - Admin dashboard status display
- `package.json` - Added Stripe dependencies

## Technical Considerations
- **Security**: Never expose secret keys to client-side code
- **Environment Management**: Separate test and production configurations
- **Error Handling**: Comprehensive Stripe error type handling
- **Validation**: Startup validation to catch configuration issues early
- **Test Mode Indicators**: Clear visual indicators when in test mode
- **Type Safety**: Full TypeScript support for Stripe operations

## Success Metrics
- Stripe client initializes successfully in both test and production
- Configuration validation catches all setup issues
- Test mode is clearly indicated in development
- Error handling provides meaningful feedback
- Admin dashboard shows accurate Stripe status
- No sensitive keys exposed to client-side code

## Dependencies
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK
- `@stripe/react-stripe-js` - React components for Stripe
- Environment variables properly configured
- Admin authentication system
