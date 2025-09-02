import { supabaseServer } from './supabaseServer';
import { captureDeposit, cancelDeposit } from './deposit-helpers';
import { createAuctionWinnerOrder } from './order-helpers';

export interface AuctionResult {
  auction_id: string;
  winner_id?: string;
  winning_bid?: number;
  status: 'completed' | 'cancelled' | 'no_bids';
}

export interface DepositProcessingResult {
  success: boolean;
  captured_deposits: string[];
  cancelled_deposits: string[];
  errors: string[];
}

// Check if auction has ended and needs processing
export async function getEndedAuctions(): Promise<string[]> {
  try {
    const { data: auctions, error } = await supabaseServer
      .from('auctions')
      .select('id')
      .lt('end_at', new Date().toISOString())
      .eq('status', 'active'); // Assuming we have a status field

    if (error) {
      console.error('Error fetching ended auctions:', error);
      return [];
    }

  return auctions?.map((auction: unknown) => (auction as { id?: string }).id).filter(Boolean) as string[] || [];
  } catch (error) {
    console.error('Error in getEndedAuctions:', error);
    return [];
  }
}

// Get auction result with winner information
export async function getAuctionResult(auction_id: string): Promise<AuctionResult> {
  try {
    // Get the highest bid for this auction
    const { data: highestBid, error: bidError } = await supabaseServer
      .from('bids')
      .select(`
        bidder_id,
        amount_cad,
        auction:auctions(
          id,
          listing:listings(
            id,
            title
          )
        )
      `)
      .eq('auction_id', auction_id)
      .order('amount_cad', { ascending: false })
      .order('created_at', { ascending: true }) // First bid wins in case of tie
      .limit(1)
      .single();

    if (bidError && bidError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching highest bid:', bidError);
      return {
        auction_id,
        status: 'cancelled'
      };
    }

    if (!highestBid) {
      return {
        auction_id,
        status: 'no_bids'
      };
    }

    return {
      auction_id,
      winner_id: highestBid.bidder_id,
      winning_bid: highestBid.amount_cad,
      status: 'completed'
    };
  } catch (error) {
    console.error('Error getting auction result:', error);
    return {
      auction_id,
      status: 'cancelled'
    };
  }
}

// Process deposits for a completed auction
export async function processAuctionDeposits(auction_id: string): Promise<DepositProcessingResult> {
  const result: DepositProcessingResult = {
    success: true,
    captured_deposits: [],
    cancelled_deposits: [],
    errors: []
  };

  try {
    // Get auction result
    const auctionResult = await getAuctionResult(auction_id);

    // Get all authorized deposits for this auction
    const { data: deposits, error: depositsError } = await supabaseServer
      .from('auction_deposits')
      .select('user_id, stripe_payment_intent_id, amount_cad, status')
      .eq('auction_id', auction_id)
      .eq('status', 'authorized');

    if (depositsError) {
      result.success = false;
      result.errors.push(`Failed to fetch deposits: ${depositsError.message}`);
      return result;
    }

    if (!deposits || deposits.length === 0) {
      console.log(`No authorized deposits found for auction ${auction_id}`);
      return result;
    }

    // Process each deposit
    for (const deposit of deposits) {
      try {
        if (auctionResult.status === 'completed' && 
            auctionResult.winner_id === deposit.user_id) {
          // Capture winner's deposit
          const captureResult = await captureDeposit(deposit.stripe_payment_intent_id);
          
          if (captureResult.success) {
            result.captured_deposits.push(deposit.stripe_payment_intent_id);
            console.log(`Captured deposit ${deposit.stripe_payment_intent_id} for winner ${deposit.user_id}`);
            
            // Create order for the winner
            const orderResult = await createAuctionWinnerOrder({
              auction_id: auction_id,
              winner_id: deposit.user_id,
              winning_bid_amount: auctionResult.winning_bid!,
              deposit_amount: deposit.amount_cad
            });
            
            if (!orderResult.success) {
              result.errors.push(`Failed to create order for winner: ${orderResult.error}`);
              console.error(`Failed to create order for auction ${auction_id} winner ${deposit.user_id}:`, orderResult.error);
            } else {
              console.log(`Created order ${orderResult.order_id} for auction ${auction_id} winner`);
            }
          } else {
            result.errors.push(`Failed to capture deposit ${deposit.stripe_payment_intent_id}: ${captureResult.error}`);
            result.success = false;
          }
        } else {
          // Cancel all other deposits (losers or no winner)
          const cancelResult = await cancelDeposit(deposit.stripe_payment_intent_id);
          
          if (cancelResult.success) {
            result.cancelled_deposits.push(deposit.stripe_payment_intent_id);
            console.log(`Cancelled deposit ${deposit.stripe_payment_intent_id} for user ${deposit.user_id}`);
          } else {
            result.errors.push(`Failed to cancel deposit ${deposit.stripe_payment_intent_id}: ${cancelResult.error}`);
            result.success = false;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing deposit ${deposit.stripe_payment_intent_id}: ${errorMessage}`);
        result.success = false;
      }
    }

    // Update auction status to processed
    if (result.success) {
      const { error: updateError } = await supabaseServer
        .from('auctions')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', auction_id);

      if (updateError) {
        result.errors.push(`Failed to update auction status: ${updateError.message}`);
        result.success = false;
      }
    }

    return result;
  } catch (error) {
    console.error('Error processing auction deposits:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

// Process all ended auctions
export async function processEndedAuctions(): Promise<{
  processed_auctions: number;
  successful_auctions: number;
  errors: string[];
}> {
  const summary = {
    processed_auctions: 0,
    successful_auctions: 0,
    errors: [] as string[]
  };

  try {
    const endedAuctionIds = await getEndedAuctions();
    
    if (endedAuctionIds.length === 0) {
      console.log('No ended auctions to process');
      return summary;
    }

    console.log(`Processing ${endedAuctionIds.length} ended auctions`);

    for (const auctionId of endedAuctionIds) {
      summary.processed_auctions++;
      
      try {
        const result = await processAuctionDeposits(auctionId);
        
        if (result.success) {
          summary.successful_auctions++;
          console.log(`Successfully processed auction ${auctionId}:`, {
            captured: result.captured_deposits.length,
            cancelled: result.cancelled_deposits.length
          });
        } else {
          summary.errors.push(`Auction ${auctionId}: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        summary.errors.push(`Auction ${auctionId}: ${errorMessage}`);
      }
    }

    return summary;
  } catch (error) {
    console.error('Error in processEndedAuctions:', error);
    summary.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return summary;
  }
}

// Get deposit processing status for an auction
export async function getDepositProcessingStatus(auction_id: string): Promise<{
  auction_status: string;
  total_deposits: number;
  captured_deposits: number;
  cancelled_deposits: number;
  pending_deposits: number;
}> {
  try {
    // Get auction status
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select('status, processed_at')
      .eq('id', auction_id)
      .single();

    if (auctionError) {
      throw new Error(`Failed to fetch auction: ${auctionError.message}`);
    }

    // Get deposit counts by status
    const { data: deposits, error: depositsError } = await supabaseServer
      .from('auction_deposits')
      .select('status')
      .eq('auction_id', auction_id);

    if (depositsError) {
      throw new Error(`Failed to fetch deposits: ${depositsError.message}`);
    }

    const depositCounts = deposits?.reduce((acc: Record<string, number>, deposit: unknown) => {
      const d = deposit as { status?: string };
      const key = d.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      auction_status: auction.status || 'unknown',
      total_deposits: deposits?.length || 0,
      captured_deposits: depositCounts.captured || 0,
      cancelled_deposits: depositCounts.cancelled || 0,
      pending_deposits: depositCounts.authorized || 0
    };
  } catch (error) {
    console.error('Error getting deposit processing status:', error);
    throw error;
  }
}
