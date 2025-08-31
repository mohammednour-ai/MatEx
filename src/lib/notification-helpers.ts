import { supabaseServer } from '@/lib/supabaseServer';

export interface NotificationData {
  user_id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  code: string;
  channel: 'inapp' | 'email' | 'sms';
  subject?: string;
  body_md: string;
  variables?: string[];
}

/**
 * Create a notification from a template with variable substitution
 */
export async function createNotificationFromTemplate(
  templateCode: string,
  userId: string,
  variables: Record<string, any> = {}
): Promise<{ success: boolean; error?: string; notification?: any }> {
  try {
    const supabase = supabaseServer;

    // Get the notification template
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('code', templateCode)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return { 
        success: false, 
        error: `Template not found: ${templateCode}` 
      };
    }

    // Simple template variable substitution
    let title = template.subject || '';
    let message = template.body_md || '';

    // Replace variables in title and message
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Determine notification type based on template code
    let notificationType: 'info' | 'warning' | 'success' | 'error' = 'info';
    if (templateCode.includes('outbid')) {
      notificationType = 'warning';
    } else if (templateCode.includes('won') || templateCode.includes('success')) {
      notificationType = 'success';
    } else if (templateCode.includes('error') || templateCode.includes('failed')) {
      notificationType = 'error';
    }

    // Create the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notificationType,
        title: title,
        message: message,
        link: variables.link || null,
        metadata: {
          template_code: templateCode,
          variables: variables,
          channel: template.channel
        },
        is_read: false
      })
      .select()
      .single();

    if (notificationError) {
      return { 
        success: false, 
        error: `Failed to create notification: ${notificationError.message}` 
      };
    }

    return { success: true, notification };
  } catch (error) {
    console.error('Error creating notification from template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Create a direct notification without template
 */
export async function createNotification(
  data: NotificationData
): Promise<{ success: boolean; error?: string; notification?: any }> {
  try {
    const supabase = supabaseServer;

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || {},
        is_read: false
      })
      .select()
      .single();

    if (error) {
      return { 
        success: false, 
        error: `Failed to create notification: ${error.message}` 
      };
    }

    return { success: true, notification };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get the previous highest bidder for an auction
 */
export async function getPreviousHighestBidder(
  auctionId: string,
  excludeBidderId?: string
): Promise<{ success: boolean; error?: string; bidder?: any; bid?: any }> {
  try {
    const supabase = supabaseServer;

    let query = supabase
      .from('bids')
      .select(`
        *,
        profiles!bidder_id(
          id,
          full_name
        )
      `)
      .eq('auction_id', auctionId)
      .order('amount_cad', { ascending: false })
      .order('created_at', { ascending: false });

    // Exclude the current bidder if specified
    if (excludeBidderId) {
      query = query.neq('bidder_id', excludeBidderId);
    }

    const { data: bids, error } = await query.limit(1);

    if (error) {
      return { 
        success: false, 
        error: `Failed to get previous bidder: ${error.message}` 
      };
    }

    if (!bids || bids.length === 0) {
      return { success: true }; // No previous bidder
    }

    const bid = bids[0] as any;
    return { 
      success: true, 
      bidder: bid.profiles, 
      bid: bid 
    };
  } catch (error) {
    console.error('Error getting previous highest bidder:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send outbid notification to previous highest bidder
 */
export async function sendOutbidNotification(
  auctionId: string,
  newBidAmount: number,
  newBidderId: string,
  auctionTitle?: string,
  listingId?: string
): Promise<{ success: boolean; error?: string; notificationSent?: boolean }> {
  try {
    // Get the previous highest bidder (excluding the new bidder)
    const { success, error, bidder, bid } = await getPreviousHighestBidder(
      auctionId, 
      newBidderId
    );

    if (!success) {
      return { success: false, error };
    }

    // No previous bidder to notify
    if (!bidder || !bid) {
      return { success: true, notificationSent: false };
    }

    // Create outbid notification
    const notificationResult = await createNotificationFromTemplate(
      'auction_outbid',
      bidder.id,
      {
        auction_title: auctionTitle || 'Auction Item',
        previous_bid_amount: bid.amount_cad.toFixed(2),
        new_bid_amount: newBidAmount.toFixed(2),
        currency: 'CAD',
        link: listingId ? `/listings/${listingId}` : `/auctions/${auctionId}`,
        auction_id: auctionId,
        listing_id: listingId
      }
    );

    if (!notificationResult.success) {
      console.error('Failed to send outbid notification:', notificationResult.error);
      return { 
        success: false, 
        error: notificationResult.error,
        notificationSent: false 
      };
    }

    return { success: true, notificationSent: true };
  } catch (error) {
    console.error('Error sending outbid notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationSent: false 
    };
  }
}

/**
 * Send auction won notification to winning bidder
 */
export async function sendAuctionWonNotification(
  auctionId: string,
  winnerId: string,
  winningAmount: number,
  auctionTitle?: string,
  listingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await createNotificationFromTemplate(
      'auction_won',
      winnerId,
      {
        auction_title: auctionTitle || 'Auction Item',
        winning_amount: winningAmount.toFixed(2),
        currency: 'CAD',
        link: listingId ? `/listings/${listingId}` : `/auctions/${auctionId}`,
        auction_id: auctionId,
        listing_id: listingId
      }
    );

    return result;
  } catch (error) {
    console.error('Error sending auction won notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send new bid notification to auction seller
 */
export async function sendNewBidNotification(
  auctionId: string,
  sellerId: string,
  bidAmount: number,
  bidderName: string,
  auctionTitle?: string,
  listingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await createNotificationFromTemplate(
      'auction_new_bid',
      sellerId,
      {
        auction_title: auctionTitle || 'Auction Item',
        bid_amount: bidAmount.toFixed(2),
        bidder_name: bidderName || 'Anonymous Bidder',
        currency: 'CAD',
        link: listingId ? `/listings/${listingId}` : `/auctions/${auctionId}`,
        auction_id: auctionId,
        listing_id: listingId
      }
    );

    return result;
  } catch (error) {
    console.error('Error sending new bid notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const supabase = supabaseServer;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { 
        success: false, 
        error: `Failed to get notification count: ${error.message}` 
      };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseServer;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      return { 
        success: false, 
        error: `Failed to mark notification as read: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseServer;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      return { 
        success: false, 
        error: `Failed to mark all notifications as read: ${error.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
