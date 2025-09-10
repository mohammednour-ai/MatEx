# T038: Fixed Price Checkout

## Overview
Implement Stripe Checkout integration for fixed-price listings, allowing buyers to purchase items immediately without auction bidding. This system creates secure payment sessions, handles order creation, and provides success/cancel flow handling.

## Implementation Details

### Fixed Price Checkout API
```typescript
// src/app/api/checkout/fixed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe, formatAmountForStripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseServer';
import { getUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id } = await request.json();

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        price_cad,
        buy_now_cad,
        seller_id,
        status,
        pricing_type,
        seller:profiles(full_name, email)
      `)
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Validate listing is available for fixed price purchase
    if (listing.pricing_type !== 'fixed' || listing.status !== 'active') {
      return NextResponse.json(
        { error: 'Listing not available for purchase' },
        { status: 400 }
      );
    }

    // Prevent seller from buying their own listing
    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot purchase your own listing' },
        { status: 400 }
      );
    }

    // Use buy_now_cad if available, otherwise price_cad
    const price = listing.buy_now_cad || listing.price_cad;
    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid listing price' },
        { status: 400 }
      );
    }

    // Get platform fee settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'fees.transaction_percent')
      .single();

    const feePercent = settings?.value || 0.04;
    const platformFee = Math.round(price * feePercent * 100) / 100;
    const totalAmount = price + platformFee;

    // Create pending order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        type: 'fixed',
        subtotal_cad: price,
        platform_fee_cad: platformFee,
        total_cad: totalAmount,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: listing.title,
              description: `Purchase from ${listing.seller.full_name}`,
              metadata: {
                listing_id: listing.id,
                seller_id: listing.seller_id
              }
            },
            unit_amount: formatAmountForStripe(price)
          },
          quantity: 1
        },
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Platform Fee',
              description: 'MatEx service fee'
            },
            unit_amount: formatAmountForStripe(platformFee)
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel?order_id=${order.id}`,
      metadata: {
        order_id: order.id,
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        type: 'fixed_purchase'
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
          type: 'fixed_purchase'
        }
      }
    });

    // Update order with Stripe session ID
    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

    return NextResponse.json({
      checkout_url: session.url,
      order_id: order.id,
      total_amount: totalAmount
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Success Page Implementation
```typescript
// src/app/checkout/success/page.tsx
import { Suspense } from 'react';
import { CheckoutSuccess } from '@/components/CheckoutSuccess';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Suspense fallback={<div>Loading...</div>}>
          <CheckoutSuccess />
        </Suspense>
      </div>
    </div>
  );
}
```

### Success Component
```typescript
// src/components/CheckoutSuccess.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  total_cad: number;
  status: string;
  listing: {
    id: string;
    title: string;
    seller: {
      full_name: string;
    };
  };
}

export function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
      } else {
        setError('Failed to load order details');
      }
    } catch (error) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            Unable to Load Order
          </h2>
          <p className="text-red-700">{error || 'Order not found'}</p>
          <Link 
            href="/dashboard"
            className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="bg-green-50 p-8 rounded-lg">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-green-900 mb-2">
          Payment Successful!
        </h1>
        
        <p className="text-green-700 mb-6">
          Thank you for your purchase. Your order has been confirmed.
        </p>

        <div className="bg-white p-6 rounded-lg shadow-sm text-left mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-sm">{order.id}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Item:</span>
              <span className="font-medium">{order.listing.title}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Seller:</span>
              <span>{order.listing.seller.full_name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total Paid:</span>
              <span className="font-semibold text-lg">
                ${order.total_cad.toLocaleString()} CAD
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {order.status}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href={`/listings/${order.listing.id}`}
            className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            View Listing
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 font-medium"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You'll receive an email confirmation shortly</li>
            <li>• The seller will be notified of your purchase</li>
            <li>• Coordinate pickup/delivery with the seller</li>
            <li>• Leave feedback after completing the transaction</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### Cancel Page Implementation
```typescript
// src/app/checkout/cancel/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function CheckoutCancelPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      // Cancel the pending order
      cancelOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const cancelOrder = async () => {
    try {
      await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing cancellation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="bg-yellow-50 p-8 rounded-lg">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-yellow-900 mb-2">
            Payment Cancelled
          </h1>
          
          <p className="text-yellow-700 mb-6">
            Your payment was cancelled and no charges were made to your account.
          </p>

          <div className="space-y-3">
            <Link
              href="/browse"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              Continue Shopping
            </Link>
            
            <Link
              href="/dashboard"
              className="block w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Files Created/Modified
- `src/app/api/checkout/fixed/route.ts` - Fixed price checkout API
- `src/app/checkout/success/page.tsx` - Success page
- `src/app/checkout/cancel/page.tsx` - Cancel page  
- `src/components/CheckoutSuccess.tsx` - Success page component
- Database: Orders table with Stripe session tracking

## Technical Considerations
- **Security**: Validate listing ownership and availability
- **Pricing**: Include platform fees in checkout calculation
- **Order Management**: Create pending orders before payment
- **Error Handling**: Graceful handling of payment failures
- **User Experience**: Clear success/cancel flows with next steps
- **Stripe Integration**: Proper metadata for webhook processing

## Success Metrics
- Successful checkout completion rate > 95%
- Clear order confirmation and next steps
- Proper order status tracking
- Seamless integration with existing listing system
- Accurate fee calculations and payment processing
- Effective cancel flow handling

## Dependencies
- Stripe client setup and configuration
- Existing listings and user systems
- Order management infrastructure
- Email notification system for confirmations
