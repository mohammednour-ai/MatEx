import { supabaseServer } from './supabaseServer';

export async function isDepositAuthorizedForAuction(userId: string, auctionId: string): Promise<boolean> {
  try {
    // Check if deposits table exists by attempting a select; if it errors assume not implemented
    const { data: rows, error } = await supabaseServer
      .from('deposits')
      .select('id, status, auction_id, user_id')
      .eq('auction_id', auctionId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table likely doesn't exist or other DB issue. Treat as not authorized.
      console.warn('Deposits table check failed or missing:', error.message || error);
      return false;
    }

    if (!rows) return false;
    // Accept statuses 'authorized' or 'captured' as valid
    return ['authorized', 'captured'].includes((rows as any).status);
  } catch (err) {
    console.error('Error checking deposit authorization:', err);
    return false;
  }
}
