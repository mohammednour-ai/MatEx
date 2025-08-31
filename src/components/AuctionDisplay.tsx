'use client';

import { useEffect, useState } from 'react';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';
import { AuctionBidHistory } from '@/components/AuctionBidHistory';
import { AuctionBiddingForm } from '@/components/AuctionBiddingForm';
import { AuctionData, formatTimeLeft } from '@/lib/auction-helpers';
import { getCurrentUser } from '@/lib/supabaseClient';

interface AuctionDisplayProps {
  auctionId: string;
  initialAuction?: AuctionData;
  className?: string;
}

export function AuctionDisplay({ 
  auctionId, 
  initialAuction,
  className = '' 
}: AuctionDisplayProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Set up real-time auction hook
  const {
    auction,
    auctionState,
    bids,
    isLoading,
    error,
    placeBidOptimistic,
    refreshAuction,
    isConnected
  } = useAuctionRealtime({
    auctionId,
    initialAuction,
    onBidUpdate: (bid) => {
      // Show notification for new bids (except own bids)
      if (bid.bidder_id !== currentUserId) {
        setNotifications(prev => [
          ...prev,
          `New bid: $${bid.amount_cad.toFixed(2)} CAD`
        ]);
        
        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.slice(1));
        }, 5000);
      }
    },
    onAuctionUpdate: (updatedAuction) => {
      // Handle auction updates (like soft close extensions)
      if (updatedAuction.end_at !== auction?.end_at) {
        setNotifications(prev => [
          ...prev,
          'Auction time extended due to recent bid!'
        ]);
        
        setTimeout(() => {
          setNotifications(prev => prev.slice(1));
        }, 5000);
      }
    },
    onError: (error) => {
      console.error('Auction real-time error:', error);
    }
  });

  // Auto-refresh auction state every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (auctionState?.isActive) {
        refreshAuction();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [auctionState?.isActive, refreshAuction]);

  if (isLoading && !auction) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="bg-gray-200 h-8 rounded mb-4"></div>
          
          {/* Status bar skeleton */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-gray-200 h-4 rounded"></div>
                  <div className="bg-gray-300 h-6 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 h-96 rounded-lg"></div>
            <div className="bg-gray-100 h-96 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !auction) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load auction</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshAuction}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!auction || !auctionState) {
    return (
      <div className={`${className}`}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Auction not found</h3>
          <p className="text-gray-600">The requested auction could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in-right"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{notification}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auction Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Auction #{auctionId.slice(-8)}
          </h1>
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live updates' : 'Connection lost'}
              </span>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={refreshAuction}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh auction data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Auction Status Bar */}
        <div className={`
          rounded-lg p-4 mb-4
          ${auctionState.isActive 
            ? 'bg-green-50 border border-green-200' 
            : auctionState.hasEnded 
              ? 'bg-gray-50 border border-gray-200'
              : 'bg-yellow-50 border border-yellow-200'
          }
        `}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 block">Status:</span>
              <span className={`font-semibold ${
                auctionState.isActive 
                  ? 'text-green-600' 
                  : auctionState.hasEnded 
                    ? 'text-gray-600'
                    : 'text-yellow-600'
              }`}>
                {auctionState.isActive 
                  ? 'Active' 
                  : auctionState.hasEnded 
                    ? 'Ended'
                    : 'Not Started'
                }
              </span>
            </div>
            
            <div>
              <span className="text-gray-600 block">Current High Bid:</span>
              <span className="font-semibold text-lg">
                ${auctionState.currentHighBid.toFixed(2)} CAD
              </span>
            </div>
            
            <div>
              <span className="text-gray-600 block">Time Left:</span>
              <span className={`font-semibold ${
                auctionState.timeLeft < 300000 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatTimeLeft(auctionState.timeLeft)}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600 block">Total Bids:</span>
              <span className="font-semibold">
                {auctionState.totalBids}
              </span>
            </div>
          </div>
        </div>

        {/* Soft close indicator */}
        {auctionState.isActive && auctionState.timeLeft < 120000 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-orange-700 font-medium">
                Soft close period active - New bids may extend auction time
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bidding Form */}
        <div>
          <AuctionBiddingForm
            auctionState={auctionState}
            onPlaceBid={placeBidOptimistic}
            isConnected={isConnected}
            currentUserId={currentUserId || undefined}
          />
        </div>

        {/* Bid History */}
        <div>
          <AuctionBidHistory
            bids={bids}
            currentUserId={currentUserId || undefined}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Auction Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Auction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Auction ID:</span>
            <div className="font-mono text-gray-900">{auctionId}</div>
          </div>
          <div>
            <span className="text-gray-600">Listing ID:</span>
            <div className="font-mono text-gray-900">{auction.listing_id}</div>
          </div>
          <div>
            <span className="text-gray-600">Start Time:</span>
            <div className="text-gray-900">
              {new Date(auction.start_at).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">End Time:</span>
            <div className="text-gray-900">
              {new Date(auction.end_at).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Minimum Increment:</span>
            <div className="text-gray-900">
              ${auction.min_increment_cad.toFixed(2)} CAD
            </div>
          </div>
          <div>
            <span className="text-gray-600">Soft Close Period:</span>
            <div className="text-gray-900">
              {auction.soft_close_seconds} seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
