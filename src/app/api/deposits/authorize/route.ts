import { NextRequest, NextResponse } from 'next/server';
import { authorizeDeposit, DepositAuthorizationSchema } from '@/lib/deposit-helpers';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

// POST /api/deposits/authorize - Authorize deposit for auction bidding
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DepositAuthorizationSchema.parse(body);

    // Authorize deposit
    const result = await authorizeDeposit({
      auction_id: validatedData.auction_id,
      user_id: user.id,
      amount_cad: 0, // Will be calculated in authorizeDeposit function
      payment_method_id: validatedData.payment_method_id
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_intent_id: result.payment_intent_id,
      client_secret: result.client_secret,
      amount_cad: result.amount_cad,
      status: result.status,
      requires_action: result.requires_action
    });

  } catch (error) {
    console.error('Error in deposit authorization:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
