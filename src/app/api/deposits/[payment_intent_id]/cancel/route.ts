import { NextRequest, NextResponse } from 'next/server';
import { cancelDeposit } from '@/lib/deposit-helpers';
import { supabaseServer } from '@/lib/supabaseServer';

// POST /api/deposits/[payment_intent_id]/cancel - Cancel authorized deposit
export async function POST(request: NextRequest, context: { params: Promise<{ payment_intent_id: string }> }) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  const { payment_intent_id } = await context.params;

    if (!payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this deposit
    const { data: deposit, error: depositError } = await supabaseServer
      .from('auction_deposits')
      .select('user_id, status')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single();

    const depositRecord = (deposit as unknown) as { user_id: string; status: string } | null;

    if (depositError || !depositRecord) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (depositRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this deposit' },
        { status: 403 }
      );
    }

    if (depositRecord.status !== 'authorized') {
      return NextResponse.json(
        { error: 'Deposit is not in authorized status' },
        { status: 400 }
      );
    }

    // Cancel the deposit
    const result = await cancelDeposit(payment_intent_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling deposit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
