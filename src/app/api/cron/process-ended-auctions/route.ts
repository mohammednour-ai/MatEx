import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find ended auctions that haven't been processed
    const { data: endedAuctions, error: auctionsError } = await supabase
      .from('auctions')
      .select(`
        id,
        listing_id,
        end_at,
        listings!inner(
          id,
          seller_id,
          title
        ),
        bids(
          id,
          bidder_id,
          amount_cad,
          created_at
        )
      `)
      .lt('end_at', new Date().toISOString())
      .eq('status', 'active')
      .order('end_at', { ascending: true });

    if (auctionsError) {
      console.error('Error fetching ended auctions:', auctionsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const processedAuctions = [];

    for (const auction of endedAuctions || []) {
      try {
        // Find highest bid
        const highestBid = auction.bids
          .sort((a, b) => b.amount_cad - a.amount_cad)[0];

        if (highestBid) {
          // Create order for winner
          const { error: orderError } = await supabase
            .from('orders')
            .insert({
              listing_id: auction.listing_id,
              buyer_id: highestBid.bidder_id,
              seller_id: (auction.listings as any).seller_id,
              type: 'auction',
              total_cad: highestBid.amount_cad,
              status: 'pending',
              created_at: new Date().toISOString()
            });

          if (orderError) {
            console.error(`Error creating order for auction ${auction.id}:`, orderError);
            continue;
          }

          // TODO: Process deposits (capture winner, refund others)
          // This will be implemented when T036 deposit processing is available
        }

        // Mark auction as completed
        const { error: updateError } = await supabase
          .from('auctions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', auction.id);

        if (updateError) {
          console.error(`Error updating auction ${auction.id}:`, updateError);
          continue;
        }

        processedAuctions.push({
          auction_id: auction.id,
          listing_title: (auction.listings as any).title,
          winner_bid: highestBid?.amount_cad || null,
          processed_at: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error processing auction ${auction.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed_count: processedAuctions.length,
      processed_auctions: processedAuctions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
