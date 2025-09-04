/**
 * Notification Triggers - T043
 * Server helpers to insert notifications on various events:
 * - new bid, outbid, auction won, inspection booked, deposit authorized
 */

import { supabaseServer } from './supabaseServer';
import { createNotificationFromTemplate } from './notification-helpers';

// Types for notification trigger events
export interface BidNotificationData {
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  listingTitle: string;
  sellerId: string;
  previousHighBidderId?: string;
}

export interface AuctionWonData {
  auctionId: string;
  winnerId: string;
  winningAmount: number;
  listingTitle: string;
  sellerId: string;
}

export interface InspectionBookedData {
  inspectionId: string;
  buyerId: string;
  sellerId: string;
  listingTitle: string;
  inspectionDate: string;
  sellerPhone?: string;
  locationAddress?: string;
}

export interface DepositAuthorizedData {
  auctionId: string;
  userId: string;
  depositAmount: number;
  listingTitle: string;
  auctionEndDate: string;
}

export interface OrderCompletedData {
  orderId: string;
  buyerId: string;
  sellerId: string;
  listingTitle: string;
  totalAmount: number;
  orderType: 'fixed' | 'auction';
}

/**
 * Trigger notification when a new bid is placed
 * Notifies the seller about the new bid
 */
export async function triggerNewBidNotification(data: BidNotificationData): Promise<void> {
  try {
    await createNotificationFromTemplate({
      templateCode: 'auction_new_bid',
      userId: data.sellerId,
      variables: {
        listing_title: data.listingTitle,
        bid_amount: data.bidAmount.toFixed(2),
        currency: 'CAD',
        auction_id: data.auctionId,
        bidder_id: data.bidderId
      },
      link: `/listings/${data.auctionId}`,
      metadata: {
        auction_id: data.auctionId,
        bid_amount: data.bidAmount,
        bidder_id: data.bidderId
      }
    });

    console.log(`New bid notification sent to seller ${data.sellerId} for auction ${data.auctionId}`);
  } catch (error) {
    console.error('Failed to send new bid notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when a bidder is outbid
 * Notifies the previous highest bidder
 */
export async function triggerOutbidNotification(data: BidNotificationData): Promise<void> {
  if (!data.previousHighBidderId) {
    return; // No previous bidder to notify
  }

  try {
    await createNotificationFromTemplate({
      templateCode: 'auction_outbid',
      userId: data.previousHighBidderId,
      variables: {
        listing_title: data.listingTitle,
        new_bid_amount: data.bidAmount.toFixed(2),
        currency: 'CAD',
        auction_id: data.auctionId
      },
      link: `/listings/${data.auctionId}`,
      metadata: {
        auction_id: data.auctionId,
        outbid_amount: data.bidAmount,
        new_bidder_id: data.bidderId
      }
    });

    console.log(`Outbid notification sent to user ${data.previousHighBidderId} for auction ${data.auctionId}`);
  } catch (error) {
    console.error('Failed to send outbid notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when an auction is won
 * Notifies the winning bidder
 */
export async function triggerAuctionWonNotification(data: AuctionWonData): Promise<void> {
  try {
    await createNotificationFromTemplate({
      templateCode: 'auction_won',
      userId: data.winnerId,
      variables: {
        listing_title: data.listingTitle,
        winning_amount: data.winningAmount.toFixed(2),
        currency: 'CAD',
        auction_id: data.auctionId
      },
      link: `/listings/${data.auctionId}`,
      metadata: {
        auction_id: data.auctionId,
        winning_amount: data.winningAmount,
        seller_id: data.sellerId
      }
    });

    console.log(`Auction won notification sent to winner ${data.winnerId} for auction ${data.auctionId}`);
  } catch (error) {
    console.error('Failed to send auction won notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when an inspection is booked
 * Notifies both buyer and seller
 */
export async function triggerInspectionBookedNotification(data: InspectionBookedData): Promise<void> {
  try {
    // Notify buyer (confirmation)
    await createNotificationFromTemplate({
      templateCode: 'inspection_booked_buyer',
      userId: data.buyerId,
      variables: {
        listing_title: data.listingTitle,
        inspection_date: data.inspectionDate,
        seller_phone: data.sellerPhone || 'Contact via platform',
        location_address: data.locationAddress || 'See listing details'
      },
      link: `/inspections/bookings`,
      metadata: {
        inspection_id: data.inspectionId,
        seller_id: data.sellerId,
        inspection_date: data.inspectionDate
      }
    });

    // Notify seller (new booking)
    await createNotificationFromTemplate({
      templateCode: 'inspection_booked_seller',
      userId: data.sellerId,
      variables: {
        listing_title: data.listingTitle,
        inspection_date: data.inspectionDate,
        buyer_id: data.buyerId
      },
      link: `/inspections/manage`,
      metadata: {
        inspection_id: data.inspectionId,
        buyer_id: data.buyerId,
        inspection_date: data.inspectionDate
      }
    });

    console.log(`Inspection booked notifications sent for inspection ${data.inspectionId}`);
  } catch (error) {
    console.error('Failed to send inspection booked notifications:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when a deposit is authorized
 * Notifies the user about successful deposit authorization
 */
export async function triggerDepositAuthorizedNotification(data: DepositAuthorizedData): Promise<void> {
  try {
    await createNotificationFromTemplate({
      templateCode: 'deposit_authorized',
      userId: data.userId,
      variables: {
        listing_title: data.listingTitle,
        deposit_amount: data.depositAmount.toFixed(2),
        currency: 'CAD',
        auction_end_date: data.auctionEndDate,
        auction_id: data.auctionId
      },
      link: `/listings/${data.auctionId}`,
      metadata: {
        auction_id: data.auctionId,
        deposit_amount: data.depositAmount
      }
    });

    console.log(`Deposit authorized notification sent to user ${data.userId} for auction ${data.auctionId}`);
  } catch (error) {
    console.error('Failed to send deposit authorized notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when an order is completed (payment successful)
 * Notifies both buyer and seller
 */
export async function triggerOrderCompletedNotification(data: OrderCompletedData): Promise<void> {
  try {
    // Notify buyer (payment confirmation)
    await createNotificationFromTemplate({
      templateCode: 'order_completed_buyer',
      userId: data.buyerId,
      variables: {
        listing_title: data.listingTitle,
        total_amount: data.totalAmount.toFixed(2),
        currency: 'CAD',
        order_type: data.orderType,
        order_id: data.orderId
      },
      link: `/orders/${data.orderId}`,
      metadata: {
        order_id: data.orderId,
        seller_id: data.sellerId,
        total_amount: data.totalAmount
      }
    });

    // Notify seller (sale confirmation)
    await createNotificationFromTemplate({
      templateCode: 'order_completed_seller',
      userId: data.sellerId,
      variables: {
        listing_title: data.listingTitle,
        total_amount: data.totalAmount.toFixed(2),
        currency: 'CAD',
        order_type: data.orderType,
        order_id: data.orderId
      },
      link: `/orders/${data.orderId}`,
      metadata: {
        order_id: data.orderId,
        buyer_id: data.buyerId,
        total_amount: data.totalAmount
      }
    });

    console.log(`Order completed notifications sent for order ${data.orderId}`);
  } catch (error) {
    console.error('Failed to send order completed notifications:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when a deposit is refunded
 * Notifies the user about deposit refund
 */
export async function triggerDepositRefundedNotification(data: {
  userId: string;
  auctionId: string;
  listingTitle: string;
  depositAmount: number;
  reason: string;
}): Promise<void> {
  try {
    await createNotificationFromTemplate({
      templateCode: 'deposit_refunded',
      userId: data.userId,
      variables: {
        listing_title: data.listingTitle,
        deposit_amount: data.depositAmount.toFixed(2),
        currency: 'CAD',
        refund_reason: data.reason,
        auction_id: data.auctionId
      },
      link: `/listings/${data.auctionId}`,
      metadata: {
        auction_id: data.auctionId,
        deposit_amount: data.depositAmount,
        refund_reason: data.reason
      }
    });

    console.log(`Deposit refunded notification sent to user ${data.userId} for auction ${data.auctionId}`);
  } catch (error) {
    console.error('Failed to send deposit refunded notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when KYC status changes
 * Notifies the user about KYC approval/rejection
 */
export async function triggerKycStatusNotification(data: {
  userId: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): Promise<void> {
  try {
    const templateCode = data.status === 'approved' ? 'kyc_approved' : 'kyc_rejected';
    
    await createNotificationFromTemplate({
      templateCode,
      userId: data.userId,
      variables: {
        kyc_status: data.status,
        reason: data.reason || (data.status === 'approved' ? 'All documents verified successfully' : 'Please check your documents and resubmit')
      },
      link: '/profile',
      metadata: {
        kyc_status: data.status,
        reason: data.reason
      }
    });

    console.log(`KYC ${data.status} notification sent to user ${data.userId}`);
  } catch (error) {
    console.error(`Failed to send KYC ${data.status} notification:`, error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Trigger notification when a listing is approved/rejected by admin
 * Notifies the seller about listing moderation result
 */
export async function triggerListingModerationNotification(data: {
  sellerId: string;
  listingId: string;
  listingTitle: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): Promise<void> {
  try {
    const templateCode = data.status === 'approved' ? 'listing_approved' : 'listing_rejected';
    
    await createNotificationFromTemplate({
      templateCode,
      userId: data.sellerId,
      variables: {
        listing_title: data.listingTitle,
        moderation_status: data.status,
        reason: data.reason || (data.status === 'approved' ? 'Your listing meets all requirements' : 'Please review and update your listing')
      },
      link: `/listings/${data.listingId}`,
      metadata: {
        listing_id: data.listingId,
        moderation_status: data.status,
        reason: data.reason
      }
    });

    console.log(`Listing ${data.status} notification sent to seller ${data.sellerId} for listing ${data.listingId}`);
  } catch (error) {
    console.error(`Failed to send listing ${data.status} notification:`, error);
    // Don't throw - notification failures shouldn't break the main flow
  }
}

/**
 * Batch trigger for multiple notifications
 * Useful for processing multiple events at once
 */
export async function triggerBatchNotifications(triggers: Array<{
  type: 'new_bid' | 'outbid' | 'auction_won' | 'inspection_booked' | 'deposit_authorized' | 'order_completed';
  data: any;
}>): Promise<void> {
  const promises = triggers.map(async (trigger) => {
    try {
      switch (trigger.type) {
        case 'new_bid':
          await triggerNewBidNotification(trigger.data);
          break;
        case 'outbid':
          await triggerOutbidNotification(trigger.data);
          break;
        case 'auction_won':
          await triggerAuctionWonNotification(trigger.data);
          break;
        case 'inspection_booked':
          await triggerInspectionBookedNotification(trigger.data);
          break;
        case 'deposit_authorized':
          await triggerDepositAuthorizedNotification(trigger.data);
          break;
        case 'order_completed':
          await triggerOrderCompletedNotification(trigger.data);
          break;
        default:
          console.warn(`Unknown notification trigger type: ${trigger.type}`);
      }
    } catch (error) {
      console.error(`Failed to process notification trigger ${trigger.type}:`, error);
      // Continue with other notifications even if one fails
    }
  });

  await Promise.allSettled(promises);
}
