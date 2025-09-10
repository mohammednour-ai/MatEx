# T039: Auction Winner Invoice

## Overview
Generate and process invoices for auction winners, calculating final amounts after deducting captured deposits and applying platform fees. This system creates payment intents for remaining balances and manages the complete auction-to-payment workflow.

## Implementation Details

### Invoice Generation API
```typescript
// src/app/api/invoices/auction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auction_id } = await request.json();

    // Get auction details with winning bid
    const { data: auction } = await supabase
      .from('auctions')
      .select(`
        listing_id,
        end_at,
        listing:listings(
          id,
          title,
          seller_id,
          seller:profiles(full_name, email)
        ),
        bids:bids(
          id,
          bidder_id,
          amount_cad,
          created_at,
          bidder:profiles(full_name, email)
        )
      `)
      .eq('listing_id', auction_id)
      .single();

    if (!auction || !auction.bids?.length) {
      return NextResponse.json({ error: 'No bids found for auction' }, { status: 404 });
    }

    // Find winning bid
    const winningBid = auction.bids
      .sort((a, b) => {
        if (a.amount_cad !== b.amount_cad) {
          return b.amount_cad - a.amount_cad;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0];

    // Check if invoice already exists
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('listing_id', auction.listing.id)
      .eq('buyer_id', winningBid.bidder_id)
      .eq('type', 'auction')
      .single();

    if (existingOrder) {
      return NextResponse.json(
        { error: 'Invoice already exists for this auction' },
        { status: 400 }
      );
    }

    // Get winner's deposit
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('auction_id', auction_id)
      .eq('user_id', winningBid.bidder_id)
      .eq('status', 'captured')
      .single();

    // Get platform fee settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'fees.transaction_percent')
      .single();

    const feePercent = settings?.value || 0.04;
    const platformFee = Math.round(winningBid.amount_cad * feePercent * 100) / 100;
    const depositAmount = deposit?.amount_cad || 0;
    const remainingBalance = winningBid.amount_cad + platformFee - depositAmount;

    // Create order/invoice
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        listing_id: auction.listing.id,
        buyer_id: winningBid.bidder_id,
        seller_id: auction.listing.seller_id,
        type: 'auction',
        subtotal_cad: winningBid.amount_cad,
        platform_fee_cad: platformFee,
        deposit_applied_cad: depositAmount,
        total_cad: winningBid.amount_cad + platformFee,
        remaining_balance_cad: Math.max(remainingBalance, 0),
        status: remainingBalance > 0 ? 'pending' : 'paid',
        winning_bid_id: winningBid.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    let paymentIntent = null;

    // Create payment intent for remaining balance if needed
    if (remainingBalance > 0) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(remainingBalance),
        currency: 'cad',
        customer_email: winningBid.bidder.email,
        metadata: {
          type: 'auction_balance',
          order_id: order.id,
          auction_id: auction_id,
          listing_id: auction.listing.id,
          buyer_id: winningBid.bidder_id,
          seller_id: auction.listing.seller_id
        },
        description: `Remaining balance for "${auction.listing.title}"`,
        receipt_email: winningBid.bidder.email
      });

      // Update order with payment intent
      await supabase
        .from('orders')
        .update({ stripe_payment_intent: paymentIntent.id })
        .eq('id', order.id);
    }

    // Send notification to winner
    await supabase
      .from('notifications')
      .insert({
        user_id: winningBid.bidder_id,
        type: 'success',
        title: 'Congratulations! You won the auction',
        message: `You won "${auction.listing.title}" with a bid of $${winningBid.amount_cad.toLocaleString()} CAD. ${remainingBalance > 0 ? 'Please complete payment for the remaining balance.' : 'Your payment is complete.'}`,
        link: `/orders/${order.id}`,
        created_at: new Date().toISOString()
      });

    // Send notification to seller
    await supabase
      .from('notifications')
      .insert({
        user_id: auction.listing.seller_id,
        type: 'info',
        title: 'Your auction has ended',
        message: `"${auction.listing.title}" sold to ${winningBid.bidder.full_name} for $${winningBid.amount_cad.toLocaleString()} CAD.`,
        link: `/orders/${order.id}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      order_id: order.id,
      winning_bid_amount: winningBid.amount_cad,
      platform_fee: platformFee,
      deposit_applied: depositAmount,
      remaining_balance: Math.max(remainingBalance, 0),
      payment_required: remainingBalance > 0,
      client_secret: paymentIntent?.client_secret
    });

  } catch (error) {
    console.error('Error generating auction invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Invoice Display Component
```typescript
// src/components/AuctionInvoice.tsx
import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { StripeProvider } from './StripeProvider';

interface InvoiceData {
  id: string;
  subtotal_cad: number;
  platform_fee_cad: number;
  deposit_applied_cad: number;
  total_cad: number;
  remaining_balance_cad: number;
  status: string;
  listing: {
    title: string;
    seller: {
      full_name: string;
    };
  };
  stripe_payment_intent?: string;
}

interface AuctionInvoiceProps {
  orderId: string;
}

export function AuctionInvoice({ orderId }: AuctionInvoiceProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [orderId]);

  const loadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.order);
        
        // Get payment intent client secret if balance remaining
        if (data.order.remaining_balance_cad > 0 && data.order.stripe_payment_intent) {
          const paymentResponse = await fetch(`/api/orders/${orderId}/payment-intent`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            setClientSecret(paymentData.client_secret);
          }
        }
      } else {
        setError('Failed to load invoice');
      }
    } catch (error) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <p className="text-red-800">{error || 'Invoice not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-green-900 mb-2">
          🎉 Congratulations! You won the auction!
        </h2>
        <p className="text-green-800">
          You successfully won "{invoice.listing.title}" from {invoice.listing.seller.full_name}
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Winning Bid:</span>
            <span className="font-medium">${invoice.subtotal_cad.toLocaleString()} CAD</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Platform Fee ({((invoice.platform_fee_cad / invoice.subtotal_cad) * 100).toFixed(1)}%):</span>
            <span className="font-medium">${invoice.platform_fee_cad.toLocaleString()} CAD</span>
          </div>
          
          <div className="flex justify-between border-t pt-3">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">${invoice.total_cad.toLocaleString()} CAD</span>
          </div>
          
          {invoice.deposit_applied_cad > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Deposit Applied:</span>
              <span className="font-medium">-${invoice.deposit_applied_cad.toLocaleString()} CAD</span>
            </div>
          )}
          
          <div className="flex justify-between border-t pt-3 text-lg font-bold">
            <span>Remaining Balance:</span>
            <span>${invoice.remaining_balance_cad.toLocaleString()} CAD</span>
          </div>
        </div>
      </div>

      {invoice.remaining_balance_cad > 0 ? (
        <PaymentSection 
          clientSecret={clientSecret}
          remainingBalance={invoice.remaining_balance_cad}
          onPaymentSuccess={() => loadInvoice()}
        />
      ) : (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Payment Complete!</h4>
          <p className="text-blue-800 text-sm">
            Your payment has been processed. The seller will be notified and will contact you regarding pickup/delivery.
          </p>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• You'll receive an email confirmation</li>
          <li>• The seller will contact you to arrange pickup/delivery</li>
          <li>• Complete the transaction and leave feedback</li>
          <li>• Contact support if you have any issues</li>
        </ul>
      </div>
    </div>
  );
}

function PaymentSection({ 
  clientSecret, 
  remainingBalance, 
  onPaymentSuccess 
}: {
  clientSecret: string | null;
  remainingBalance: number;
  onPaymentSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!stripe || !elements || !clientSecret) return;

    setProcessing(true);
    setError(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required'
      });

      if (error) {
        setError(error.message || 'Payment failed');
      } else {
        onPaymentSuccess();
      }
    } catch (error) {
      setError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-yellow-800">Loading payment form...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Complete Payment - ${remainingBalance.toLocaleString()} CAD
      </h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <PaymentElement />
        
        <button
          onClick={handlePayment}
          disabled={processing || !stripe || !elements}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {processing ? 'Processing...' : `Pay $${remainingBalance.toLocaleString()} CAD`}
        </button>
      </div>
    </div>
  );
}

// Wrapper component with Stripe provider
export function AuctionInvoiceWithStripe({ orderId }: { orderId: string }) {
  return (
    <StripeProvider>
      <AuctionInvoice orderId={orderId} />
    </StripeProvider>
  );
}
```

## Files Created/Modified
- `src/app/api/invoices/auction/route.ts` - Invoice generation API
- `src/components/AuctionInvoice.tsx` - Invoice display and payment component
- Database: Enhanced orders table with auction-specific fields
- Integration with existing deposit and notification systems

## Technical Considerations
- **Deposit Integration**: Properly deduct captured deposits from final amount
- **Fee Calculation**: Apply platform fees to winning bid amount
- **Payment Processing**: Handle remaining balance payments via Stripe
- **Notification System**: Notify both winner and seller of auction completion
- **Error Handling**: Prevent duplicate invoice generation
- **Security**: Admin-only invoice generation with proper validation

## Success Metrics
- Accurate invoice calculations including deposits and fees
- Successful payment processing for remaining balances
- Timely notifications to both parties
- Clear invoice presentation with payment options
- Zero calculation errors or duplicate invoices
- Seamless integration with existing auction workflow

## Dependencies
- Existing auction and bidding system
- Deposit authorization and capture system
- Stripe payment processing
- Notification system
- Order management infrastructure
