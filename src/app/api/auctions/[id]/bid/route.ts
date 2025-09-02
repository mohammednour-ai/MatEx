import { NextRequest, NextResponse } from 'next/server';
import { checkDepositAuthorization, getDepositSettings } from '@/lib/deposit-helpers';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

const BidSchema = z.object({
  amount_cad: z.number().positive(),
});

type RouteContextParams = { params?: Record<string, string | undefined> | Promise<Record<string, string | undefined>> };

export async function POST(
  request: NextRequest,
  context: RouteContextParams
) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  const auction_id = (await Promise.resolve(context?.params || {})).id;
    
    // Validate auction ID
    if (!auction_id) {
      return NextResponse.json(
        { error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BidSchema.parse(body);

    // Check if deposits are required
    const depositSettings = await getDepositSettings();
    
    if (depositSettings.deposit_required) {
      // Check if user has authorized deposit for this auction
      const depositAuth = await checkDepositAuthorization(user.id, auction_id);
      
      if (!depositAuth.is_authorized) {
        return NextResponse.json(
          { 
            error: 'Deposit authorization required to bid on this auction',
            requires_deposit: true,
            auction_id: auction_id
          },
          { status: 403 }
        );
      }
    }

    // TODO: Implement actual bidding logic in T028
    // For now, return success with deposit check passed
    return NextResponse.json({
      message: 'Deposit authorization verified. Bidding logic will be implemented in T028.',
      bid_amount: validatedData.amount_cad,
      deposit_authorized: depositSettings.deposit_required,
      auction_id: auction_id
    });

  } catch (error) {
    console.error('Auction bid error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid bid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Placeholder implementation for T034 - will be fully implemented in T028
    return NextResponse.json(
      { error: 'Auction bid retrieval not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Auction bid retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
