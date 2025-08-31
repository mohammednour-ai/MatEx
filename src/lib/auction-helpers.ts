import { supabaseServer } from '@/lib/supabaseServer';

export interface AuctionData {
  id: string;
  listing_id: string;
  start_at: string;
  end_at: string;
  min_increment_cad: number;
  soft_close_seconds: number;
  listing?: {
    price_cad: number;
    buy_now_cad?: number;
  };
  bids?: Array<{
    amount_cad: number;
    created_at: string;
    bidder_id: string;
  }>;
}

export interface AuctionState {
  isActive: boolean;
  timeLeft: number; // milliseconds
  currentHighBid: number;
  minNextBid: number;
  totalBids: number;
  hasEnded: boolean;
  hasStarted: boolean;
}

export interface AuctionSettings {
  soft_close_seconds: number;
  min_increment_strategy: 'fixed' | 'percent';
  min_increment_value: number;
  deposit_required: boolean;
  deposit_percent: number;
}

/**
 * Get auction settings from app_settings table
 */
export async function getAuctionSettings(): Promise<AuctionSettings> {
  const supabase = supabaseServer;
  
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'auction.soft_close_seconds',
      'auction.min_increment_strategy', 
      'auction.min_increment_value',
      'auction.deposit_required',
      'auction.deposit_percent'
    ]);

  if (error) {
    console.error('Error fetching auction settings:', error);
    // Return default values if settings fetch fails
    return {
      soft_close_seconds: 120,
      min_increment_strategy: 'fixed',
      min_increment_value: 5,
      deposit_required: true,
      deposit_percent: 0.1
    };
  }

  // Convert array of settings to object
  const settings: Partial<AuctionSettings> = {};
  data?.forEach((setting: { key: string; value: any }) => {
    const key = setting.key.replace('auction.', '') as keyof AuctionSettings;
    settings[key] = setting.value as any;
  });

  // Merge with defaults for any missing settings
  return {
    soft_close_seconds: settings.soft_close_seconds ?? 120,
    min_increment_strategy: settings.min_increment_strategy ?? 'fixed',
    min_increment_value: settings.min_increment_value ?? 5,
    deposit_required: settings.deposit_required ?? true,
    deposit_percent: settings.deposit_percent ?? 0.1,
  };
}

/**
 * Compute auction state from auction data and settings
 */
export function computeAuctionState(
  auction: AuctionData,
  settings: AuctionSettings
): AuctionState {
  const now = new Date();
  const startTime = new Date(auction.start_at);
  const endTime = new Date(auction.end_at);
  
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const isActive = hasStarted && !hasEnded;
  
  // Calculate time left in milliseconds
  const timeLeft = Math.max(0, endTime.getTime() - now.getTime());
  
  // Sort bids by amount (highest first) and get current high bid
  const sortedBids = (auction.bids || [])
    .sort((a, b) => b.amount_cad - a.amount_cad);
  
  const currentHighBid = sortedBids.length > 0 
    ? sortedBids[0].amount_cad 
    : auction.listing?.price_cad || 0;
  
  // Calculate minimum next bid based on strategy
  let minNextBid: number;
  
  if (settings.min_increment_strategy === 'percent') {
    // Percentage-based increment
    const incrementAmount = currentHighBid * (settings.min_increment_value / 100);
    minNextBid = currentHighBid + incrementAmount;
  } else {
    // Fixed increment (default)
    minNextBid = currentHighBid + settings.min_increment_value;
  }
  
  // Round to 2 decimal places for currency
  minNextBid = Math.round(minNextBid * 100) / 100;
  
  return {
    isActive,
    timeLeft,
    currentHighBid,
    minNextBid,
    totalBids: auction.bids?.length || 0,
    hasEnded,
    hasStarted
  };
}

/**
 * Get full auction state with settings lookup
 */
export async function getAuctionState(auction: AuctionData): Promise<AuctionState> {
  const settings = await getAuctionSettings();
  return computeAuctionState(auction, settings);
}

/**
 * Format time left as human readable string
 */
export function formatTimeLeft(timeLeftMs: number): string {
  if (timeLeftMs <= 0) return 'Ended';
  
  const seconds = Math.floor(timeLeftMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if auction is in soft close period
 */
export function isInSoftClose(auction: AuctionData, settings: AuctionSettings): boolean {
  const now = new Date();
  const endTime = new Date(auction.end_at);
  const softCloseThreshold = endTime.getTime() - (settings.soft_close_seconds * 1000);
  
  return now.getTime() >= softCloseThreshold && now < endTime;
}

/**
 * Calculate new end time for soft close extension
 */
export function calculateSoftCloseExtension(
  auction: AuctionData, 
  settings: AuctionSettings
): Date {
  const now = new Date();
  return new Date(now.getTime() + (settings.soft_close_seconds * 1000));
}

/**
 * Validate bid amount against auction rules
 */
export function validateBidAmount(
  bidAmount: number,
  auction: AuctionData,
  settings: AuctionSettings
): { isValid: boolean; error?: string } {
  const state = computeAuctionState(auction, settings);
  
  if (!state.isActive) {
    return { isValid: false, error: 'Auction is not active' };
  }
  
  if (bidAmount < state.minNextBid) {
    return { 
      isValid: false, 
      error: `Bid must be at least $${state.minNextBid.toFixed(2)} CAD` 
    };
  }
  
  // Check if bid exceeds buy now price (if set)
  if (auction.listing?.buy_now_cad && bidAmount >= auction.listing.buy_now_cad) {
    return {
      isValid: false,
      error: `Bid cannot exceed Buy Now price of $${auction.listing.buy_now_cad.toFixed(2)} CAD`
    };
  }
  
  return { isValid: true };
}

/**
 * Get auction with bids for state calculation
 */
export async function getAuctionWithBids(auctionId: string): Promise<AuctionData | null> {
  const supabase = supabaseServer;
  
  const { data, error } = await supabase
    .from('auctions')
    .select(`
      *,
      listing:listings!inner(
        price_cad,
        buy_now_cad
      ),
      bids(
        amount_cad,
        created_at,
        bidder_id
      )
    `)
    .eq('id', auctionId)
    .single();
    
  if (error) {
    console.error('Error fetching auction:', error);
    return null;
  }
  
  return data as AuctionData;
}

/**
 * Get auction by listing ID with bids
 */
export async function getAuctionByListingId(listingId: string): Promise<AuctionData | null> {
  const supabase = supabaseServer;
  
  const { data, error } = await supabase
    .from('auctions')
    .select(`
      *,
      listing:listings!inner(
        price_cad,
        buy_now_cad
      ),
      bids(
        amount_cad,
        created_at,
        bidder_id
      )
    `)
    .eq('listing_id', listingId)
    .single();
    
  if (error) {
    console.error('Error fetching auction by listing ID:', error);
    return null;
  }
  
  return data as AuctionData;
}
