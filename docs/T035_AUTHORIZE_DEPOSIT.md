# T035: Authorize Deposit

## Overview
Implement deposit authorization system using Stripe PaymentIntents to secure auction participation. This system authorizes deposits without capturing funds immediately, allowing bidders to participate in auctions while ensuring payment capability.

## Implementation Details

### Deposit Authorization API
Create API endpoint to authorize deposits for auction participation with configurable deposit amounts.

### API Implementation
```typescript
// src/app/api/deposits/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe, handleStripeError } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

interface DepositAuthRequest {
  auction_id: string;
  return_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auction_id, return_url }: DepositAuthRequest = await request.json();

    // Get auction and listing details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        listing_id,
        min_increment_cad,
        listing:listings(
          id,
          title,
          seller_id,
          price_cad,
          buy_now_cad
        )
      `)
      .eq('listing_id', auction_id)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Prevent seller from authorizing deposit on own listing
    if (auction.listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot authorize deposit on your own listing' },
        { status: 400 }
      );
    }

    // Check if user already has an authorized deposit for this auction
    const { data: existingDeposit } = await supabase
      .from('deposits')
      .select('id, status, stripe_payment_intent_id')
      .eq('user_id', user.id)
      .eq('auction_id', auction_id)
      .in('status', ['authorized', 'captured'])
      .single();

    if (existingDeposit) {
      return NextResponse.json(
        { error: 'Deposit already authorized for this auction' },
        { status: 400 }
      );
    }

    // Get deposit settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['auction.deposit_percent', 'auction.deposit_minimum_cad'])
      .then(res => {
        const settingsMap = res.data?.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, any>) || {};
        return { data: settingsMap };
      });

    const depositPercent = settings?.data?.['auction.deposit_percent'] || 0.1;
    const depositMinimum = settings?.data?.['auction.deposit_minimum_cad'] || 50;

    // Calculate deposit amount
    const baseAmount = auction.listing.buy_now_cad || auction.listing.price_cad || 0;
    const calculatedDeposit = Math.max(baseAmount * depositPercent, depositMinimum);
    const depositAmount = Math.round(calculatedDeposit);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(depositAmount),
      currency: 'cad',
      capture_method: 'manual', // Don't capture immediately
      metadata: {
        type: 'auction_deposit',
        user_id: user.id,
        auction_id: auction_id,
        listing_id: auction.listing.id,
        listing_title: auction.listing.title
      },
      description: `Auction deposit for "${auction.listing.title}"`,
      receipt_email: user.email,
      setup_future_usage: 'off_session' // For potential future charges
    });

    // Store deposit record
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: user.id,
        auction_id: auction_id,
        amount_cad: depositAmount,
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (depositError) throw depositError;

    return NextResponse.json({
      deposit_id: deposit.id,
      client_secret: paymentIntent.client_secret,
      amount_cad: depositAmount,
      return_url: return_url || `/listings/${auction.listing.id}`
    });

  } catch (error) {
    console.error('Error authorizing deposit:', error);
    
    if (error.type?.startsWith('Stripe')) {
      const stripeError = handleStripeError(error);
      return NextResponse.json({ error: stripeError.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Deposit Status Check API
```typescript
// src/app/api/deposits/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const depositId = params.id;

    // Get deposit record
    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('user_id', user.id)
      .single();

    if (error || !deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // Get latest status from Stripe
    let stripeStatus = null;
    if (deposit.stripe_payment_intent_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          deposit.stripe_payment_intent_id
        );
        stripeStatus = paymentIntent.status;

        // Update local status if it has changed
        if (paymentIntent.status === 'succeeded' && deposit.status !== 'authorized') {
          await supabase
            .from('deposits')
            .update({ 
              status: 'authorized',
              authorized_at: new Date().toISOString()
            })
            .eq('id', depositId);
          
          deposit.status = 'authorized';
        }
      } catch (stripeError) {
        console.error('Error retrieving PaymentIntent:', stripeError);
      }
    }

    return NextResponse.json({
      deposit_id: deposit.id,
      status: deposit.status,
      amount_cad: deposit.amount_cad,
      stripe_status: stripeStatus,
      authorized_at: deposit.authorized_at,
      created_at: deposit.created_at
    });

  } catch (error) {
    console.error('Error checking deposit status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Deposit Helper Functions
```typescript
// src/lib/deposit-helpers.ts
import { supabase } from './supabaseServer';
import { stripe, formatAmountFromStripe } from './stripe';

export interface DepositInfo {
  id: string;
  user_id: string;
  auction_id: string;
  amount_cad: number;
  status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
  stripe_payment_intent_id: string;
  authorized_at?: string;
  captured_at?: string;
  refunded_at?: string;
}

export async function getUserDepositForAuction(
  userId: string, 
  auctionId: string
): Promise<DepositInfo | null> {
  const { data: deposit } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_id', userId)
    .eq('auction_id', auctionId)
    .in('status', ['authorized', 'captured'])
    .single();

  return deposit;
}

export async function isDepositAuthorized(
  userId: string, 
  auctionId: string
): Promise<boolean> {
  const deposit = await getUserDepositForAuction(userId, auctionId);
  return deposit?.status === 'authorized' || deposit?.status === 'captured';
}

export async function captureDeposit(depositId: string): Promise<boolean> {
  try {
    const { data: deposit } = await supabase
      .from('deposits')
      .select('stripe_payment_intent_id, status')
      .eq('id', depositId)
      .single();

    if (!deposit || deposit.status !== 'authorized') {
      return false;
    }

    // Capture the payment in Stripe
    const paymentIntent = await stripe.paymentIntents.capture(
      deposit.stripe_payment_intent_id
    );

    if (paymentIntent.status === 'succeeded') {
      // Update deposit status
      await supabase
        .from('deposits')
        .update({
          status: 'captured',
          captured_at: new Date().toISOString()
        })
        .eq('id', depositId);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error capturing deposit:', error);
    return false;
  }
}

export async function refundDeposit(depositId: string): Promise<boolean> {
  try {
    const { data: deposit } = await supabase
      .from('deposits')
      .select('stripe_payment_intent_id, status, amount_cad')
      .eq('id', depositId)
      .single();

    if (!deposit || !['authorized', 'captured'].includes(deposit.status)) {
      return false;
    }

    let refund;
    if (deposit.status === 'authorized') {
      // Cancel the authorization
      await stripe.paymentIntents.cancel(deposit.stripe_payment_intent_id);
    } else {
      // Create a refund for captured payment
      refund = await stripe.refunds.create({
        payment_intent: deposit.stripe_payment_intent_id,
        reason: 'requested_by_customer'
      });
    }

    // Update deposit status
    await supabase
      .from('deposits')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString()
      })
      .eq('id', depositId);

    return true;
  } catch (error) {
    console.error('Error refunding deposit:', error);
    return false;
  }
}

export async function calculateDepositAmount(auctionId: string): Promise<number> {
  // Get auction details
  const { data: auction } = await supabase
    .from('auctions')
    .select(`
      listing:listings(price_cad, buy_now_cad)
    `)
    .eq('listing_id', auctionId)
    .single();

  if (!auction) return 0;

  // Get deposit settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['auction.deposit_percent', 'auction.deposit_minimum_cad'])
    .then(res => {
      const settingsMap = res.data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>) || {};
      return { data: settingsMap };
    });

  const depositPercent = settings?.data?.['auction.deposit_percent'] || 0.1;
  const depositMinimum = settings?.data?.['auction.deposit_minimum_cad'] || 50;

  const baseAmount = auction.listing.buy_now_cad || auction.listing.price_cad || 0;
  const calculatedDeposit = Math.max(baseAmount * depositPercent, depositMinimum);
  
  return Math.round(calculatedDeposit);
}
```

### React Component for Deposit Authorization
```typescript
// src/components/DepositAuthorization.tsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface DepositAuthorizationProps {
  auctionId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function DepositAuthorization({ 
  auctionId, 
  onSuccess, 
  onError 
}: DepositAuthorizationProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);

  const initiateDeposit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deposits/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          auction_id: auctionId,
          return_url: window.location.href
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate deposit');
      }

      const data = await response.json();
      setClientSecret(data.client_secret);
      setDepositAmount(data.amount_cad);
    } catch (error) {
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required'
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (error) {
      onError('Payment confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Deposit Required</h3>
          <p className="text-sm text-blue-800">
            A refundable deposit is required to participate in this auction. 
            The deposit will be refunded if you don't win the auction.
          </p>
        </div>
        
        <button
          onClick={initiateDeposit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Calculating Deposit...' : 'Authorize Deposit'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-medium text-green-900 mb-2">
          Authorize ${depositAmount.toLocaleString()} CAD Deposit
        </h3>
        <p className="text-sm text-green-800">
          This amount will be authorized on your payment method but not charged unless you win the auction.
        </p>
      </div>

      <PaymentElement />

      <button
        onClick={confirmPayment}
        disabled={loading || !stripe || !elements}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Authorizing...' : `Authorize $${depositAmount.toLocaleString()} CAD`}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment method will be authorized but not charged. 
        The deposit will only be captured if you win the auction.
      </p>
    </div>
  );
}
```

## Files Created/Modified
- `src/app/api/deposits/authorize/route.ts` - Deposit authorization API
- `src/app/api/deposits/[id]/status/route.ts` - Deposit status checking
- `src/lib/deposit-helpers.ts` - Deposit utility functions
- `src/components/DepositAuthorization.tsx` - Deposit authorization UI
- Database: `deposits` table for tracking deposit records

## Technical Considerations
- **Authorization vs Capture**: Use Stripe's manual capture to authorize without charging
- **Deposit Calculation**: Configurable percentage or minimum amount
- **Security**: Validate user permissions and prevent self-deposits
- **Error Handling**: Comprehensive Stripe error handling
- **Status Tracking**: Sync local status with Stripe payment intent status
- **Refund Logic**: Support for both canceling authorizations and refunding captures

## Success Metrics
- Deposit authorization completes within 10 seconds
- Zero unauthorized deposits on seller's own listings
- Accurate deposit amount calculations based on settings
- Proper status synchronization between local DB and Stripe
- Successful refund processing for non-winning bidders
- Clear user feedback throughout the authorization process

## Dependencies
- Stripe client setup and configuration
- Existing auction and user systems
- App settings for deposit configuration
- Payment UI components and Stripe Elements
