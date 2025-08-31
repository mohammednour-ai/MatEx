'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuctionData, AuctionState, computeAuctionState, getAuctionSettings } from '@/lib/auction-helpers';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface BidData {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount_cad: number;
  created_at: string;
}

interface OptimisticBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount_cad: number;
  created_at: string;
  isOptimistic: true;
}

interface UseAuctionRealtimeOptions {
  auctionId: string;
  initialAuction?: AuctionData;
  onBidUpdate?: (bid: BidData) => void;
  onAuctionUpdate?: (auction: AuctionData) => void;
  onError?: (error: Error) => void;
}

interface UseAuctionRealtimeReturn {
  auction: AuctionData | null;
  auctionState: AuctionState | null;
  bids: (BidData | OptimisticBid)[];
  isLoading: boolean;
  error: string | null;
  placeBidOptimistic: (amount: number) => Promise<{ success: boolean; error?: string }>;
  refreshAuction: () => Promise<void>;
  isConnected: boolean;
}

export function useAuctionRealtime({
  auctionId,
  initialAuction,
  onBidUpdate,
  onAuctionUpdate,
  onError
}: UseAuctionRealtimeOptions): UseAuctionRealtimeReturn {
  const [auction, setAuction] = useState<AuctionData | null>(initialAuction || null);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [bids, setBids] = useState<(BidData | OptimisticBid)[]>([]);
  const [isLoading, setIsLoading] = useState(!initialAuction);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optimisticBidsRef = useRef<Set<string>>(new Set());

  // Fetch auction data
  const fetchAuction = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('auctions')
        .select(`
          *,
          listing:listings!inner(
            price_cad,
            buy_now_cad
          ),
          bids(
            id,
            auction_id,
            bidder_id,
            amount_cad,
            created_at
          )
        `)
        .eq('id', auctionId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch auction: ${fetchError.message}`);
      }

      if (data) {
        const auctionData = data as AuctionData & { bids: BidData[] };
        setAuction(auctionData);
        setBids(auctionData.bids || []);
        
        // Calculate auction state
        const settings = await getAuctionSettings();
        const state = computeAuctionState(auctionData, settings);
        setAuctionState(state);
        
        onAuctionUpdate?.(auctionData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch auction';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [auctionId, onAuctionUpdate, onError]);

  // Refresh auction data
  const refreshAuction = useCallback(async () => {
    await fetchAuction();
  }, [fetchAuction]);

  // Update auction state when auction or bids change
  useEffect(() => {
    if (!auction) return;

    const updateAuctionState = async () => {
      try {
        const settings = await getAuctionSettings();
        const updatedAuction = { ...auction, bids: bids.filter(bid => !('isOptimistic' in bid)) };
        const state = computeAuctionState(updatedAuction, settings);
        setAuctionState(state);
      } catch (err) {
        console.error('Error updating auction state:', err);
      }
    };

    updateAuctionState();
  }, [auction, bids]);

  // Set up real-time subscription
  useEffect(() => {
    if (!auctionId) return;

    // Initial fetch if no initial auction provided
    if (!initialAuction) {
      fetchAuction();
    }

    // Set up real-time channel
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`
        },
        (payload) => {
          const newBid = payload.new as BidData;
          
          // Remove optimistic bid if it exists
          if (optimisticBidsRef.current.has(newBid.id)) {
            optimisticBidsRef.current.delete(newBid.id);
          }
          
          setBids(prevBids => {
            // Remove any optimistic bids for the same amount
            const filteredBids = prevBids.filter(bid => 
              !('isOptimistic' in bid) || bid.amount_cad !== newBid.amount_cad
            );
            
            // Add new bid and sort by amount (highest first)
            const updatedBids = [...filteredBids, newBid]
              .sort((a, b) => b.amount_cad - a.amount_cad);
            
            return updatedBids;
          });
          
          onBidUpdate?.(newBid);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`
        },
        (payload) => {
          const updatedAuction = payload.new as Partial<AuctionData>;
          
          setAuction(prevAuction => {
            if (!prevAuction) return prevAuction;
            
            const newAuction = { ...prevAuction, ...updatedAuction };
            onAuctionUpdate?.(newAuction);
            return newAuction;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Real-time connection failed');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [auctionId, initialAuction, fetchAuction, onBidUpdate, onAuctionUpdate]);

  // Optimistic bid placement
  const placeBidOptimistic = useCallback(async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!auction) {
      return { success: false, error: 'Auction not loaded' };
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Create optimistic bid
      const optimisticBid: OptimisticBid = {
        id: `optimistic-${Date.now()}`,
        auction_id: auctionId,
        bidder_id: user.id,
        amount_cad: amount,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };

      // Add optimistic bid to UI immediately
      setBids(prevBids => {
        const updatedBids = [...prevBids, optimisticBid]
          .sort((a, b) => b.amount_cad - a.amount_cad);
        return updatedBids;
      });

      optimisticBidsRef.current.add(optimisticBid.id);

      // Make API call
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount_cad: amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Remove optimistic bid on error
        setBids(prevBids => prevBids.filter(bid => bid.id !== optimisticBid.id));
        optimisticBidsRef.current.delete(optimisticBid.id);
        
        return { 
          success: false, 
          error: result.error || result.message || 'Failed to place bid' 
        };
      }

      // Update auction state if provided in response
      if (result.auction_state) {
        setAuctionState(result.auction_state);
      }

      // Update auction end time if soft close extended
      if (result.soft_close_extended && result.new_end_time) {
        setAuction(prevAuction => {
          if (!prevAuction) return prevAuction;
          return { ...prevAuction, end_at: result.new_end_time };
        });
      }

      return { success: true };
    } catch (err) {
      // Remove optimistic bid on error
      setBids(prevBids => prevBids.filter(bid => !('isOptimistic' in bid && bid.amount_cad === amount)));
      
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }, [auction, auctionId]);

  return {
    auction,
    auctionState,
    bids,
    isLoading,
    error,
    placeBidOptimistic,
    refreshAuction,
    isConnected
  };
}
