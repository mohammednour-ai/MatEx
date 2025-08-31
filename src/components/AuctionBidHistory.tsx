'use client';

import { formatTimeLeft } from '@/lib/auction-helpers';

interface BidData {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount_cad: number;
  created_at: string;
}

interface OptimisticBid extends BidData {
  isOptimistic: true;
}

interface AuctionBidHistoryProps {
  bids: (BidData | OptimisticBid)[];
  currentUserId?: string;
  isLoading?: boolean;
  className?: string;
}

export function AuctionBidHistory({ 
  bids, 
  currentUserId, 
  isLoading = false,
  className = '' 
}: AuctionBidHistoryProps) {
  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900">Bid History</h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="w-24 h-4 bg-gray-300 rounded"></div>
                    <div className="w-16 h-3 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div className="w-20 h-6 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <p className="text-sm">No bids yet</p>
          <p className="text-xs text-gray-400 mt-1">Be the first to place a bid!</p>
        </div>
      </div>
    );
  }

  // Sort bids by amount (highest first) and then by time (most recent first)
  const sortedBids = [...bids].sort((a, b) => {
    if (a.amount_cad !== b.amount_cad) {
      return b.amount_cad - a.amount_cad;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatBidTime = (createdAt: string) => {
    const bidTime = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - bidTime.getTime();
    
    if (diffMs < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diffMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes}m ago`;
    } else if (diffMs < 86400000) { // Less than 1 day
      const hours = Math.floor(diffMs / 3600000);
      return `${hours}h ago`;
    } else {
      return bidTime.toLocaleDateString();
    }
  };

  const formatBidderId = (bidderId: string) => {
    // Anonymize bidder IDs for privacy
    const shortId = bidderId.slice(-6);
    return `Bidder ${shortId}`;
  };

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Bid History ({bids.length} {bids.length === 1 ? 'bid' : 'bids'})
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedBids.map((bid, index) => {
          const isOptimistic = 'isOptimistic' in bid;
          const isCurrentUser = bid.bidder_id === currentUserId;
          const isHighestBid = index === 0;
          
          return (
            <div
              key={bid.id}
              className={`
                flex justify-between items-center p-3 rounded-lg border transition-all duration-200
                ${isOptimistic 
                  ? 'bg-blue-50 border-blue-200 opacity-75' 
                  : isHighestBid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }
                ${isOptimistic ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${isOptimistic 
                    ? 'bg-blue-200 text-blue-700' 
                    : isHighestBid 
                      ? 'bg-green-200 text-green-700' 
                      : 'bg-gray-200 text-gray-700'
                  }
                `}>
                  {isHighestBid ? '👑' : '💰'}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      isCurrentUser ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {isCurrentUser ? 'You' : formatBidderId(bid.bidder_id)}
                    </span>
                    {isOptimistic && (
                      <span className="text-xs text-blue-500 font-medium">
                        Placing...
                      </span>
                    )}
                    {isHighestBid && !isOptimistic && (
                      <span className="text-xs text-green-600 font-medium">
                        Highest bid
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatBidTime(bid.created_at)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  isOptimistic 
                    ? 'text-blue-600' 
                    : isHighestBid 
                      ? 'text-green-600' 
                      : 'text-gray-900'
                }`}>
                  ${bid.amount_cad.toLocaleString('en-CA', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </div>
                <div className="text-xs text-gray-500">CAD</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {sortedBids.length > 5 && (
        <div className="mt-3 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all bids
          </button>
        </div>
      )}
    </div>
  );
}
