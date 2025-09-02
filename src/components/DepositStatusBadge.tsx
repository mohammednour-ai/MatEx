'use client';

import { useState, useEffect, useCallback } from 'react';

interface DepositStatusBadgeProps {
  auctionId: string;
  showCTA?: boolean;
  onAuthorizeClick?: () => void;
  className?: string;
}

interface DepositStatus {
  is_authorized: boolean;
  payment_intent_id?: string;
  amount_cad?: number;
  status?: string;
}

export default function DepositStatusBadge({ 
  auctionId, 
  showCTA = true, 
  onAuthorizeClick,
  className = ""
}: DepositStatusBadgeProps) {
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkDepositStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - don't show error
          setDepositStatus(null);
          return;
        }
        throw new Error('Failed to check deposit status');
      }

      const status = await response.json();
      setDepositStatus(status);
    } catch (error) {
      console.error('Error checking deposit status:', error);
      setError('Failed to check deposit status');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    void checkDepositStatus();
  }, [checkDepositStatus]);

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent mr-1"></div>
        Checking...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 ${className}`}>
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Error
      </div>
    );
  }

  if (!depositStatus) {
    // User not authenticated or no deposit info
    return null;
  }

  if (depositStatus.is_authorized) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 ${className}`}>
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Deposit Authorized
        {depositStatus.amount_cad && (
          <span className="ml-1 text-green-600">
            (${depositStatus.amount_cad.toFixed(2)})
          </span>
        )}
      </div>
    );
  }

  // Deposit required but not authorized
  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 mr-2">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Deposit Required
      </div>
      {showCTA && (
        <button
          onClick={onAuthorizeClick}
          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Authorize Deposit
        </button>
      )}
    </div>
  );
}

// Compact version for use in cards/lists
export function DepositStatusBadgeCompact({ auctionId, className = "" }: { auctionId: string; className?: string }) {
  return (
    <DepositStatusBadge 
      auctionId={auctionId} 
      showCTA={false} 
      className={className}
    />
  );
}

// Full version with CTA for auction detail pages
export function DepositStatusWithCTA({ 
  auctionId, 
  onAuthorizeClick,
  className = "" 
}: { 
  auctionId: string; 
  onAuthorizeClick?: () => void;
  className?: string;
}) {
  return (
    <DepositStatusBadge 
      auctionId={auctionId} 
      showCTA={true} 
      onAuthorizeClick={onAuthorizeClick}
      className={className}
    />
  );
}
