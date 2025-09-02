import { NextRequest, NextResponse } from 'next/server';
import { checkDepositAuthorization, getUserDepositStatuses } from '@/lib/deposit-helpers';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

const StatusQuerySchema = z.object({
  auction_id: z.string().uuid().optional(),
  auction_ids: z.string().optional(), // Comma-separated UUIDs
});

// GET /api/deposits/status - Check deposit authorization status
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      auction_id: searchParams.get('auction_id'),
      auction_ids: searchParams.get('auction_ids'),
    };

    const validatedQuery = StatusQuerySchema.parse(queryData);

    // Handle single auction status check
    if (validatedQuery.auction_id) {
      const status = await checkDepositAuthorization(user.id, validatedQuery.auction_id);
      return NextResponse.json(status);
    }

    // Handle multiple auction status check
    if (validatedQuery.auction_ids) {
      const auctionIds = validatedQuery.auction_ids.split(',').map(id => id.trim());
      
      // Validate all auction IDs are UUIDs
      const uuidSchema = z.string().uuid();
      for (const id of auctionIds) {
        uuidSchema.parse(id);
      }

      const statuses = await getUserDepositStatuses(user.id, auctionIds);
      return NextResponse.json(statuses);
    }

    return NextResponse.json(
      { error: 'Either auction_id or auction_ids parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error checking deposit status:', error);
    
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
