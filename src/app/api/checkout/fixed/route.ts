import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rateLimiter';
import { hasUserAcceptedCurrentTerms } from '@/lib/terms';
import { CheckoutCreateSchema, validateRequest } from '@/lib/schemas';

// POST: Create Stripe Checkout Session for fixed price listings
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, 'CHECKOUT');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body using centralized schema
    const raw = await request.json().catch(() => null);
    const validation = validateRequest(CheckoutCreateSchema, raw);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          message: validation.message,
          details: validation.details,
        },
        { status: 400 }
      );
    }

    const { listing_id, success_url, cancel_url } = validation.data;
    const return_url = success_url; // Map to existing variable name

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userEmailVerified =
      request.headers.get('x-user-email-verified') === 'true';
    const userKycStatus = request.headers.get('x-user-kyc-status');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Terms acceptance check (CONSENT GATING)
    const hasAccepted = await hasUserAcceptedCurrentTerms(userId);
    if (!hasAccepted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terms acceptance required',
          message:
            'Please accept the latest Terms & Conditions before making purchases',
          consent_required: true,
        },
        { status: 403 }
      );
    }

    // Check user permissions
    if (!userEmailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email verification required for purchases',
        },
        { status: 403 }
      );
    }

    if (userKycStatus !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC approval required for purchases',
        },
        { status: 403 }
      );
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabaseServer
      .from('listings')
      .select(
        `
        id,
        title,
        seller_id,
        pricing_type,
        price_cad,
        status,
        quantity,
        unit,
        material,
        condition
      `
      )
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Validate listing is available for purchase
    if (listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Listing is not available for purchase' },
        { status: 400 }
      );
    }

    if (listing.pricing_type !== 'fixed') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only for fixed price listings' },
        { status: 400 }
      );
    }

    // Prevent self-purchase
    if (listing.seller_id === userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot purchase your own listings',
        },
        { status: 403 }
      );
    }

    // Get platform fee settings
    const { data: settings } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', ['fees.transaction_percent'])
      .limit(1);

    const transactionFeePercent =
      settings?.find(s => s.key === 'fees.transaction_percent')?.value || 0.04;

    // Calculate amounts
    const subtotalCad = listing.price_cad;
    const platformFeeCad = Math.round(subtotalCad * transactionFeePercent * 100) / 100;
    const totalCad = subtotalCad + platformFeeCad;
    const sellerPayoutCad = subtotalCad - platformFeeCad;

    // Get user profile for Stripe metadata
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    // Create pending order
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert({
        listing_id: listing.id,
        buyer_id: userId,
        seller_id: listing.seller_id,
        type: 'fixed',
        total_cad: totalCad,
        platform_fee_cad: platformFeeCad,
        seller_payout_cad: sellerPayoutCad,
        status: 'pending',
        metadata: {
          subtotal_cad: subtotalCad,
          transaction_fee_percent: transactionFeePercent,
          created_via: 'checkout_api',
        },
      })
      .select('id, total_cad, status, created_at')
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { success: false, error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
              description: `${listing.quantity} ${listing.unit} of ${listing.material} (${listing.condition})`,
              metadata: {
                listing_id: listing.id,
                seller_id: listing.seller_id,
                material: listing.material,
                condition: listing.condition,
              },
            },
            unit_amount: Math.round(subtotalCad * 100), // Convert to cents
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Platform Fee',
              description: `MatEx platform fee (${(transactionFeePercent * 100).toFixed(1)}%)`,
            },
            unit_amount: Math.round(platformFeeCad * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: profile?.email,
      metadata: {
        order_id: order.id,
        listing_id: listing.id,
        buyer_id: userId,
        seller_id: listing.seller_id,
        type: 'fixed_price_purchase',
        total_cad: totalCad.toString(),
      },
      payment_intent_data: {
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
          buyer_id: userId,
          seller_id: listing.seller_id,
        },
      },
    });

    // Update order with Stripe session ID
    const { error: updateError } = await supabaseServer
      .from('orders')
      .update({
        stripe_checkout_session: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Error updating order with session ID:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Checkout session created successfully',
      data: {
        checkout_session_id: session.id,
        checkout_url: session.url,
        order_id: order.id,
        total_cad: order.total_cad,
        status: order.status,
        created_at: order.created_at,
        listing: {
          id: listing.id,
          title: listing.title,
          price_cad: listing.price_cad,
          quantity: listing.quantity,
          unit: listing.unit,
          material: listing.material,
          condition: listing.condition,
        },
        pricing: {
          subtotal_cad: subtotalCad,
          platform_fee_cad: platformFeeCad,
          total_cad: totalCad,
        },
      },
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Retrieve checkout session status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply rate limiting (more lenient for GET requests)
    const rateLimitResponse = applyRateLimit(request, 'DEFAULT');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_id parameter required' },
        { status: 400 }
      );
    }

    // Get user from headers
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Checkout session not found' },
        { status: 404 }
      );
    }

    // Get associated order
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .select(
        `
        id,
        listing_id,
        total_cad,
        status,
        created_at,
        updated_at,
        listings!inner (
          id,
          title,
          price_cad,
          material,
          condition
        )
      `
      )
      .eq('stripe_checkout_session', sessionId)
      .eq('buyer_id', userId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_email,
        },
        order: {
          id: order.id,
          listing_id: order.listing_id,
          total_cad: order.total_cad,
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          listing: order.listings,
        },
      },
    });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
