import { NextRequest, NextResponse } from 'next/server';
import { processEndedAuctions, getDepositProcessingStatus } from '@/lib/auction-helpers';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

// This endpoint can be called by:
// 1. Cron job (Vercel Cron or external service)
// 2. Manual admin trigger
// 3. Server action

const ProcessEndedQuerySchema = z.object({
  auction_id: z.string().uuid().optional(),
  force: z.string().optional().transform(val => val === 'true'),
});

// POST /api/auctions/process-ended - Process ended auctions and handle deposits
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization or cron secret
  const cronSecret = request.headers.get('x-cron-secret');

  // Allow cron jobs with secret
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      console.log('Processing ended auctions via cron job');
    } else {
      // Require admin authentication for manual triggers
      const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const profileRecord = (profile as unknown) as { role?: string } | null;

      if (profileError || profileRecord?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      auction_id: searchParams.get('auction_id'),
      force: searchParams.get('force'),
    };

    const validatedQuery = ProcessEndedQuerySchema.parse(queryData);

    // Process specific auction if provided
    if (validatedQuery.auction_id) {
      const { processAuctionDeposits } = await import('@/lib/auction-helpers');
      const result = await processAuctionDeposits(validatedQuery.auction_id);
      
      return NextResponse.json({
        success: result.success,
        auction_id: validatedQuery.auction_id,
        captured_deposits: result.captured_deposits.length,
        cancelled_deposits: result.cancelled_deposits.length,
        errors: result.errors
      });
    }

    // Process all ended auctions
    const result = await processEndedAuctions();

    return NextResponse.json({
      success: result.errors.length === 0,
      processed_auctions: result.processed_auctions,
      successful_auctions: result.successful_auctions,
      failed_auctions: result.processed_auctions - result.successful_auctions,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing ended auctions:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/auctions/process-ended - Get processing status for auctions
export async function GET(request: NextRequest) {
  try {
    // Require authentication for status checks
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auction_id');

    if (auctionId) {
      // Get status for specific auction
      const status = await getDepositProcessingStatus(auctionId);
      return NextResponse.json(status);
    }

    // Get summary of all auctions needing processing
    const { getEndedAuctions } = await import('@/lib/auction-helpers');
    const endedAuctionIds = await getEndedAuctions();

    const summary = {
      pending_auctions: endedAuctionIds.length,
      auction_ids: endedAuctionIds,
      last_check: new Date().toISOString()
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error getting auction processing status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
