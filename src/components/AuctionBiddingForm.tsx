'use client';

import { useState, useEffect, useId } from 'react';
import { AuctionState, formatTimeLeft } from '@/lib/auction-helpers';
import ConsentModal from './ConsentModal';

interface AuctionBiddingFormProps {
  auctionState: AuctionState | null;
  onPlaceBid: (amount: number) => Promise<{ success: boolean; error?: string }>;
  isConnected: boolean;
  currentUserId?: string;
  className?: string;
}

export function AuctionBiddingForm({
  auctionState,
  onPlaceBid,
  isConnected,
  currentUserId,
  className = '',
}: AuctionBiddingFormProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);
  const [announceText, setAnnounceText] = useState('');

  // Generate unique IDs for accessibility
  const formId = useId();
  const bidInputId = `${formId}-bid-input`;
  const errorId = `${formId}-error`;
  const successId = `${formId}-success`;
  const statusId = `${formId}-status`;
  const auctionInfoId = `${formId}-auction-info`;
  const warningId = `${formId}-warning`;

  // Update suggested bid amount when auction state changes
  useEffect(() => {
    if (auctionState && !bidAmount) {
      setBidAmount(auctionState.minNextBid.toFixed(2));
    }
  }, [auctionState, bidAmount]);

  // Clear messages after a delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!auctionState) {
    return (
      <div className={`${className}`} role="status" aria-label="Loading auction bidding form">
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-300 rounded mb-4'></div>
          <div className='h-12 bg-gray-300 rounded mb-4'></div>
          <div className='h-10 bg-gray-300 rounded'></div>
        </div>
        <span className="sr-only">Loading auction bidding form...</span>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div
        className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}
        role="alert"
        aria-labelledby={`${formId}-signin-title`}
        aria-describedby={`${formId}-signin-desc`}
      >
        <div className='mb-4'>
          <svg
            className='w-12 h-12 mx-auto text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden="true"
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
            />
          </svg>
        </div>
        <h3 id={`${formId}-signin-title`} className='text-lg font-medium text-gray-900 mb-2'>
          Sign in to bid
        </h3>
        <p id={`${formId}-signin-desc`} className='text-gray-600 mb-4'>
          You need to be signed in to place bids on this auction.
        </p>
        <button
          className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
          aria-label="Sign in to start bidding"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!auctionState.hasStarted) {
    return (
      <div
        className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center ${className}`}
        role="status"
        aria-labelledby={`${formId}-pending-title`}
        aria-describedby={`${formId}-pending-desc`}
      >
        <div className='mb-4'>
          <svg
            className='w-12 h-12 mx-auto text-yellow-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden="true"
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
        <h3 id={`${formId}-pending-title`} className='text-lg font-medium text-gray-900 mb-2'>
          Auction hasn't started
        </h3>
        <p id={`${formId}-pending-desc`} className='text-gray-600'>
          This auction will begin soon. Check back later to place your bid.
        </p>
      </div>
    );
  }

  if (auctionState.hasEnded) {
    return (
      <div
        className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}
        role="status"
        aria-labelledby={`${formId}-ended-title`}
        aria-describedby={`${formId}-ended-desc`}
      >
        <div className='mb-4'>
          <svg
            className='w-12 h-12 mx-auto text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden="true"
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
        <h3 id={`${formId}-ended-title`} className='text-lg font-medium text-gray-900 mb-2'>
          Auction ended
        </h3>
        <p id={`${formId}-ended-desc`} className='text-gray-600'>
          Final price:{' '}
          <span className='font-semibold'>
            ${auctionState.currentHighBid.toFixed(2)} CAD
          </span>
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    if (amount < auctionState.minNextBid) {
      setError(
        `Bid must be at least $${auctionState.minNextBid.toFixed(2)} CAD`
      );
      return;
    }

    // Check for terms acceptance before placing bid
    try {
      const response = await fetch('/api/legal/acceptance', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to check terms acceptance');
      }

      const { hasAcceptedLatest } = await response.json();

      if (!hasAcceptedLatest) {
        // Show consent modal
        setPendingBidAmount(amount);
        setShowConsentModal(true);
        return;
      }

      // Proceed with bid if terms are accepted
      await placeBid(amount);
    } catch (err) {
      console.error('Error checking terms acceptance:', err);
      setError('Failed to verify terms acceptance. Please try again.');
    }
  };

  const placeBid = async (amount: number) => {
    setIsPlacingBid(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onPlaceBid(amount);

      if (result.success) {
        setSuccess('Bid placed successfully!');
        setAnnounceText(`Bid of $${amount.toFixed(2)} CAD placed successfully!`);
        // Update to next minimum bid amount
        setBidAmount((amount + 5).toFixed(2)); // Simple increment for next bid
      } else {
        setError(result.error || 'Failed to place bid');
        setAnnounceText(`Error placing bid: ${result.error || 'Failed to place bid'}`);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setAnnounceText('Network error occurred while placing bid. Please try again.');
    } finally {
      setIsPlacingBid(false);
    }
  };

  const handleConsentAccept = async () => {
    setShowConsentModal(false);
    if (pendingBidAmount) {
      await placeBid(pendingBidAmount);
      setPendingBidAmount(null);
    }
  };

  const handleConsentClose = () => {
    setShowConsentModal(false);
    setPendingBidAmount(null);
  };

  const handleQuickBid = (increment: number) => {
    const newAmount = auctionState.minNextBid + increment;
    setBidAmount(newAmount.toFixed(2));
    setAnnounceText(`Bid amount set to $${newAmount.toFixed(2)} CAD`);
  };

  const isValidBid = () => {
    const amount = parseFloat(bidAmount);
    return !isNaN(amount) && amount >= auctionState.minNextBid;
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
      role="region"
      aria-labelledby={`${formId}-title`}
      aria-describedby={auctionInfoId}
    >
      {/* Screen reader announcements */}
      <div
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announceText}
      </div>

      {/* Connection status */}
      <div className='flex items-center justify-between mb-4'>
        <h3 id={`${formId}-title`} className='text-lg font-semibold text-gray-900'>Place Your Bid</h3>
        <div className='flex items-center space-x-2' role="status" aria-label={`Connection status: ${isConnected ? 'Live' : 'Disconnected'}`}>
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            aria-hidden="true"
          ></div>
          <span className='text-xs text-gray-500'>
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Auction info */}
      <div id={auctionInfoId} className='bg-gray-50 rounded-lg p-4 mb-6' role="region" aria-label="Auction information">
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <span className='text-gray-600'>Current high bid:</span>
            <div className='font-semibold text-lg' aria-label={`Current high bid: ${auctionState.currentHighBid.toFixed(2)} Canadian dollars`}>
              ${auctionState.currentHighBid.toFixed(2)} CAD
            </div>
          </div>
          <div>
            <span className='text-gray-600'>Time left:</span>
            <div className='font-semibold text-lg text-red-600' aria-label={`Time remaining: ${formatTimeLeft(auctionState.timeLeft)}`}>
              {formatTimeLeft(auctionState.timeLeft)}
            </div>
          </div>
          <div>
            <span className='text-gray-600'>Minimum bid:</span>
            <div className='font-semibold' aria-label={`Minimum bid required: ${auctionState.minNextBid.toFixed(2)} Canadian dollars`}>
              ${auctionState.minNextBid.toFixed(2)} CAD
            </div>
          </div>
          <div>
            <span className='text-gray-600'>Total bids:</span>
            <div className='font-semibold' aria-label={`Total number of bids: ${auctionState.totalBids}`}>
              {auctionState.totalBids}
            </div>
          </div>
        </div>
      </div>

      {/* Quick bid buttons */}
      <div className='mb-4'>
        <fieldset>
          <legend className='block text-sm font-medium text-gray-700 mb-2'>
            Quick bid amounts:
          </legend>
          <div className='flex space-x-2' role="group" aria-label="Quick bid amount options">
            <button
              type='button'
              onClick={() => handleQuickBid(0)}
              className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md transition-colors'
              aria-label={`Set minimum bid: ${auctionState.minNextBid.toFixed(2)} Canadian dollars`}
            >
              Min: ${auctionState.minNextBid.toFixed(2)}
            </button>
            <button
              type='button'
              onClick={() => handleQuickBid(10)}
              className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md transition-colors'
              aria-label={`Add 10 dollars to minimum bid: ${(auctionState.minNextBid + 10).toFixed(2)} Canadian dollars`}
            >
              +$10
            </button>
            <button
              type='button'
              onClick={() => handleQuickBid(25)}
              className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md transition-colors'
              aria-label={`Add 25 dollars to minimum bid: ${(auctionState.minNextBid + 25).toFixed(2)} Canadian dollars`}
            >
              +$25
            </button>
            <button
              type='button'
              onClick={() => handleQuickBid(50)}
              className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md transition-colors'
              aria-label={`Add 50 dollars to minimum bid: ${(auctionState.minNextBid + 50).toFixed(2)} Canadian dollars`}
            >
              +$50
            </button>
          </div>
        </fieldset>
      </div>

      {/* Bid form */}
      <form onSubmit={handleSubmit} className='space-y-4' noValidate>
        <div>
          <label
            htmlFor={bidInputId}
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Your bid amount (CAD)
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <span className='text-gray-500 sm:text-sm' aria-hidden="true">$</span>
            </div>
            <input
              type='number'
              id={bidInputId}
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              step='0.01'
              min={auctionState.minNextBid}
              className={`
                block w-full pl-7 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                ${isValidBid() ? 'border-gray-300' : 'border-red-300'}
              `}
              placeholder={auctionState.minNextBid.toFixed(2)}
              disabled={isPlacingBid}
              aria-describedby={`${bidInputId}-help ${!isValidBid() && bidAmount ? `${bidInputId}-error` : ''} ${statusId}`}
              aria-invalid={!isValidBid() && bidAmount ? 'true' : 'false'}
              aria-label={`Enter your bid amount in Canadian dollars. Minimum bid is ${auctionState.minNextBid.toFixed(2)} CAD`}
            />
            <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
              <span className='text-gray-500 sm:text-sm' aria-hidden="true">CAD</span>
            </div>
          </div>
          <div id={`${bidInputId}-help`} className="sr-only">
            Enter your bid amount. Minimum bid is ${auctionState.minNextBid.toFixed(2)} Canadian dollars.
          </div>
          {!isValidBid() && bidAmount && (
            <p id={`${bidInputId}-error`} className='mt-1 text-sm text-red-600' role="alert">
              Minimum bid is ${auctionState.minNextBid.toFixed(2)} CAD
            </p>
          )}
        </div>

        {/* Error/Success messages */}
        {error && (
          <div id={errorId} className='bg-red-50 border border-red-200 rounded-lg p-3' role="alert" aria-live="polite">
            <div className='flex'>
              <svg
                className='w-5 h-5 text-red-400 mr-2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden="true"
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div id={successId} className='bg-green-50 border border-green-200 rounded-lg p-3' role="alert" aria-live="polite">
            <div className='flex'>
              <svg
                className='w-5 h-5 text-green-400 mr-2'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden="true"
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
              <p className='text-sm text-green-700'>{success}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type='submit'
          disabled={!isValidBid() || isPlacingBid || !isConnected}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${
              isValidBid() && !isPlacingBid && isConnected
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          aria-describedby={`${statusId} ${error ? errorId : ''} ${success ? successId : ''}`}
        >
          {isPlacingBid ? (
            <div className='flex items-center justify-center'>
              <svg
                className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                aria-hidden="true"
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
              Placing bid...
            </div>
          ) : !isConnected ? (
            'Connection lost'
          ) : (
            `Place bid: $${parseFloat(bidAmount || '0').toFixed(2)} CAD`
          )}
        </button>
      </form>

      {/* Soft close warning */}
      {auctionState.timeLeft < 120000 && ( // Less than 2 minutes
        <div id={warningId} className='mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3' role="alert" aria-live="polite">
          <div className='flex'>
            <svg
              className='w-5 h-5 text-yellow-400 mr-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              aria-hidden="true"
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
            <p className='text-sm text-yellow-700'>
              <strong>Soft close active:</strong> New bids may extend the
              auction time.
            </p>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onClose={handleConsentClose}
        onAccept={handleConsentAccept}
        actionType='bid'
      />
    </div>
  );
}
