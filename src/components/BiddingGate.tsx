'use client';

import { useState, useEffect, useCallback } from 'react';
import DepositAuthorization from './DepositAuthorization';
import { DepositStatusWithCTA } from './DepositStatusBadge';

interface BiddingGateProps {
  auctionId: string;
  children: React.ReactNode;
  className?: string;
}

interface DepositStatus {
  is_authorized: boolean;
  payment_intent_id?: string;
  amount_cad?: number;
  status?: string;
}

export default function BiddingGate({ 
  auctionId, 
  children, 
  className = "" 
}: BiddingGateProps) {
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkDepositStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          setIsAuthenticated(false);
          setDepositStatus(null);
          return;
        }
        throw new Error('Failed to check deposit status');
      }

      setIsAuthenticated(true);
      const status = await response.json();
      setDepositStatus(status);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setDepositStatus(null);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatus();
  }, [checkDepositStatus]);

  // (checkDepositStatus defined above with useCallback)

  const handleAuthorizeClick = () => {
    setShowDepositModal(true);
  };

  const handleDepositSuccess = () => {
    setShowDepositModal(false);
    // Refresh deposit status
    checkDepositStatus();
  };

  const handleDepositError = (error: string) => {
    console.error('Deposit authorization error:', error);
    // Keep modal open to allow retry
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Checking deposit status...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`${className}`}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-blue-900">Sign in to bid</h3>
            <p className="mt-1 text-sm text-blue-700">
              You need to be signed in to place bids on auctions.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  // This would typically redirect to sign in page
                  window.location.href = '/auth/signin';
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show deposit authorization requirement
  if (depositStatus && !depositStatus.is_authorized) {
    return (
      <div className={`${className}`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-yellow-900">Deposit Authorization Required</h3>
            <p className="mt-1 text-sm text-yellow-700">
              You need to authorize a deposit before you can place bids on this auction.
            </p>
            <p className="mt-2 text-xs text-yellow-600">
              The deposit will only be captured if you win the auction. If you don&apos;t win, it will be automatically cancelled.
            </p>
            <div className="mt-6">
              <button
                onClick={handleAuthorizeClick}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Authorize Deposit
              </button>
            </div>
          </div>
        </div>

        {/* Deposit Authorization Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Authorize Deposit
                  </h3>
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <DepositAuthorization
                  auctionId={auctionId}
                  onSuccess={handleDepositSuccess}
                  onError={handleDepositError}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Deposit is authorized - show the children (bidding interface)
  return (
    <div className={`${className}`}>
      {/* Show deposit status badge */}
      <div className="mb-4">
        <DepositStatusWithCTA 
          auctionId={auctionId}
          onAuthorizeClick={handleAuthorizeClick}
        />
      </div>
      
      {/* Render the bidding interface */}
      {children}
    </div>
  );
}

// Hook for checking deposit status
export function useDepositStatus(auctionId: string) {
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkDepositStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setDepositStatus(null);
          return;
        }
        throw new Error('Failed to check deposit status');
      }

      setIsAuthenticated(true);
      const status = await response.json();
      setDepositStatus(status);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setDepositStatus(null);
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatus();
  }, [checkDepositStatus]);

  const refresh = () => {
    checkDepositStatus();
  };

  return {
    depositStatus,
    loading,
    isAuthenticated,
    canBid: depositStatus?.is_authorized || false,
    refresh
  };
}
