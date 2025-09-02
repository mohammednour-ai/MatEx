'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface BidHistoryEntry {
  id: string;
  amount: number;
  bidder_id: string;
  bidder_name?: string;
  created_at: string;
  is_current_user?: boolean;
}

export interface AuctionBidHistoryProps {
  auctionId: string;
  className?: string;
  maxEntries?: number;
  showBidderNames?: boolean;
}

export default function AuctionBidHistory({ 
  auctionId, 
  className = '',
  maxEntries = 10,
  showBidderNames = false
}: AuctionBidHistoryProps) {
  const [bidHistory, setBidHistory] = useState<BidHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBidHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/auctions/${auctionId}/bids?limit=${maxEntries}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bid history');
      }

      const data = await response.json();
      setBidHistory(data.bids || []);
    } catch (error) {
      console.error('Error fetching bid history:', error);
      setError('Failed to load bid history');
    } finally {
      setLoading(false);
    }
  }, [auctionId, maxEntries]);

  useEffect(() => {
    void fetchBidHistory();
  }, [fetchBidHistory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getBidderDisplay = (bid: BidHistoryEntry) => {
    if (bid.is_current_user) {
      return 'You';
    }
    
    if (showBidderNames && bid.bidder_name) {
      return bid.bidder_name;
    }
    
    // Anonymous display - show partial bidder ID
    const shortId = bid.bidder_id.slice(-6);
    return `Bidder ***${shortId}`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h3>
        <div className="text-center py-4">
          <svg className="mx-auto h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchBidHistory}
            className="mt-2 text-sm text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (bidHistory.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h3>
        <div className="text-center py-6">
          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No bids yet</p>
          <p className="text-xs text-gray-400">Be the first to place a bid!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bid History</h3>
        <span className="text-sm text-gray-500">
          {bidHistory.length} bid{bidHistory.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {bidHistory.map((bid, index) => (
          <div 
            key={bid.id}
            className={`flex justify-between items-center p-3 rounded-lg border ${
              index === 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                index === 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {index === 0 ? '👑' : index + 1}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${
                    index === 0 ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {formatCurrency(bid.amount)}
                  </span>
                  {index === 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Leading
                    </span>
                  )}
                  {bid.is_current_user && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Your bid
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  by {getBidderDisplay(bid)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {formatTimeAgo(bid.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {bidHistory.length >= maxEntries && (
          <div className="mt-3 text-center">
          <button
            onClick={() => {
              // Placeholder: expand bid history UI (no-op for now)
            }}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all bids
          </button>
        </div>
      )}
    </div>
  );
}

// Compact version for use in smaller spaces
export function AuctionBidHistoryCompact({ 
  auctionId, 
  className = '',
  maxEntries = 5 
}: { 
  auctionId: string; 
  className?: string;
  maxEntries?: number;
}) {
  return (
    <AuctionBidHistory 
      auctionId={auctionId}
      className={className}
      maxEntries={maxEntries}
      showBidderNames={false}
    />
  );
}
