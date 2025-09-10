import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Validate key prefix for environment safety
const isTestKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
const isLiveKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');

if (!isTestKey && !isLiveKey) {
  throw new Error('Invalid Stripe secret key format');
}

// Warn if using live key in development
if (isLiveKey && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  WARNING: Using live Stripe key in non-production environment');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Export test mode indicator
export const isTestMode = isTestKey;

// Helper function to format amounts for Stripe (convert to cents)
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount * 100);
}

// Helper function to format amounts from Stripe (convert from cents)
export function formatAmountFromStripe(amount: number): number {
  return amount / 100;
}

// Helper function to create idempotency key
export function createIdempotencyKey(prefix: string, id: string): string {
  return `${prefix}_${id}_${Date.now()}`;
}
