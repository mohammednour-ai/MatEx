# T028 - POST /api/auctions/[id]/bid

## Overview
Implemented secure bid placement API with auction validation, deposit verification, soft-close handling, and real-time bid processing.

## Implementation Details

### 1. Bid Validation
- **Auction Status**: Verify auction is active and accepting bids
- **Deposit Authorization**: Ensure user has authorized required deposit
- **Minimum Bid**: Validate bid meets minimum increment requirements
- **User Authentication**: Verify authenticated user placing bid

### 2. Soft-Close Logic
- **Time Extension**: Extend auction if bid placed near end time
- **Dynamic End Time**: Update auction end time based on settings
- **Notification Triggers**: Notify participants of time extensions

## Technical Implementation

### Bid API Route
```typescript
// app/api/auctions/[id]/bid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'
import { validateUserConsent } from '@/lib/consent-validation'
import { checkSoftClose } from '@/lib/auction-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check terms consent
    const hasConsent = await validateUserConsent(user.id)
    if (!hasConsent) {
      return NextResponse.json({ 
        error: 'Terms acceptance required',
        code: 'CONSENT_REQUIRED'
      }, { status: 403 })
    }

    const { amount } = await request.json()
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid bid amount' }, { status: 400 })
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(`
        *,
        listings!inner(seller_id, status),
        bids(amount_cad, bidder_id, created_at)
      `)
      .eq('id', params.id)
      .single()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    // Validate auction is active
    const now = new Date()
    const startTime = new Date(auction.start_at)
    const endTime = new Date(auction.end_at)
    
    if (now < startTime) {
      return NextResponse.json({ error: 'Auction has not started' }, { status: 400 })
    }
    
    if (now > endTime) {
      return NextResponse.json({ error: 'Auction has ended' }, { status: 400 })
    }

    // Check if user is seller
    if (auction.listings.seller_id === user.id) {
      return NextResponse.json({ error: 'Cannot bid on own listing' }, { status: 400 })
    }

    // Get current highest bid
    const currentHighBid = auction.bids.length > 0 
      ? Math.max(...auction.bids.map(b => b.amount_cad))
      : 0

    // Validate minimum bid
    const minNextBid = currentHighBid + auction.min_increment_cad
    if (amount < minNextBid) {
      return NextResponse.json({ 
        error: `Minimum bid is $${minNextBid}`,
        minBid: minNextBid
      }, { status: 400 })
    }

    // Check deposit authorization (if required)
    const { data: settings } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'auction.deposit_required')
      .single()

    if (settings?.value === true) {
      const { data: deposit } = await supabaseServer
        .from('deposits')
        .select('status')
        .eq('user_id', user.id)
        .eq('auction_id', params.id)
        .eq('status', 'authorized')
        .single()

      if (!deposit) {
        return NextResponse.json({ 
          error: 'Deposit authorization required',
          code: 'DEPOSIT_REQUIRED'
        }, { status: 403 })
      }
    }

    // Place bid
    const { data: newBid, error: bidError } = await supabaseServer
      .from('bids')
      .insert({
        auction_id: params.id,
        bidder_id: user.id,
        amount_cad: amount
      })
      .select()
      .single()

    if (bidError) {
      return NextResponse.json({ error: 'Failed to place bid' }, { status: 500 })
    }

    // Check for soft close
    const bidTime = new Date(newBid.created_at)
    const wasExtended = await checkSoftClose(params.id, bidTime)

    // Trigger outbid notifications
    if (auction.bids.length > 0) {
      const previousHighBidder = auction.bids
        .filter(b => b.amount_cad === currentHighBid)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      if (previousHighBidder && previousHighBidder.bidder_id !== user.id) {
        await supabaseServer
          .from('notifications')
          .insert({
            user_id: previousHighBidder.bidder_id,
            type: 'warning',
            title: 'You have been outbid',
            message: `Your bid of $${currentHighBid} has been exceeded by $${amount}`,
            link: `/listings/${auction.listing_id}`
          })
      }
    }

    return NextResponse.json({
      success: true,
      bid: newBid,
      wasExtended,
      currentHighBid: amount
    })

  } catch (error) {
    console.error('Bid placement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Files Created
- `src/app/api/auctions/[id]/bid/route.ts` - Bid placement API

## Key Features
- **Comprehensive Validation**: Auction status, user permissions, bid amounts
- **Deposit Integration**: Verify required deposit authorization
- **Soft-Close Handling**: Automatic auction extension logic
- **Real-time Notifications**: Outbid notifications to previous bidders
- **Security**: Prevent self-bidding and unauthorized access

## Success Metrics
- **Bid Success Rate**: High successful bid placement rate
- **Response Time**: Fast bid processing under 200ms
- **Security**: Zero unauthorized bids
- **User Experience**: Clear error messages and feedback
