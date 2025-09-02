'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';

interface DepositAuthorizationProps {
  auctionId: string;
  onSuccess?: (result: DepositAuthorizationResult) => void;
  onError?: (error: string) => void;
}

interface DepositAuthorizationResult {
  success: boolean;
  payment_intent_id?: string;
  client_secret?: string;
  amount_cad?: number;
  status?: string;
  requires_action?: boolean;
}

interface DepositStatus {
  is_authorized: boolean;
  payment_intent_id?: string;
  amount_cad?: number;
  status?: string;
}

export default function DepositAuthorization({ 
  auctionId, 
  onSuccess, 
  onError 
}: DepositAuthorizationProps) {
  const [loading, setLoading] = useState(false);
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check deposit status on component mount
  const checkDepositStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check deposit status');
      }

      const status = await response.json();
      setDepositStatus(status);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setError('Failed to check deposit status');
    } finally {
      setStatusLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatus();
  }, [checkDepositStatus]);

  const authorizeDeposit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/deposits/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auction_id: auctionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to authorize deposit');
      }

      if (result.requires_action && result.client_secret) {
        // Handle 3D Secure or other authentication
        await handlePaymentAction(result.client_secret);
      } else {
        // Deposit authorized successfully
        setDepositStatus({
          is_authorized: true,
          payment_intent_id: result.payment_intent_id,
          amount_cad: result.amount_cad,
          status: result.status
        });
        
        onSuccess?.(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to authorize deposit';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (clientSecret: string) => {
    try {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const result = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/auctions/${auctionId}`,
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // If no error, result.paymentIntent should be available
  const paymentIntent = (result as unknown as { paymentIntent?: { id?: string; status?: string } }).paymentIntent;
  if (paymentIntent?.status === 'requires_capture') {
        // Payment authorized successfully
        setDepositStatus({
          is_authorized: true,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status
        });
        
        onSuccess?.({
          success: true,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment authentication failed';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Checking deposit status...</span>
      </div>
    );
  }

  if (depositStatus?.is_authorized) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Deposit Authorized
            </h3>
            <div className="mt-1 text-sm text-green-700">
              {depositStatus.amount_cad && (
                <p>Amount: ${depositStatus.amount_cad.toFixed(2)} CAD</p>
              )}
              <p>You can now place bids on this auction.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Deposit Authorization Required
          </h3>
          <div className="mt-1 text-sm text-yellow-700">
            <p>You need to authorize a deposit before you can bid on this auction.</p>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="mt-3">
            <button
              onClick={authorizeDeposit}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authorizing...
                </>
              ) : (
                'Authorize Deposit'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
