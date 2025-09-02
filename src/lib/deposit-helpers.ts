import { stripe, formatAmountForStripe, validateStripeAmount } from './stripe';
import { supabaseServer } from './supabaseServer';
import { z } from 'zod';

// Types for deposit management
export interface DepositSettings {
  deposit_required: boolean;
  deposit_percent: number;
  deposit_flat_amount?: number;
  deposit_strategy: 'percent' | 'flat';
}

export interface DepositAuthorizationRequest {
  auction_id: string;
  user_id: string;
  amount_cad: number;
  payment_method_id?: string;
}

export interface DepositAuthorizationResult {
  success: boolean;
  payment_intent_id?: string;
  client_secret?: string;
  amount_cad?: number;
  status?: string;
  error?: string;
  requires_action?: boolean;
}

// Zod schemas for validation
export const DepositAuthorizationSchema = z.object({
  auction_id: z.string().uuid(),
  payment_method_id: z.string().optional(),
});

// Get deposit settings from app_settings
export async function getDepositSettings(): Promise<DepositSettings> {
  try {
    const { data: settings, error } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'auction.deposit_required',
        'auction.deposit_percent', 
        'auction.deposit_flat_amount',
        'auction.deposit_strategy'
      ]);

    if (error) {
      console.error('Error fetching deposit settings:', error);
      // Return default settings
      return {
        deposit_required: true,
        deposit_percent: 0.1, // 10%
        deposit_strategy: 'percent'
      };
    }

    const settingsMap = settings?.reduce((acc: Record<string, unknown>, setting: unknown) => {
      const s = setting as { key?: string; value?: unknown };
      if (s.key) acc[s.key] = s.value as unknown;
      return acc;
    }, {} as Record<string, unknown>) || {};

    return {
      deposit_required: (settingsMap['auction.deposit_required'] as boolean) ?? true,
      deposit_percent: (typeof settingsMap['auction.deposit_percent'] === 'number' ? (settingsMap['auction.deposit_percent'] as number) : Number(settingsMap['auction.deposit_percent']) || 0.1),
      deposit_flat_amount: typeof settingsMap['auction.deposit_flat_amount'] === 'number' ? (settingsMap['auction.deposit_flat_amount'] as number) : undefined,
      deposit_strategy: ((settingsMap['auction.deposit_strategy'] as string) === 'flat' ? 'flat' : 'percent')
    };
  } catch (error) {
    console.error('Error in getDepositSettings:', error);
    return {
      deposit_required: true,
      deposit_percent: 0.1,
      deposit_strategy: 'percent'
    };
  }
}

// Calculate deposit amount based on settings and auction details
export async function calculateDepositAmount(auction_id: string): Promise<{ amount_cad: number; settings: DepositSettings }> {
  try {
    // Get auction details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(`
        *,
        listing:listings(
          id,
          title,
          price_cad,
          buy_now_cad
        )
      `)
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      throw new Error('Auction not found');
    }

    const settings = await getDepositSettings();

    if (!settings.deposit_required) {
      return { amount_cad: 0, settings };
    }

    let depositAmount = 0;

    if (settings.deposit_strategy === 'flat' && settings.deposit_flat_amount) {
      depositAmount = settings.deposit_flat_amount;
    } else {
      // Use percentage of buy_now_cad or price_cad
      const baseAmount = auction.listing.buy_now_cad || auction.listing.price_cad || 0;
      depositAmount = baseAmount * settings.deposit_percent;
    }

    // Ensure minimum deposit amount
    depositAmount = Math.max(depositAmount, 5.00); // Minimum $5 CAD

    return { amount_cad: depositAmount, settings };
  } catch (error) {
    console.error('Error calculating deposit amount:', error);
    throw error;
  }
}

// Check if user has authorized deposit for auction
export async function checkDepositAuthorization(user_id: string, auction_id: string): Promise<{
  is_authorized: boolean;
  payment_intent_id?: string;
  amount_cad?: number;
  status?: string;
}> {
  try {
    const { data: deposit, error } = await supabaseServer
      .from('auction_deposits')
      .select('*')
      .eq('user_id', user_id)
      .eq('auction_id', auction_id)
      .eq('status', 'authorized')
      .single();

    if (error || !deposit) {
      return { is_authorized: false };
    }

    return {
      is_authorized: true,
      payment_intent_id: deposit.stripe_payment_intent_id,
      amount_cad: deposit.amount_cad,
      status: deposit.status
    };
  } catch (error) {
    console.error('Error checking deposit authorization:', error);
    return { is_authorized: false };
  }
}

// Authorize deposit using Stripe PaymentIntent
export async function authorizeDeposit(request: DepositAuthorizationRequest): Promise<DepositAuthorizationResult> {
  try {
    // Calculate deposit amount
    const { amount_cad, settings } = await calculateDepositAmount(request.auction_id);

    if (!settings.deposit_required || amount_cad === 0) {
      return {
        success: true,
        amount_cad: 0
      };
    }

    // Validate amount
    if (!validateStripeAmount(amount_cad)) {
      return {
        success: false,
        error: 'Invalid deposit amount'
      };
    }

    // Get auction and user details
    const { data: auction, error: auctionError } = await supabaseServer
      .from('auctions')
      .select(`
        *,
        listing:listings(
          id,
          title,
          seller_id
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

    // Prevent seller from authorizing deposit on their own auction
    if (auction.listing.seller_id === request.user_id) {
      return {
        success: false,
        error: 'Sellers cannot authorize deposits on their own auctions'
      };
    }

    // Check if deposit already authorized
    const existingAuth = await checkDepositAuthorization(request.user_id, request.auction_id);
    if (existingAuth.is_authorized) {
      return {
        success: true,
        payment_intent_id: existingAuth.payment_intent_id,
        amount_cad: existingAuth.amount_cad,
        status: existingAuth.status
      };
    }

    // Create Stripe PaymentIntent with capture_method: manual
  const _paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount_cad),
      currency: 'cad',
      capture_method: 'manual', // Authorize only, capture later
      payment_method: request.payment_method_id,
      confirmation_method: 'manual',
      confirm: !!request.payment_method_id,
      metadata: {
        type: 'auction_deposit',
        auction_id: request.auction_id,
        user_id: request.user_id,
        listing_title: auction.listing.title
      },
      description: `Auction deposit for: ${auction.listing.title}`
    });

  // Store deposit record in database
  const { error: depositError } = await supabaseServer
      .from('auction_deposits')
      .insert({
        user_id: request.user_id,
        auction_id: request.auction_id,
    stripe_payment_intent_id: _paymentIntent.id,
        amount_cad: amount_cad,
    status: _paymentIntent.status === 'requires_payment_method' ? 'pending' : 'authorized',
        created_at: new Date().toISOString()
      });

    if (depositError) {
      console.error('Error storing deposit record:', depositError);
  // Cancel the PaymentIntent if database insert fails
  await stripe.paymentIntents.cancel(_paymentIntent.id);
      return {
        success: false,
        error: 'Failed to store deposit record'
      };
    }

    return {
  success: true,
  payment_intent_id: _paymentIntent.id,
  client_secret: _paymentIntent.client_secret || undefined,
  amount_cad: amount_cad,
  status: _paymentIntent.status,
  requires_action: _paymentIntent.status === 'requires_action'
    };

  } catch (error) {
    console.error('Error authorizing deposit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to authorize deposit'
    };
  }
}

// Capture authorized deposit (when auction is won)
export async function captureDeposit(payment_intent_id: string): Promise<{ success: boolean; error?: string }> {
  try {
  await stripe.paymentIntents.capture(payment_intent_id);
    
    // Update deposit record
    const { error } = await supabaseServer
      .from('auction_deposits')
      .update({ 
        status: 'captured',
        captured_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (error) {
      console.error('Error updating deposit record after capture:', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error capturing deposit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture deposit'
    };
  }
}

// Cancel/refund authorized deposit (when auction is lost or cancelled)
export async function cancelDeposit(payment_intent_id: string): Promise<{ success: boolean; error?: string }> {
  try {
  await stripe.paymentIntents.cancel(payment_intent_id);
    
    // Update deposit record
    const { error } = await supabaseServer
      .from('auction_deposits')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (error) {
      console.error('Error updating deposit record after cancellation:', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling deposit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel deposit'
    };
  }
}

// Get user's deposit status for multiple auctions
export async function getUserDepositStatuses(user_id: string, auction_ids: string[]): Promise<Record<string, {
  is_authorized: boolean;
  amount_cad?: number;
  status?: string;
}>> {
  try {
    const { data: deposits, error } = await supabaseServer
      .from('auction_deposits')
      .select('auction_id, amount_cad, status')
      .eq('user_id', user_id)
      .in('auction_id', auction_ids);

    if (error) {
      console.error('Error fetching user deposit statuses:', error);
      return {};
    }

    return deposits?.reduce((acc: Record<string, { is_authorized: boolean; amount_cad?: number; status?: string }>, deposit: unknown) => {
      const d = deposit as { auction_id?: string; status?: string; amount_cad?: number };
      if (!d.auction_id) return acc;
      acc[d.auction_id] = {
        is_authorized: d.status === 'authorized',
        amount_cad: d.amount_cad,
        status: d.status
      };
      return acc;
    }, {} as Record<string, { is_authorized: boolean; amount_cad?: number; status?: string }>) || {};
  } catch (error) {
    console.error('Error in getUserDepositStatuses:', error);
    return {};
  }
}
