'use client';

import { useState, useEffect, useCallback } from 'react';

interface DepositRequirementBannerProps {
  auctionId: string;
  onAuthorizeClick?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface DepositStatus {
  is_authorized: boolean;
  payment_intent_id?: string;
  amount_cad?: number;
  status?: string;
}

export default function DepositRequirementBanner({ 
  auctionId, 
  onAuthorizeClick,
  onDismiss,
  className = ""
}: DepositRequirementBannerProps) {
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [estimatedAmount, setEstimatedAmount] = useState<number | null>(null);

  const checkDepositStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setDepositStatus(null);
          return;
        }
        throw new Error('Failed to check deposit status');
      }

      const status = await response.json();
      setDepositStatus(status);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setDepositStatus(null);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  const fetchEstimatedAmount = useCallback(async () => {
    try {
      // This would typically come from auction details or a separate endpoint
      // For now, we'll simulate getting the estimated deposit amount
      const response = await fetch(`/api/auctions/${auctionId}/deposit-estimate`);
      if (response.ok) {
        const data = await response.json();
        setEstimatedAmount(data.estimated_amount);
      }
    } catch (error) {
      console.error('Error fetching estimated deposit amount:', error);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatus();
    void fetchEstimatedAmount();
  }, [checkDepositStatus, fetchEstimatedAmount]);

  // fetchEstimatedAmount defined above with useCallback

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Don't show if loading, dismissed, or deposit is already authorized
  if (loading || dismissed || depositStatus?.is_authorized || !depositStatus) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Deposit Required to Bid
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              You need to authorize a deposit before you can place bids on this auction.
              {estimatedAmount && (
                <span className="font-medium">
                  {' '}Estimated deposit: ${estimatedAmount.toFixed(2)} CAD
                </span>
              )}
            </p>
            <p className="mt-1 text-xs">
              The deposit will be authorized (not charged) and only captured if you win the auction.
              If you don&apos;t win, the deposit will be automatically cancelled.
            </p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={onAuthorizeClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Authorize Deposit
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="ml-6 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function DepositRequirementBannerCompact({ 
  auctionId, 
  onAuthorizeClick,
  className = ""
}: { 
  auctionId: string; 
  onAuthorizeClick?: () => void;
  className?: string;
}) {
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkDepositStatusCompact = useCallback(async () => {
    try {
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      if (response.ok) {
        const status = await response.json();
        setDepositStatus(status);
      }
    } catch (error) {
      console.error('Error checking deposit status:', error);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatusCompact();
  }, [checkDepositStatusCompact]);

  if (loading || depositStatus?.is_authorized || !depositStatus) {
    return null;
  }

  return (
    <div className={`bg-yellow-100 border border-yellow-300 rounded-md p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-4 w-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-yellow-800">
            Deposit required to bid
          </span>
        </div>
        <button
          onClick={onAuthorizeClick}
          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          Authorize
        </button>
      </div>
    </div>
  );
}
