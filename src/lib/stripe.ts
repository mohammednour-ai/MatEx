import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance (for API routes)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

// Client-side Stripe instance (for frontend)
let stripePromise: Promise<import('@stripe/stripe-js').Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Stripe configuration and utilities
export const stripeConfig = {
  // Check if we're in test mode
  isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false,
  
  // Currency configuration
  currency: 'cad' as const,
  
  // Minimum charge amount in cents (CAD)
  minimumChargeAmount: 50, // $0.50 CAD
  
  // Maximum charge amount in cents (CAD) 
  maximumChargeAmount: 99999999, // $999,999.99 CAD
  
  // Default payment method types
  paymentMethodTypes: ['card'] as const,
  
  // Webhook endpoint secret
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

// Utility functions
export const formatAmountForStripe = (amount: number): number => {
  // Convert dollars to cents and ensure it's an integer
  return Math.round(amount * 100);
};

export const formatAmountFromStripe = (amount: number): number => {
  // Convert cents to dollars
  return amount / 100;
};

export const validateStripeAmount = (amount: number): boolean => {
  const amountInCents = formatAmountForStripe(amount);
  return amountInCents >= stripeConfig.minimumChargeAmount && 
         amountInCents <= stripeConfig.maximumChargeAmount;
};

// Environment validation
export const validateStripeConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push('STRIPE_SECRET_KEY is required');
  }
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required for webhook verification');
  }
  
  // Validate key format
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must start with sk_');
  }
  
  if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && 
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_');
  }
  
  // Check if keys match environment (both test or both live)
  const secretKeyIsTest = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
  const publishableKeyIsTest = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');
  
  if (secretKeyIsTest !== publishableKeyIsTest) {
    errors.push('Stripe secret and publishable keys must both be test keys or both be live keys');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Test mode indicator for UI
export const getStripeTestModeInfo = () => {
  return {
    isTestMode: stripeConfig.isTestMode,
    message: stripeConfig.isTestMode 
      ? 'Test Mode - No real payments will be processed' 
      : 'Live Mode - Real payments will be processed',
    badgeColor: stripeConfig.isTestMode ? 'orange' : 'green',
  };
};

// Common Stripe error handling
export const handleStripeError = (error: unknown): { message: string; code?: string } => {
  // Handle Stripe errors
  if (error && typeof error === 'object' && 'type' in error) {
    const stripeError = error as { type: string; message?: string; code?: string };
    
    switch (stripeError.type) {
      case 'card_error':
        return {
          message: stripeError.message || 'Your card was declined.',
          code: stripeError.code || 'card_error'
        };
      case 'rate_limit_error':
        return {
          message: 'Too many requests made to the API too quickly.',
          code: 'rate_limit'
        };
      case 'invalid_request_error':
        return {
          message: 'Invalid parameters were supplied to Stripe\'s API.',
          code: 'invalid_request'
        };
      case 'api_error':
        return {
          message: 'An error occurred with Stripe\'s API.',
          code: 'api_error'
        };
      case 'connection_error':
        return {
          message: 'A network error occurred.',
          code: 'connection_error'
        };
      case 'authentication_error':
        return {
          message: 'Authentication with Stripe\'s API failed.',
          code: 'authentication_error'
        };
      default:
        return {
          message: stripeError.message || 'An unexpected error occurred.',
          code: stripeError.code || 'unknown_error'
        };
    }
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'generic_error'
    };
  }
  
  return {
    message: 'An unexpected error occurred.',
    code: 'unknown_error'
  };
};

// Log Stripe configuration on startup (server-side only)
if (typeof window === 'undefined') {
  const config = validateStripeConfig();
  if (config.isValid) {
    console.log(`✅ Stripe configured in ${stripeConfig.isTestMode ? 'TEST' : 'LIVE'} mode`);
  } else {
    console.error('❌ Stripe configuration errors:', config.errors);
  }
}
