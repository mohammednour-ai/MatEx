# T043: Notification Triggers

## Overview
Implement server-side notification triggers that automatically create in-app notifications for key user events including new bids, outbid notifications, auction wins, inspection bookings, and deposit authorizations.

## Implementation Details

### Core Notification Helper
Create a centralized notification helper that inserts notifications into the database and handles different notification types.

```typescript
// src/lib/notification-helpers.ts
import { createClient } from '@/lib/supabaseServer';

export interface NotificationData {
  userId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(data: NotificationData) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      is_read: false,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export async function notifyNewBid(auctionId: string, bidAmount: number, bidderName: string) {
  const supabase = createClient();
  
  // Get auction and listing details
  const { data: auction } = await supabase
    .from('auctions')
    .select(`
      listing_id,
      listings!inner(
        title,
        seller_id,
        profiles!seller_id(full_name)
      )
    `)
    .eq('listing_id', auctionId)
    .single();

  if (!auction) return;

  // Notify seller of new bid
  await createNotification({
    userId: auction.listings.seller_id,
    type: 'info',
    title: 'New Bid Received',
    message: `${bidderName} placed a bid of $${bidAmount.toFixed(2)} on "${auction.listings.title}"`,
    link: `/listings/${auctionId}`
  });
}

export async function notifyOutbid(auctionId: string, previousBidderId: string, newBidAmount: number, listingTitle: string) {
  await createNotification({
    userId: previousBidderId,
    type: 'warning',
    title: 'You\'ve Been Outbid',
    message: `Someone placed a higher bid of $${newBidAmount.toFixed(2)} on "${listingTitle}"`,
    link: `/listings/${auctionId}`
  });
}

export async function notifyAuctionWon(winnerId: string, auctionId: string, winningAmount: number, listingTitle: string) {
  await createNotification({
    userId: winnerId,
    type: 'success',
    title: 'Auction Won!',
    message: `Congratulations! You won "${listingTitle}" with a bid of $${winningAmount.toFixed(2)}`,
    link: `/listings/${auctionId}`
  });
}

export async function notifyInspectionBooked(sellerId: string, buyerName: string, listingTitle: string, inspectionDate: string) {
  await createNotification({
    userId: sellerId,
    type: 'info',
    title: 'Inspection Booked',
    message: `${buyerName} booked an inspection for "${listingTitle}" on ${inspectionDate}`,
    link: `/dashboard/inspections`
  });
}

export async function notifyDepositAuthorized(userId: string, auctionId: string, depositAmount: number, listingTitle: string) {
  await createNotification({
    userId: userId,
    type: 'success',
    title: 'Deposit Authorized',
    message: `Your deposit of $${depositAmount.toFixed(2)} for "${listingTitle}" has been authorized`,
    link: `/listings/${auctionId}`
  });
}

export async function notifyInspectionReminder(userId: string, listingTitle: string, inspectionDate: string, hoursUntil: number) {
  await createNotification({
    userId: userId,
    type: 'info',
    title: 'Inspection Reminder',
    message: `Your inspection for "${listingTitle}" is in ${hoursUntil} hours (${inspectionDate})`,
    link: `/dashboard/inspections`
  });
}
```

### Integration with Bid API
Update the bid API to trigger notifications when bids are placed.

```typescript
// src/app/api/auctions/[id]/bid/route.ts (updated)
import { notifyNewBid, notifyOutbid } from '@/lib/notification-helpers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // ... existing bid validation logic ...

  // Get previous highest bidder before inserting new bid
  const { data: previousHighestBid } = await supabase
    .from('bids')
    .select('bidder_id, amount_cad')
    .eq('auction_id', params.id)
    .order('amount_cad', { ascending: false })
    .limit(1)
    .single();

  // Insert new bid
  const { data: newBid, error: bidError } = await supabase
    .from('bids')
    .insert({
      auction_id: params.id,
      bidder_id: user.id,
      amount_cad: bidAmount,
      created_at: new Date().toISOString()
    })
    .select('*, profiles!bidder_id(full_name)')
    .single();

  if (bidError) throw bidError;

  // Trigger notifications
  try {
    // Notify seller of new bid
    await notifyNewBid(
      params.id,
      bidAmount,
      newBid.profiles.full_name || 'Anonymous'
    );

    // Notify previous highest bidder they've been outbid
    if (previousHighestBid && previousHighestBid.bidder_id !== user.id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('title')
        .eq('id', params.id)
        .single();

      await notifyOutbid(
        params.id,
        previousHighestBid.bidder_id,
        bidAmount,
        listing?.title || 'Unknown Item'
      );
    }
  } catch (notificationError) {
    console.error('Failed to send notifications:', notificationError);
    // Don't fail the bid if notifications fail
  }

  // ... rest of bid logic ...
}
```

### Auction Close Trigger
Create a server action or cron job to handle auction closing and winner notifications.

```typescript
// src/lib/auction-close-handler.ts
import { createClient } from '@/lib/supabaseServer';
import { notifyAuctionWon } from '@/lib/notification-helpers';

export async function processClosedAuctions() {
  const supabase = createClient();
  
  // Find auctions that have ended but haven't been processed
  const { data: closedAuctions } = await supabase
    .from('auctions')
    .select(`
      listing_id,
      listings!inner(title, status),
      bids!inner(bidder_id, amount_cad)
    `)
    .lt('end_at', new Date().toISOString())
    .eq('listings.status', 'active')
    .order('bids.amount_cad', { ascending: false });

  for (const auction of closedAuctions || []) {
    if (auction.bids.length > 0) {
      const winningBid = auction.bids[0];
      
      // Notify winner
      await notifyAuctionWon(
        winningBid.bidder_id,
        auction.listing_id,
        winningBid.amount_cad,
        auction.listings.title
      );

      // Update listing status
      await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', auction.listing_id);
    }
  }
}
```

### Inspection Booking Integration
Update inspection booking to trigger notifications.

```typescript
// src/app/api/inspections/book/route.ts (updated)
import { notifyInspectionBooked } from '@/lib/notification-helpers';

export async function POST(request: Request) {
  // ... existing booking logic ...

  // After successful booking, notify seller
  const { data: inspection } = await supabase
    .from('inspections')
    .select(`
      listing_id,
      slot_at,
      listings!inner(
        title,
        seller_id,
        profiles!seller_id(full_name)
      )
    `)
    .eq('id', inspectionId)
    .single();

  const { data: booker } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (inspection && booker) {
    await notifyInspectionBooked(
      inspection.listings.seller_id,
      booker.full_name || 'Anonymous',
      inspection.listings.title,
      new Date(inspection.slot_at).toLocaleDateString()
    );
  }

  // ... rest of booking logic ...
}
```

### Deposit Authorization Integration
Update deposit authorization to trigger notifications.

```typescript
// src/app/api/deposits/authorize/route.ts (updated)
import { notifyDepositAuthorized } from '@/lib/notification-helpers';

export async function POST(request: Request) {
  // ... existing deposit authorization logic ...

  // After successful authorization, notify user
  const { data: listing } = await supabase
    .from('listings')
    .select('title')
    .eq('id', listingId)
    .single();

  if (listing) {
    await notifyDepositAuthorized(
      user.id,
      listingId,
      depositAmount,
      listing.title
    );
  }

  // ... rest of authorization logic ...
}
```

## Files Created/Modified

### New Files
- `src/lib/notification-helpers.ts` - Centralized notification creation helpers
- `src/lib/auction-close-handler.ts` - Auction closing and winner notification logic

### Modified Files
- `src/app/api/auctions/[id]/bid/route.ts` - Add bid and outbid notifications
- `src/app/api/inspections/book/route.ts` - Add inspection booking notifications
- `src/app/api/deposits/authorize/route.ts` - Add deposit authorization notifications

## Database Requirements
- Existing `notifications` table from T012
- Existing `notification_templates` table from T012

## Success Metrics
- [ ] New bid notifications sent to sellers
- [ ] Outbid notifications sent to previous highest bidders
- [ ] Auction winner notifications sent when auctions close
- [ ] Inspection booking notifications sent to sellers
- [ ] Deposit authorization confirmations sent to users
- [ ] All notifications appear in bell dropdown (T042)
- [ ] Notification creation doesn't block main operations if it fails
- [ ] Proper error handling and logging for notification failures

## Testing Checklist
- [ ] Place bid triggers seller notification
- [ ] Higher bid triggers outbid notification to previous bidder
- [ ] Auction close triggers winner notification
- [ ] Inspection booking triggers seller notification
- [ ] Deposit authorization triggers user confirmation
- [ ] Failed notifications don't break main functionality
- [ ] Notifications appear correctly in UI with proper formatting
