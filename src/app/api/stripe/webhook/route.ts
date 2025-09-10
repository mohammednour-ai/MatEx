import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabaseServer';
import { headers } from 'next/headers';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const processedEvents = new Set<string>();

// Clean up old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Clean up old processed events every 24 hours
setInterval(() => {
  processedEvents.clear();
}, 24 * 60 * 60 * 1000);

/**
 * Rate limiting for webhook requests
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Max 100 requests per minute per IP

  const key = `webhook:${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * Verify webhook signature with timestamp validation
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<any> {
  try {
    // Extract timestamp from signature
    const elements = signature.split(',');
    const timestampElement = elements.find(element => element.startsWith('t='));

    if (!timestampElement) {
      throw new Error('Missing timestamp in webhook signature');
    }

    const timestamp = parseInt(timestampElement.split('=')[1]);
    const now = Math.floor(Date.now() / 1000);

    // Reject webhooks older than 5 minutes (prevent replay attacks)
    if (now - timestamp > 300) {
      throw new Error('Webhook timestamp too old - possible replay attack');
    }

    // Verify signature using Stripe's method
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

/**
 * Process payment intent succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent: any, supabase: any) {
  try {
    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (orderError) {
      console.error('Failed to update order status:', orderError);
      return false;
    }

    // Update deposit status if applicable
    if (paymentIntent.metadata?.deposit_id) {
      const { error: depositError } = await supabase
        .from('auction_deposits')
        .update({
          status: 'captured',
          captured_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (depositError) {
        console.error('Failed to update deposit status:', depositError);
        return false;
      }
    }

    console.log(`Successfully processed payment_intent.succeeded for ${paymentIntent.id}`);
    return true;
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
    return false;
  }
}

/**
 * Process payment intent failed event
 */
async function handlePaymentIntentFailed(paymentIntent: any, supabase: any) {
  try {
    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (orderError) {
      console.error('Failed to update order status:', orderError);
      return false;
    }

    // Update deposit status if applicable
    if (paymentIntent.metadata?.deposit_id) {
      const { error: depositError } = await supabase
        .from('auction_deposits')
        .update({
          status: 'failed',
          failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (depositError) {
        console.error('Failed to update deposit status:', depositError);
        return false;
      }
    }

    console.log(`Successfully processed payment_intent.payment_failed for ${paymentIntent.id}`);
    return true;
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
    return false;
  }
}

/**
 * Process payment intent canceled event
 */
async function handlePaymentIntentCanceled(paymentIntent: any, supabase: any) {
  try {
    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (orderError) {
      console.error('Failed to update order status:', orderError);
      return false;
    }

    // Update deposit status if applicable
    if (paymentIntent.metadata?.deposit_id) {
      const { error: depositError } = await supabase
        .from('auction_deposits')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      if (depositError) {
        console.error('Failed to update deposit status:', depositError);
        return false;
      }
    }

    console.log(`Successfully processed payment_intent.canceled for ${paymentIntent.id}`);
    return true;
  } catch (error) {
    console.error('Error handling payment_intent.canceled:', error);
    return false;
  }
}

/**
 * Log webhook event for audit purposes
 */
async function logWebhookEvent(
  event: any,
  supabase: any,
  success: boolean,
  error?: string
) {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'webhook_events',
      record_id: event.id,
      action: 'WEBHOOK',
      old_values: {},
      new_values: {
        event_type: event.type,
        success,
        error: error || null,
        processed_at: new Date().toISOString()
      },
      user_id: null, // System action
      metadata: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        webhook_processed: true,
        processing_time: Date.now()
      }
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Apply rate limiting
    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get webhook signature
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get request body
    const body = await request.text();

    // Verify webhook signature and construct event
    let event;
    try {
      event = await verifyWebhookSignature(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Check for duplicate events (idempotency)
    if (processedEvents.has(event.id)) {
      console.log(`Duplicate event ${event.id} - already processed`);
      return NextResponse.json({ received: true });
    }

    // Mark event as processed
    processedEvents.add(event.id);

    console.log(`Processing webhook event: ${event.type} (${event.id})`);

    // Process different event types
    let success = false;
    let errorMessage: string | undefined;

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          success = await handlePaymentIntentSucceeded(event.data.object, supabase);
          break;

        case 'payment_intent.payment_failed':
          success = await handlePaymentIntentFailed(event.data.object, supabase);
          break;

        case 'payment_intent.canceled':
          success = await handlePaymentIntentCanceled(event.data.object, supabase);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
          success = true; // Don't treat unknown events as failures
          break;
      }
    } catch (processingError) {
      console.error(`Error processing ${event.type}:`, processingError);
      errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      success = false;
    }

    // Log the webhook event
    await logWebhookEvent(event, supabase, success, errorMessage);

    if (!success) {
      console.error(`Failed to process webhook event ${event.id}`);
      return NextResponse.json(
        { error: 'Processing failed' },
        { status: 500 }
      );
    }

    console.log(`Successfully processed webhook event ${event.id}`);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
