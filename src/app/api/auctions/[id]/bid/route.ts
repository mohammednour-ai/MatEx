import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';
import { hasUserAcceptedCurrentTerms } from '@/lib/terms';
import { isDepositAuthorizedForAuction } from '@/lib/deposit-helpers';
import { 
  getAuctionWithBids, 
  getAuctionSettings, 
  computeAuctionState, 
  validateBidAmount,
  isInSoftClose,
  calculateSoftCloseExtension
} from '@/lib/auction-helpers';
import { 
  sendOutbidNotification,
  sendNewBidNotification 
} from '@/lib/notification-helpers';

interface BidRequest {
  amount_cad: number;
}

interface BidResponse {
  success: boolean;
  bid?: {
    id: string;
    amount_cad: number;
    created_at: string;
  };
  auction_state?: {
    isActive: boolean;
    timeLeft: number;
    currentHighBid: number;
    minNextBid: number;
    totalBids: number;
    hasEnded: boolean;
    hasStarted: boolean;
  };
  soft_close_extended?: boolean;
  new_end_time?: string;
  error?: string;
  message?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<BidResponse>> {
  try {
    const auctionId = params.id;
    // Rate limit per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`bid_post:${ip}`, 10, 60_000)) {
      const status = getRateLimitStatus(`bid_post:${ip}`, 10, 60_000);
      return NextResponse.json({ success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() }, { status: 429 });
    }

    // Validate request body with Zod
    const BidSchema = z.object({ amount_cad: z.number().positive() });
    const raw = await request.json().catch(() => null);
    const parsed = BidSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msg = [
        ...(flat.formErrors || []),
        ...Object.values(flat.fieldErrors || {}).flatMap(v => v || [])
      ].join('; ');
      return NextResponse.json({ success: false, error: 'Bad Request', message: msg || 'Invalid request' }, { status: 400 });
    }
    const bidData = parsed.data as BidRequest;

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userEmailVerified = request.headers.get('x-user-email-verified') === 'true';
    const userKycStatus = request.headers.get('x-user-kyc-status');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Terms acceptance check
    const hasAccepted = await hasUserAcceptedCurrentTerms(userId);
    if (!hasAccepted) {
      return NextResponse.json({ success: false, error: 'Terms acceptance required', message: 'Please accept the latest Terms & Conditions before bidding' }, { status: 403 });
    }

    // Check user permissions
    if (!userEmailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email verification required to place bids' },
        { status: 403 }
      );
    }

    if (userKycStatus !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'KYC approval required to place bids' },
        { status: 403 }
      );
    }

    // Get auction with current bids
    const auction = await getAuctionWithBids(auctionId);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Get auction settings
    const settings = await getAuctionSettings();

    // Compute current auction state
    const auctionState = computeAuctionState(auction, settings);

    // Validate auction is active
    if (!auctionState.isActive) {
      const message = auctionState.hasEnded ? 'Auction has ended' : 'Auction has not started yet';
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    // Validate bid amount against auction rules
    const bidValidation = validateBidAmount(bidData.amount_cad, auction, settings);
    if (!bidValidation.isValid) {
      return NextResponse.json(
        { success: false, error: bidValidation.error },
        { status: 400 }
      );
    }

    // Check if user is the seller (prevent self-bidding)
    const { data: listing } = await supabaseServer
      .from('listings')
      .select('seller_id')
      .eq('id', auction.listing_id)
      .single();

    if (listing?.seller_id === userId) {
      return NextResponse.json(
        { success: false, error: 'Sellers cannot bid on their own auctions' },
        { status: 403 }
      );
    }

    // Deposit authorization guard
    if (settings.deposit_required) {
      const authorized = await isDepositAuthorizedForAuction(userId, auctionId);
      if (!authorized) {
        return NextResponse.json({ success: false, error: 'Deposit required', message: 'Deposit authorization required before bidding' }, { status: 403 });
      }
    }

    // Check if auction is in soft close period
    const inSoftClose = isInSoftClose(auction, settings);
    let softCloseExtended = false;
    let newEndTime: string | undefined;

    // Start database transaction for bid insertion and potential soft close extension
  const { data: insertedBid, error: bidError } = await supabaseServer
      .from('bids')
      .insert({
        auction_id: auctionId,
        bidder_id: userId,
        amount_cad: bidData.amount_cad
      })
      .select('id, amount_cad, created_at')
      .single();

  if (bidError) {
      console.error('Error inserting bid:', bidError);
      return NextResponse.json(
        { success: false, error: 'Failed to place bid' },
        { status: 500 }
      );
    }

    // Handle soft close extension if needed
    if (inSoftClose) {
      const extendedEndTime = calculateSoftCloseExtension(auction, settings);
      
      const { error: updateError } = await supabaseServer
        .from('auctions')
        .update({ end_at: extendedEndTime.toISOString() })
        .eq('id', auctionId);

      if (updateError) {
        console.error('Error extending auction end time:', updateError);
        // Don't fail the bid if soft close extension fails
        // The bid was successfully placed
      } else {
        softCloseExtended = true;
        newEndTime = extendedEndTime.toISOString();
      }
    }

    // Get updated auction state after bid placement
    const updatedAuction = await getAuctionWithBids(auctionId);
    const updatedAuctionState = updatedAuction 
      ? computeAuctionState(updatedAuction, settings)
      : auctionState;

    // Send notifications asynchronously (don't block the response)
    // This runs in the background and won't affect the bid response time
    setImmediate(async () => {
      try {
        // Get listing details for notifications
        const { data: listingData } = await supabaseServer
          .from('listings')
          .select('id, title, seller_id')
          .eq('id', auction.listing_id)
          .single();

        // Get bidder details for seller notification
        const { data: bidderData } = await supabaseServer
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        const auctionTitle = listingData?.title || 'Auction Item';
        const bidderName = bidderData?.full_name || 'Anonymous Bidder';

        // Send outbid notification to previous highest bidder
        const outbidResult = await sendOutbidNotification(
          auctionId,
          bidData.amount_cad,
          userId,
          auctionTitle,
          listingData?.id
        );

        if (outbidResult.success && outbidResult.notificationSent) {
          console.log('Outbid notification sent successfully');
        } else if (!outbidResult.success) {
          console.error('Failed to send outbid notification:', outbidResult.error);
        }

        // Send new bid notification to seller
        if (listingData?.seller_id && listingData.seller_id !== userId) {
          const sellerNotificationResult = await sendNewBidNotification(
            auctionId,
            listingData.seller_id,
            bidData.amount_cad,
            bidderName,
            auctionTitle,
            listingData.id
          );

          if (sellerNotificationResult.success) {
            console.log('New bid notification sent to seller successfully');
          } else {
            console.error('Failed to send new bid notification to seller:', sellerNotificationResult.error);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the bid if notifications fail
      }
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      bid: insertedBid,
      auction_state: updatedAuctionState,
      soft_close_extended: softCloseExtended,
      new_end_time: newEndTime,
      message: 'Bid placed successfully'
    });

  } catch (error) {
    console.error('Error in bid API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to retrieve auction bids (optional, for debugging/admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const auctionId = params.id;

    // Get auction with bids
    const auction = await getAuctionWithBids(auctionId);
    if (!auction) {
      return NextResponse.json(
        { success: false, error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Get auction settings and compute state
    const settings = await getAuctionSettings();
    const auctionState = computeAuctionState(auction, settings);

    return NextResponse.json({
      success: true,
      auction: {
        id: auction.id,
        listing_id: auction.listing_id,
        start_at: auction.start_at,
        end_at: auction.end_at,
        min_increment_cad: auction.min_increment_cad,
        soft_close_seconds: auction.soft_close_seconds
      },
      bids: auction.bids?.map(bid => ({
        amount_cad: bid.amount_cad,
        created_at: bid.created_at,
        bidder_id: bid.bidder_id
      })) || [],
      auction_state: auctionState
    });

  } catch (error) {
    console.error('Error in GET bid API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
