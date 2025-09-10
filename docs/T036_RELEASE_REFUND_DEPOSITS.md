# T036: Release/Refund Deposits

## Overview
Implement automated system to release and refund deposits when auctions close. Winner deposits are captured and applied to invoices, while non-winning deposits are automatically refunded. This system ensures proper financial handling and maintains user trust.

## Implementation Details

### Auction Close Handler
```typescript
// src/lib/auction-close-handler.ts
import { supabase } from './supabaseServer';
import { captureDeposit, refundDeposit } from './deposit-helpers';

export async function processAuctionClose(auctionId: string) {
  try {
    // Get auction details with bids
    const { data: auction } = await supabase
      .from('auctions')
      .select(`
        listing_id,
        end_at,
        listing:listings(title, seller_id),
        bids:bids(
          id,
          bidder_id,
          amount_cad,
          created_at
        )
      `)
      .eq('listing_id', auctionId)
      .single();

    if (!auction || !auction.bids?.length) return;

    // Find winning bid (highest amount, latest if tied)
    const winningBid = auction.bids
      .sort((a, b) => {
        if (a.amount_cad !== b.amount_cad) {
          return b.amount_cad - a.amount_cad;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0];

    // Get all deposits for this auction
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('status', 'authorized');

    if (!deposits?.length) return;

    // Process winner's deposit
    const winnerDeposit = deposits.find(d => d.user_id === winningBid.bidder_id);
    if (winnerDeposit) {
      const captured = await captureDeposit(winnerDeposit.id);
      if (captured) {
        console.log(`Captured winner deposit: ${winnerDeposit.id}`);
      }
    }

    // Refund non-winning deposits
    const losingDeposits = deposits.filter(d => d.user_id !== winningBid.bidder_id);
    for (const deposit of losingDeposits) {
      const refunded = await refundDeposit(deposit.id);
      if (refunded) {
        console.log(`Refunded losing deposit: ${deposit.id}`);
      }
    }

    console.log(`Processed ${deposits.length} deposits for auction ${auctionId}`);
  } catch (error) {
    console.error('Error processing auction close:', error);
  }
}
```

### Cron Job Implementation
```typescript
// src/lib/deposit-cron.ts
import { supabase } from './supabaseServer';
import { processAuctionClose } from './auction-close-handler';

export class DepositCronService {
  private static instance: DepositCronService;
  private cronInterval: NodeJS.Timeout | null = null;

  static getInstance(): DepositCronService {
    if (!DepositCronService.instance) {
      DepositCronService.instance = new DepositCronService();
    }
    return DepositCronService.instance;
  }

  startCronService() {
    if (this.cronInterval) return;

    console.log('Starting deposit processing cron service...');
    
    // Check every 5 minutes for closed auctions
    this.cronInterval = setInterval(async () => {
      await this.processClosedAuctions();
    }, 5 * 60 * 1000);

    // Run immediately on start
    this.processClosedAuctions();
  }

  stopCronService() {
    if (this.cronInterval) {
      clearInterval(this.cronInterval);
      this.cronInterval = null;
      console.log('Deposit processing cron service stopped');
    }
  }

  private async processClosedAuctions() {
    try {
      const now = new Date().toISOString();
      
      // Find auctions that have ended but haven't been processed
      const { data: closedAuctions } = await supabase
        .from('auctions')
        .select('listing_id')
        .lt('end_at', now)
        .is('processed_at', null);

      if (!closedAuctions?.length) return;

      console.log(`Processing ${closedAuctions.length} closed auctions`);

      for (const auction of closedAuctions) {
        await processAuctionClose(auction.listing_id);
        
        // Mark auction as processed
        await supabase
          .from('auctions')
          .update({ processed_at: new Date().toISOString() })
          .eq('listing_id', auction.listing_id);
      }
    } catch (error) {
      console.error('Error in deposit cron service:', error);
    }
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  DepositCronService.getInstance().startCronService();
}
```

### Manual Processing API
```typescript
// src/app/api/admin/deposits/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { processAuctionClose } from '@/lib/auction-close-handler';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auction_id } = await request.json();

    if (auction_id) {
      // Process specific auction
      await processAuctionClose(auction_id);
      return NextResponse.json({ 
        message: `Processed deposits for auction ${auction_id}` 
      });
    } else {
      // Process all closed auctions
      const { DepositCronService } = await import('@/lib/deposit-cron');
      const cronService = DepositCronService.getInstance();
      await cronService.processClosedAuctions();
      
      return NextResponse.json({ 
        message: 'Processed all closed auctions' 
      });
    }
  } catch (error) {
    console.error('Error processing deposits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Files Created/Modified
- `src/lib/auction-close-handler.ts` - Auction close processing logic
- `src/lib/deposit-cron.ts` - Automated cron service for deposit processing
- `src/app/api/admin/deposits/process/route.ts` - Manual processing endpoint
- Database: Add `processed_at` field to auctions table

## Technical Considerations
- **Automated Processing**: Cron job runs every 5 minutes to catch closed auctions
- **Winner Detection**: Proper logic to identify winning bid (highest amount, latest timestamp)
- **Atomic Operations**: Each deposit processed independently to prevent partial failures
- **Error Handling**: Graceful failure handling with detailed logging
- **Manual Override**: Admin can manually trigger processing if needed
- **Idempotency**: Prevent double-processing with `processed_at` timestamp

## Success Metrics
- 100% of closed auctions processed within 10 minutes
- Winner deposits captured successfully
- Non-winning deposits refunded within 24 hours
- Zero double-processing of auctions
- Comprehensive audit trail of all deposit operations
- Manual processing available for edge cases

## Dependencies
- Existing deposit authorization system
- Auction and bidding infrastructure
- Stripe payment processing
- Admin authentication system
