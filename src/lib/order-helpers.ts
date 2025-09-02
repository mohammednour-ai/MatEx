import { supabaseServer } from './supabaseServer';

export interface OrderCreationRequest {
  auction_id: string;
  winner_id: string;
  winning_bid_amount: number;
  deposit_amount?: number;
}

export interface CreateOrderData {
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  type: 'fixed' | 'auction';
  total_cad: number;
  status: 'pending' | 'paid' | 'cancelled' | 'fulfilled';
  platform_fee_cad: number;
  seller_payout_cad: number;
  notes?: string;
  stripe_payment_intent?: string;
  stripe_checkout_session?: string;
}

export interface OrderCreationResult {
  success: boolean;
  order_id?: string;
  total_cad?: number;
  deposit_applied?: number;
  remaining_balance?: number;
  error?: string;
}

// Create order for fixed price purchases
export async function createOrder(data: CreateOrderData): Promise<Record<string, unknown> | null> {
  try {
    const { data: order, error } = await supabaseServer
      .from('orders')
      .insert({
        listing_id: data.listing_id,
        buyer_id: data.buyer_id,
        seller_id: data.seller_id,
        type: data.type,
        total_cad: data.total_cad,
        status: data.status,
        platform_fee_cad: data.platform_fee_cad,
        seller_payout_cad: data.seller_payout_cad,
        notes: data.notes,
        stripe_payment_intent: data.stripe_payment_intent,
        stripe_checkout_session: data.stripe_checkout_session,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      return null;
    }

    return order as Record<string, unknown>;
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}

// Create order for auction winner
export async function createAuctionWinnerOrder(request: OrderCreationRequest): Promise<OrderCreationResult> {
  try {
    // Get auction and listing details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(`
        id,
        listing_id,
        listing:listings(
          id,
          title,
          seller_id,
          price_cad
        )
      `)
      .eq('id', request.auction_id)
      .single();

    if (auctionError || !auction) {
      return {
        success: false,
        error: 'Auction not found'
      };
    }

    // Get deposit amount if not provided
    let depositAmount = request.deposit_amount || 0;
    if (!depositAmount) {
      // Try to get from captured deposit
      const { data: deposit, error: depositError } = await supabaseServer
        .from('auction_deposits')
        .select('amount_cad')
        .eq('auction_id', request.auction_id)
        .eq('user_id', request.winner_id)
        .eq('status', 'captured')
        .single();

      if (!depositError && deposit) {
        depositAmount = deposit.amount_cad;
      }
    }

    // Calculate order totals
    const totalAmount = request.winning_bid_amount;
    const remainingBalance = Math.max(0, totalAmount - depositAmount);

    // Create order record
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert({
        listing_id: auction.listing_id,
        buyer_id: request.winner_id,
      seller_id: (auction.listing as { seller_id?: string })?.seller_id,
        type: 'auction',
        total_cad: totalAmount,
        deposit_applied_cad: depositAmount,
        remaining_balance_cad: remainingBalance,
        status: remainingBalance > 0 ? 'pending_payment' : 'paid',
        auction_id: request.auction_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return {
        success: false,
        error: 'Failed to create order'
      };
    }

    return {
      success: true,
      order_id: order.id,
      total_cad: totalAmount,
      deposit_applied: depositAmount,
      remaining_balance: remainingBalance
    };

  } catch (error) {
    console.error('Error creating auction winner order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    };
  }
}

// Get order details for auction
export async function getAuctionOrder(auction_id: string): Promise<{
  order?: Record<string, unknown> | null;
  exists: boolean;
  error?: string;
}> {
  try {
    const { data: order, error } = await supabaseServer
      .from('orders')
      .select(`
        *,
        buyer:profiles!buyer_id(
          id,
          full_name,
          email
        ),
        seller:profiles!seller_id(
          id,
          full_name,
          email
        ),
        listing:listings(
          id,
          title,
          description
        )
      `)
      .eq('auction_id', auction_id)
      .single();

    if (error) {
      const errAny = error as unknown as { code?: string; message?: string };
      if (errAny.code && errAny.code !== 'PGRST116') {
        return {
          exists: false,
          error: error.message
        };
      }
    }

    return {
      order: order || null,
      exists: !!order
    };
  } catch (error) {
    console.error('Error getting auction order:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to get order'
    };
  }
}

// Update order status
export async function updateOrderStatus(order_id: string, status: string, stripe_payment_intent?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (stripe_payment_intent) {
      updateData.stripe_payment_intent = stripe_payment_intent;
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

  const { error } = await supabaseServer
      .from('orders')
      .update(updateData)
      .eq('id', order_id);

    if (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update order'
    };
  }
}

// Get orders for user
export async function getUserOrders(user_id: string, type?: 'buyer' | 'seller'): Promise<{
  orders: Record<string, unknown>[];
  error?: string;
}> {
  try {
    let query = supabaseServer
      .from('orders')
      .select(`
        *,
        listing:listings(
          id,
          title,
          description
        ),
        buyer:profiles!buyer_id(
          id,
          full_name
        ),
        seller:profiles!seller_id(
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (type === 'buyer') {
      query = query.eq('buyer_id', user_id);
    } else if (type === 'seller') {
      query = query.eq('seller_id', user_id);
    } else {
      query = query.or(`buyer_id.eq.${user_id},seller_id.eq.${user_id}`);
    }

  const { data: orders, error } = await query;

    if (error) {
      console.error('Error getting user orders:', error);
      return {
        orders: [],
        error: error.message
      };
    }

    return {
      orders: (orders as Record<string, unknown>[] ) || []
    };
  } catch (error) {
    console.error('Error getting user orders:', error);
    return {
      orders: [],
      error: error instanceof Error ? error.message : 'Failed to get orders'
    };
  }
}

// Calculate order summary with fees
export async function calculateOrderSummary(total_cad: number, deposit_applied: number = 0): Promise<{
  subtotal: number;
  deposit_applied: number;
  transaction_fee: number;
  total_due: number;
  seller_payout: number;
}> {
  try {
    // Get transaction fee percentage from settings
  const { data: settings, error: _settingsError } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'fees.transaction_percent')
      .single();
  // _settingsError intentionally ignored - fallback applied below
  void _settingsError;

  const rawFee = settings ? (settings as unknown as { value?: unknown }).value : undefined;
  const feePercent = typeof rawFee === 'number' ? rawFee : (typeof rawFee === 'string' ? Number(rawFee) : 0.04);
    const transactionFee = total_cad * feePercent;
    const totalDue = Math.max(0, total_cad - deposit_applied);
    const sellerPayout = total_cad - transactionFee;

    return {
      subtotal: total_cad,
      deposit_applied,
      transaction_fee: transactionFee,
      total_due: totalDue,
      seller_payout: sellerPayout
    };
  } catch (error) {
    console.error('Error calculating order summary:', error);
    // Return default calculation
    const transactionFee = total_cad * 0.04;
    const totalDue = Math.max(0, total_cad - deposit_applied);
    const sellerPayout = total_cad - transactionFee;

    return {
      subtotal: total_cad,
      deposit_applied,
      transaction_fee: transactionFee,
      total_due: totalDue,
      seller_payout: sellerPayout
    };
  }
}
