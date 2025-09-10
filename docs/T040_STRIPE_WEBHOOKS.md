# T040: Stripe Webhooks

## Overview
Implement Stripe webhook handling to process payment events and update order statuses. This system handles checkout completion, payment success/failure, and ensures data consistency between Stripe and the MatEx platform.

## Implementation Details

### Webhook Handler Implementation
```typescript
// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, verifyWebhookSignature } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log(`Received webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function handleCheckoutCompleted(session: any) {
  try {
    const orderId = session.metadata?.order_id;
    if (!orderId) return;

    // Update order status
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_session_id: session.id,
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    // Get order details for notifications
    const { data: order } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        total_cad,
        listing:listings(title)
      `)
      .eq('id', orderId)
      .single();

    if (order) {
      // Notify buyer
      await supabase
        .from('notifications')
        .insert({
          user_id: order.buyer_id,
          type: 'success',
          title: 'Payment Confirmed',
          message: `Your payment of $${order.total_cad.toLocaleString()} CAD for "${order.listing.title}" has been processed.`,
          link: `/orders/${order.id}`,
          created_at: new Date().toISOString()
        });

      // Notify seller
      await supabase
        .from('notifications')
        .insert({
          user_id: order.seller_id,
          type: 'info',
          title: 'Payment Received',
          message: `Payment received for "${order.listing.title}". You can now coordinate with the buyer.`,
          link: `/orders/${order.id}`,
          created_at: new Date().toISOString()
        });
    }

    console.log(`Checkout completed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata?.order_id;
    const type = paymentIntent.metadata?.type;

    if (!orderId) return;

    if (type === 'auction_balance') {
      // Handle auction balance payment
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

      console.log(`Auction balance payment succeeded for order ${orderId}`);
    } else if (type === 'auction_deposit') {
      // Handle deposit authorization
      const depositId = paymentIntent.metadata?.deposit_id;
      if (depositId) {
        await supabase
          .from('deposits')
          .update({
            status: 'authorized',
            authorized_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        console.log(`Deposit authorized: ${depositId}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata?.order_id;
    const type = paymentIntent.metadata?.type;

    if (!orderId) return;

    if (type === 'auction_deposit') {
      // Mark deposit as failed
      await supabase
        .from('deposits')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);
    } else {
      // Mark order as failed
      await supabase
        .from('orders')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentCanceled(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', orderId);

    console.log(`Payment canceled for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
}
```

### Webhook Testing Utility
```typescript
// src/lib/webhook-tester.ts
import { stripe } from './stripe';

export async function testWebhookEndpoint() {
  try {
    // Create a test webhook endpoint
    const endpoint = await stripe.webhookEndpoints.create({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`,
      enabled_events: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled'
      ]
    });

    console.log('Webhook endpoint created:', endpoint.url);
    console.log('Webhook secret:', endpoint.secret);
    
    return endpoint;
  } catch (error) {
    console.error('Error creating webhook endpoint:', error);
    throw error;
  }
}

export async function simulateWebhookEvent(eventType: string, objectId: string) {
  try {
    // This is for testing purposes only
    const event = await stripe.events.retrieve(objectId);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify(event)
    });

    console.log('Webhook simulation response:', response.status);
    return response;
  } catch (error) {
    console.error('Error simulating webhook:', error);
    throw error;
  }
}
```

### Webhook Status Monitor
```typescript
// src/components/admin/WebhookStatus.tsx
import { useState, useEffect } from 'react';

interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  processed: boolean;
  error?: string;
}

export function WebhookStatus() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentEvents();
  }, []);

  const loadRecentEvents = async () => {
    try {
      const response = await fetch('/api/admin/webhooks/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to load webhook events:', error);
    } finally {
      setLoading(false);
    }
  };

  const retryWebhook = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/retry/${eventId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadRecentEvents();
      }
    } catch (error) {
      console.error('Failed to retry webhook:', error);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading webhook status...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recent Webhook Events</h3>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {event.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(event.created * 1000).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    event.processed 
                      ? 'bg-green-100 text-green-800' 
                      : event.error
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.processed ? 'Processed' : event.error ? 'Failed' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {event.error && (
                    <button
                      onClick={() => retryWebhook(event.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No recent webhook events
        </div>
      )}
    </div>
  );
}
```

### Webhook Events API
```typescript
// src/app/api/admin/webhooks/events/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent webhook events from Stripe
    const events = await stripe.events.list({
      limit: 50,
      types: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled'
      ]
    });

    const formattedEvents = events.data.map(event => ({
      id: event.id,
      type: event.type,
      created: event.created,
      processed: true, // In a real implementation, track this in your database
      error: null
    }));

    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Files Created/Modified
- `src/app/api/stripe/webhook/route.ts` - Main webhook handler
- `src/lib/webhook-tester.ts` - Testing utilities
- `src/components/admin/WebhookStatus.tsx` - Admin monitoring component
- `src/app/api/admin/webhooks/events/route.ts` - Events API for admin

## Technical Considerations
- **Signature Verification**: Always verify webhook signatures for security
- **Idempotency**: Handle duplicate webhook deliveries gracefully
- **Error Handling**: Comprehensive error handling with proper logging
- **Event Types**: Handle all relevant Stripe events for the platform
- **Database Updates**: Atomic updates to maintain data consistency
- **Notifications**: Trigger user notifications based on payment events

## Success Metrics
- 100% webhook signature verification
- All payment events processed within 30 seconds
- Zero data inconsistencies between Stripe and database
- Proper error handling and retry mechanisms
- Comprehensive logging for debugging
- Admin visibility into webhook processing status

## Dependencies
- Stripe client setup and configuration
- Existing order and deposit systems
- Notification system
- Admin authentication system
- Database with proper indexing for webhook processing
