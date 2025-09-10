import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';
import { hasUserAcceptedCurrentTerms } from '@/lib/terms';

// POST: Authorize deposit for auction bidding
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`deposit_authorize:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(`deposit_authorize:${ip}`, 5, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(
              Math.ceil((status.reset - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Validate request body
    const DepositSchema = z.object({
      auction_id: z.string().uuid(),
      return_url: z.string().url().optional(),
    });

    const raw = await request.json().catch(() => null);
    const parsed = DepositSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      const message = [
        ...(errors.formErrors || []),
        ...Object.values(errors.fieldErrors || {}).flatMap(v => v || []),
      ].join('; ');

      return NextResponse.json(
        { success: false, error: 'Invalid request', message },
        { status: 400 }
      );
    }

    const { auction_id, return_url } = parsed.data;

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
            'Please accept the latest Terms & Conditions before authorizing deposits',
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
          error: 'Email verification required to authorize deposits',
        },
        { status: 403 }
      );
    }

    if (userKycStatus !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'KYC approval required to authorize deposits',
        },
        { status: 403 }
      );
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(
        `
        id,
        listing_id,
        start_at,
        end_at,
        listings!inner (
          id,
          title,
          seller_id,
          pricing_type,
          price_cad,
          buy_now_price_cad
        )
      `
      )
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Prevent self-deposit (sellers can't bid on their own auctions)
    if (auction.listings.seller_id === userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sellers cannot authorize deposits for their own auctions',
        },
        { status: 403 }
      );
    }

    // Check if auction is active or upcoming
    const now = new Date();
    const startAt = new Date(auction.start_at);
    const endAt = new Date(auction.end_at);

    if (now > endAt) {
      return NextResponse.json(
        { success: false, error: 'Auction has ended' },
        { status: 400 }
      );
    }

    // Get deposit settings
    const { data: settings } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', ['auction.deposit_percent', 'auction.deposit_required'])
      .limit(2);

    const depositRequired =
      settings?.find(s => s.key === 'auction.deposit_required')?.value || true;
    const depositPercent =
      settings?.find(s => s.key === 'auction.deposit_percent')?.value || 0.1;

    if (!depositRequired) {
      return NextResponse.json(
        { success: false, error: 'Deposits not required for this auction' },
        { status: 400 }
      );
    }

    // Check if user already has authorized deposit for this auction
    const { data: existingDeposit } = await supabaseServer
      .from('auction_deposits')
      .select('id, stripe_payment_intent_id, status, amount_cad')
      .eq('user_id', userId)
      .eq('auction_id', auction_id)
      .eq('status', 'authorized')
      .single();

    if (existingDeposit) {
      return NextResponse.json({
        success: true,
        message: 'Deposit already authorized',
        data: {
          deposit_id: existingDeposit.id,
          payment_intent_id: existingDeposit.stripe_payment_intent_id,
          amount_cad: existingDeposit.amount_cad,
          status: existingDeposit.status,
          already_authorized: true,
        },
      });
    }

    // Calculate deposit amount
    const baseAmount =
      auction.listings.buy_now_price_cad || auction.listings.price_cad || 1000;
    const depositAmountCad = Math.max(
      50,
      Math.round(baseAmount * depositPercent * 100) / 100
    ); // Minimum $50 CAD
    const depositAmountCents = Math.round(depositAmountCad * 100);

    // Get user profile for Stripe metadata
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    // Create Stripe PaymentIntent with capture_method: manual (authorization only)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositAmountCents,
      currency: 'cad',
      capture_method: 'manual', // Authorization only, capture later
      payment_method_types: ['card'],
      metadata: {
        type: 'auction_deposit',
        auction_id: auction_id,
        listing_id: auction.listing_id,
        user_id: userId,
        listing_title: auction.listings.title,
        deposit_amount_cad: depositAmountCad.toString(),
      },
      description: `Deposit authorization for auction: ${auction.listings.title}`,
      receipt_email: profile?.email || undefined,
    });

    // Store deposit record in database
    const { data: deposit, error: depositError } = await supabaseServer
      .from('auction_deposits')
      .insert({
        user_id: userId,
        auction_id: auction_id,
        listing_id: auction.listing_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cad: depositAmountCad,
        status: 'pending',
        metadata: {
          stripe_client_secret: paymentIntent.client_secret,
          return_url: return_url,
          created_via: 'api',
        },
      })
      .select('id, amount_cad, status, created_at')
      .single();

    if (depositError) {
      console.error('Error creating deposit record:', depositError);

      // Cancel the Stripe PaymentIntent if database insert fails
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error(
          'Error canceling PaymentIntent after database failure:',
          cancelError
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to create deposit record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit authorization created successfully',
      data: {
        deposit_id: deposit.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount_cad: deposit.amount_cad,
        status: deposit.status,
        created_at: deposit.created_at,
        auction: {
          id: auction.id,
          title: auction.listings.title,
          start_at: auction.start_at,
          end_at: auction.end_at,
        },
      },
    });
  } catch (error) {
    console.error('Error authorizing deposit:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check deposit authorization status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`deposit_status:${ip}`, 20, 60_000)) {
      const status = getRateLimitStatus(`deposit_status:${ip}`, 20, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auction_id');

    if (!auctionId) {
      return NextResponse.json(
        { success: false, error: 'auction_id parameter required' },
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

    // Get deposit status
    const { data: deposit, error: depositError } = await supabaseServer
      .from('auction_deposits')
      .select(
        'id, stripe_payment_intent_id, amount_cad, status, created_at, updated_at'
      )
      .eq('user_id', userId)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (depositError || !deposit) {
      return NextResponse.json({
        success: true,
        data: {
          has_deposit: false,
          deposit: null,
          authorized: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        has_deposit: true,
        deposit: {
          id: deposit.id,
          payment_intent_id: deposit.stripe_payment_intent_id,
          amount_cad: deposit.amount_cad,
          status: deposit.status,
          created_at: deposit.created_at,
          updated_at: deposit.updated_at,
        },
        authorized: deposit.status === 'authorized',
      },
    });
  } catch (error) {
    console.error('Error checking deposit status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
