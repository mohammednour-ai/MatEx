import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { supabaseServer } from '@/lib/supabaseServer';
import { createOrder } from '@/lib/order-helpers';
import { allowRequest } from '@/lib/rateLimiter';

// Validation schema for checkout request
const CheckoutRequestSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
  return_url: z.string().url('Invalid return URL').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const isAllowed = allowRequest(`checkout:${ip}`, 10, 60 * 1000); // 10 requests per minute
    
    if (!isAllowed) {
      return NextResponse.json(
        { 
          error: 'Too many checkout attempts. Please try again later.'
        },
        { status: 429 }
      );
    }

    // Get user context from middleware
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    const emailVerified = request.headers.get('x-email-verified') === 'true';
    const kycStatus = request.headers.get('x-kyc-status');

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required before making purchases' },
        { status: 403 }
      );
    }

    if (kycStatus !== 'approved') {
      return NextResponse.json(
        { 
          error: 'KYC approval required before making purchases',
          kyc_status: kycStatus 
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CheckoutRequestSchema.parse(body);
    const { listing_id, return_url } = validatedData;

    // Fetch listing details with seller information
    const { data: listing, error: listingError } = await supabaseServer
      .from('listings')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          full_name,
          email
        )
      `)
      .eq('id', listing_id)
      .eq('status', 'active')
      .eq('pricing_type', 'fixed')
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found or not available for purchase' },
        { status: 404 }
      );
    }

    // Prevent self-purchase
    if (listing.seller_id === userId) {
      return NextResponse.json(
        { error: 'Cannot purchase your own listing' },
        { status: 400 }
      );
    }

    // Check if listing has a price
    if (!listing.price_cad || listing.price_cad <= 0) {
      return NextResponse.json(
        { error: 'Listing does not have a valid price' },
        { status: 400 }
      );
    }

    // Get platform fee settings
    const { data: feeSettings } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'fees.transaction_percent')
      .single();

    const transactionFeePercent = feeSettings?.value || 0.04; // Default 4%
    const platformFee = Math.round(listing.price_cad * transactionFeePercent * 100) / 100;
    const totalAmount = listing.price_cad + platformFee;

    // Create pending order first
    const orderData = {
      listing_id: listing.id,
      buyer_id: userId,
      seller_id: listing.seller_id,
      type: 'fixed' as const,
      total_cad: totalAmount,
      status: 'pending' as const,
      platform_fee_cad: platformFee,
      seller_payout_cad: listing.price_cad,
      notes: `Fixed price purchase of "${listing.title}"`
    };

    const order = await createOrder(orderData);

    if (!order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = return_url || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout/cancel?order_id=${order.id}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: listing.title,
              description: `${listing.quantity} ${listing.unit} of ${listing.material}`,
              images: listing.images?.slice(0, 1) || [], // First image only
            },
            unit_amount: Math.round(listing.price_cad * 100), // Convert to cents
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Platform Fee',
              description: `Transaction fee (${(transactionFeePercent * 100).toFixed(1)}%)`,
            },
            unit_amount: Math.round(platformFee * 100), // Convert to cents
          },
          quantity: 1,
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail || undefined,
      metadata: {
        order_id: order.id as string,
        listing_id: listing.id,
        buyer_id: userId,
        seller_id: listing.seller_id,
        type: 'fixed_purchase'
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id as string,
          listing_id: listing.id,
          buyer_id: userId,
          seller_id: listing.seller_id,
          type: 'fixed_purchase'
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    // Update order with Stripe session ID
    const { error: updateError } = await supabaseServer
      .from('orders')
      .update({ 
        stripe_checkout_session: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order with session ID:', updateError);
      // Continue anyway - the order exists and session is created
    }

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      order_id: order.id,
      total_amount: totalAmount,
      platform_fee: platformFee,
      expires_at: session.expires_at
    });

  } catch (error) {
    console.error('Checkout creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific Stripe errors
      if (error.message.includes('stripe')) {
        return NextResponse.json(
          { error: 'Payment processing error. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve checkout session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get user context
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify the session belongs to the current user
    if (session.metadata?.buyer_id !== userId) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get associated order
    const { data: order } = await supabaseServer
      .from('orders')
      .select(`
        *,
        listing:listings (
          id,
          title,
          material,
          quantity,
          unit
        )
      `)
      .eq('stripe_checkout_session', sessionId)
      .eq('buyer_id', userId)
      .single();

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_email,
        expires_at: session.expires_at,
        url: session.url
      },
      order: order || null
    });

  } catch (error) {
    console.error('Checkout session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}
