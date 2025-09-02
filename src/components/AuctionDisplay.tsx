'use client';

import React from 'react';
import { DepositStatusBadgeCompact, DepositStatusWithCTA } from './DepositStatusBadge';
import DepositRequirementBanner from './DepositRequirementBanner';
import BiddingGate from './BiddingGate';

export interface AuctionDisplayProps {
  auction: {
    id: string;
    title: string;
    description: string;
    current_bid: number;
    min_bid: number;
    end_time: string;
    status: 'active' | 'ended' | 'cancelled';
    seller_id: string;
    material_type: string;
    quantity: number;
    unit: string;
    location: string;
    images?: string[];
  };
  currentUserId?: string;
  className?: string;
  showDepositStatus?: boolean;
  showBiddingForm?: boolean;
}

export function AuctionDisplay({ 
  auction, 
  currentUserId, 
  className = '',
  showDepositStatus = true,
  showBiddingForm = true 
}: AuctionDisplayProps) {
  const isActive = auction.status === 'active';
  const isOwner = currentUserId === auction.seller_id;
  const endTime = new Date(auction.end_time);
  const isEnded = endTime < new Date();
  const timeRemaining = endTime.getTime() - new Date().getTime();
  
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Ended';
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}>
      {/* Auction Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {auction.title}
            </h2>
            <p className="text-gray-600 text-sm mb-3">
              {auction.description}
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {auction.material_type}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {auction.quantity} {auction.unit}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                📍 {auction.location}
              </span>
            </div>
          </div>
          
          {/* Deposit Status Badge */}
          {showDepositStatus && !isOwner && isActive && (
            <div className="ml-4">
              <DepositStatusWithCTA 
                auctionId={auction.id}
              />
            </div>
          )}
        </div>

        {/* Auction Status and Timing */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Current Bid</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(auction.current_bid)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Minimum Bid</p>
              <p className="text-lg font-semibold text-gray-700">
                {formatCurrency(auction.min_bid)}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Status</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isActive && !isEnded 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isActive && !isEnded ? 'Active' : 'Ended'}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Requirement Banner */}
      {showDepositStatus && !isOwner && isActive && !isEnded && (
        <DepositRequirementBanner 
          auctionId={auction.id}
          className="border-b border-gray-200"
        />
      )}

      {/* Bidding Section */}
      {showBiddingForm && !isOwner && isActive && !isEnded && (
        <div className="p-6">
          <BiddingGate auctionId={auction.id}>
            <AuctionBiddingForm auction={auction} />
          </BiddingGate>
        </div>
      )}

      {/* Owner View */}
      {isOwner && (
        <div className="p-6 bg-blue-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-blue-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">This is your auction</span>
          </div>
          {showDepositStatus && (
            <div className="mt-3">
              <DepositStatusBadgeCompact 
                auctionId={auction.id}
              />
            </div>
          )}
        </div>
      )}

      {/* Ended Auction Message */}
      {isEnded && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p className="font-medium">This auction has ended</p>
            <p className="text-sm mt-1">
              Final bid: {formatCurrency(auction.current_bid)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple bidding form component for demonstration
function AuctionBiddingForm({ auction }: { auction: AuctionDisplayProps['auction'] }) {
  const [bidAmount, setBidAmount] = React.useState(auction.current_bid + 1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // This would integrate with the actual bidding API
      console.log('Submitting bid:', bidAmount);
      // await submitBid(auction.id, bidAmount);
    } catch (error) {
      console.error('Bid submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const minBid = Math.max(auction.current_bid + 1, auction.min_bid);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Place Your Bid</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Bid Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              id="bidAmount"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              min={minBid}
              step="0.01"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Minimum bid: ${minBid.toFixed(2)}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || bidAmount < minBid}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
        </button>
      </form>
    </div>
  );
}
