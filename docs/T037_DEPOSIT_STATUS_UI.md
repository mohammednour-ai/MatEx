# T037: Deposit Status UI

## Overview
Create user interface components to display deposit status and requirements in auction pages. This provides clear visual indicators for deposit authorization status, required actions, and payment method management for auction participation.

## Implementation Details

### Deposit Status Component
```typescript
// src/components/DepositStatus.tsx
import { useState, useEffect } from 'react';
import { DepositAuthorization } from './DepositAuthorization';
import { StripeProvider } from './StripeProvider';

interface DepositStatusProps {
  auctionId: string;
  currentUserId: string;
  isAuctionActive: boolean;
}

interface DepositInfo {
  id: string;
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
  amount_cad: number;
  authorized_at?: string;
  created_at: string;
}

export function DepositStatus({ auctionId, currentUserId, isAuctionActive }: DepositStatusProps) {
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDepositStatus();
  }, [auctionId, currentUserId]);

  const loadDepositStatus = async () => {
    try {
      const response = await fetch(`/api/deposits/status?auction_id=${auctionId}`);
      if (response.ok) {
        const data = await response.json();
        setDeposit(data.deposit);
      } else if (response.status !== 404) {
        throw new Error('Failed to load deposit status');
      }
    } catch (error) {
      console.error('Error loading deposit status:', error);
      setError('Failed to load deposit information');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthForm(false);
    loadDepositStatus();
  };

  const handleAuthError = (errorMessage: string) => {
    setError(errorMessage);
    setShowAuthForm(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  // No deposit required or found
  if (!deposit) {
    if (!isAuctionActive) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Auction has ended</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Deposit Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You must authorize a refundable deposit before you can place bids on this auction.
              </p>
            </div>
          </div>
        </div>

        {showAuthForm ? (
          <StripeProvider>
            <DepositAuthorization
              auctionId={auctionId}
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          </StripeProvider>
        ) : (
          <button
            onClick={() => setShowAuthForm(true)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Authorize Deposit to Bid
          </button>
        )}
      </div>
    );
  }

  // Deposit exists - show status
  const getStatusDisplay = () => {
    switch (deposit.status) {
      case 'pending':
        return {
          color: 'yellow',
          icon: '⏳',
          title: 'Deposit Pending',
          description: 'Your deposit authorization is being processed.'
        };
      case 'authorized':
        return {
          color: 'green',
          icon: '✅',
          title: 'Deposit Authorized',
          description: 'You can now place bids on this auction.'
        };
      case 'captured':
        return {
          color: 'blue',
          icon: '💰',
          title: 'Deposit Applied',
          description: 'Your deposit has been applied to your winning bid.'
        };
      case 'refunded':
        return {
          color: 'gray',
          icon: '↩️',
          title: 'Deposit Refunded',
          description: 'Your deposit has been refunded to your payment method.'
        };
      case 'failed':
        return {
          color: 'red',
          icon: '❌',
          title: 'Deposit Failed',
          description: 'There was an issue with your deposit. Please try again.'
        };
      default:
        return {
          color: 'gray',
          icon: '❓',
          title: 'Unknown Status',
          description: 'Please contact support for assistance.'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`border p-4 rounded-lg ${colorClasses[statusDisplay.color]}`}>
      <div className="flex items-start">
        <span className="text-lg mr-3">{statusDisplay.icon}</span>
        <div className="flex-1">
          <h3 className="font-medium">{statusDisplay.title}</h3>
          <p className="text-sm mt-1">{statusDisplay.description}</p>
          <div className="mt-2 text-xs">
            <p>Amount: ${deposit.amount_cad.toLocaleString()} CAD</p>
            {deposit.authorized_at && (
              <p>Authorized: {new Date(deposit.authorized_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {deposit.status === 'failed' && (
        <div className="mt-3">
          <button
            onClick={() => setShowAuthForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {showAuthForm && deposit.status === 'failed' && (
        <div className="mt-4">
          <StripeProvider>
            <DepositAuthorization
              auctionId={auctionId}
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          </StripeProvider>
        </div>
      )}
    </div>
  );
}
```

### Deposit Status API
```typescript
// src/app/api/deposits/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auction_id');

    if (!auctionId) {
      return NextResponse.json({ error: 'auction_id is required' }, { status: 400 });
    }

    // Get user's deposit for this auction
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user.id)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ deposit });
  } catch (error) {
    console.error('Error fetching deposit status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Bidding Gate Component
```typescript
// src/components/BiddingGate.tsx
import { ReactNode } from 'react';
import { DepositStatus } from './DepositStatus';

interface BiddingGateProps {
  auctionId: string;
  currentUserId: string;
  isAuctionActive: boolean;
  hasAuthorizedDeposit: boolean;
  children: ReactNode;
}

export function BiddingGate({
  auctionId,
  currentUserId,
  isAuctionActive,
  hasAuthorizedDeposit,
  children
}: BiddingGateProps) {
  if (!isAuctionActive) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-600">This auction has ended</p>
        </div>
      </div>
    );
  }

  if (!hasAuthorizedDeposit) {
    return (
      <div className="space-y-4">
        <DepositStatus
          auctionId={auctionId}
          currentUserId={currentUserId}
          isAuctionActive={isAuctionActive}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DepositStatus
        auctionId={auctionId}
        currentUserId={currentUserId}
        isAuctionActive={isAuctionActive}
      />
      {children}
    </div>
  );
}
```

## Files Created/Modified
- `src/components/DepositStatus.tsx` - Main deposit status display component
- `src/app/api/deposits/status/route.ts` - API endpoint for deposit status
- `src/components/BiddingGate.tsx` - Wrapper component that gates bidding functionality

## Technical Considerations
- **Real-time Updates**: Component refreshes deposit status after authorization
- **Error Handling**: Clear error messages and retry functionality
- **Visual Feedback**: Color-coded status indicators with appropriate icons
- **Responsive Design**: Works well on mobile and desktop devices
- **Accessibility**: Proper ARIA labels and semantic HTML structure
- **Loading States**: Skeleton loading while fetching deposit information

## Success Metrics
- Clear visual indication of deposit requirements
- Intuitive status progression from pending to authorized
- Successful retry mechanism for failed deposits
- Responsive design across all device sizes
- Zero confusion about bidding eligibility
- Seamless integration with existing auction UI

## Dependencies
- Existing deposit authorization system
- Stripe payment components
- User authentication system
- Auction status and timing logic
