# T029: Realtime Bids Subscription

## Overview
Implement live bid feed using Supabase Realtime to provide real-time updates of auction bids. This enables users to see new bids instantly without page refreshes, creating an engaging auction experience with optimistic UI updates.

## Implementation Details

### Supabase Realtime Setup
Enable realtime subscriptions on the bids table to broadcast new bids to all connected clients viewing the same auction.

### Real-time Hook Implementation
```typescript
// src/hooks/useAuctionRealtime.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount_cad: number;
  created_at: string;
  bidder: {
    full_name: string;
  };
}

interface AuctionRealtimeData {
  currentHighBid: number | null;
  bidHistory: Bid[];
  isConnected: boolean;
}

export function useAuctionRealtime(auctionId: string): AuctionRealtimeData {
  const [currentHighBid, setCurrentHighBid] = useState<number | null>(null);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      // Fetch initial bid history
      const { data: initialBids } = await supabase
        .from('bids')
        .select(`
          id,
          auction_id,
          bidder_id,
          amount_cad,
          created_at,
          bidder:profiles(full_name)
        `)
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (initialBids) {
        setBidHistory(initialBids);
        setCurrentHighBid(initialBids[0]?.amount_cad || null);
      }

      // Setup realtime subscription
      channel = supabase
        .channel(`auction-${auctionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bids',
            filter: `auction_id=eq.${auctionId}`,
          },
          async (payload) => {
            const newBid = payload.new as Bid;
            
            // Fetch bidder info for the new bid
            const { data: bidderData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newBid.bidder_id)
              .single();

            const enrichedBid = {
              ...newBid,
              bidder: { full_name: bidderData?.full_name || 'Anonymous' }
            };

            // Update state with new bid
            setBidHistory(prev => [enrichedBid, ...prev.slice(0, 19)]);
            setCurrentHighBid(newBid.amount_cad);
          }
        )
        .subscribe((status) => {
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [auctionId]);

  return {
    currentHighBid,
    bidHistory,
    isConnected
  };
}
```

### Optimistic UI Component
```typescript
// src/components/AuctionBiddingForm.tsx (updated)
import { useState } from 'react';
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime';

interface OptimisticBid {
  id: string;
  amount_cad: number;
  created_at: string;
  bidder: { full_name: string };
  isPending?: boolean;
}

export function AuctionBiddingForm({ auctionId, currentUser }: Props) {
  const { currentHighBid, bidHistory, isConnected } = useAuctionRealtime(auctionId);
  const [optimisticBids, setOptimisticBids] = useState<OptimisticBid[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || isSubmitting) return;

    const amount = parseFloat(bidAmount);
    const optimisticBid: OptimisticBid = {
      id: `temp-${Date.now()}`,
      amount_cad: amount,
      created_at: new Date().toISOString(),
      bidder: { full_name: currentUser.full_name },
      isPending: true
    };

    // Add optimistic bid
    setOptimisticBids(prev => [optimisticBid, ...prev]);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cad: amount })
      });

      if (!response.ok) {
        throw new Error('Bid failed');
      }

      // Remove optimistic bid on success (real bid will come via realtime)
      setOptimisticBids(prev => prev.filter(bid => bid.id !== optimisticBid.id));
      setBidAmount('');
    } catch (error) {
      // Remove optimistic bid on error
      setOptimisticBids(prev => prev.filter(bid => bid.id !== optimisticBid.id));
      console.error('Bid submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merge real bids with optimistic bids
  const allBids = [...optimisticBids, ...bidHistory].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Live updates active' : 'Reconnecting...'}
        </span>
      </div>

      {/* Current High Bid */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900">Current High Bid</h3>
        <p className="text-2xl font-bold text-blue-600">
          {currentHighBid ? `$${currentHighBid.toLocaleString()} CAD` : 'No bids yet'}
        </p>
      </div>

      {/* Bid Form */}
      <form onSubmit={handleSubmitBid} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your Bid (CAD)
          </label>
          <input
            type="number"
            step="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter bid amount"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !bidAmount}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
        </button>
      </form>

      {/* Bid History */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Recent Bids</h4>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {allBids.map((bid) => (
            <div
              key={bid.id}
              className={`p-3 rounded-lg border ${
                bid.isPending 
                  ? 'bg-yellow-50 border-yellow-200 opacity-75' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  ${bid.amount_cad.toLocaleString()} CAD
                </span>
                <span className="text-sm text-gray-500">
                  {bid.bidder.full_name}
                  {bid.isPending && ' (pending)'}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(bid.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Database Configuration
Enable realtime on the bids table:
```sql
-- Enable realtime for bids table
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
```

## Files Created/Modified
- `src/hooks/useAuctionRealtime.ts` - Real-time subscription hook
- `src/components/AuctionBiddingForm.tsx` - Updated with optimistic UI
- Database: Enable realtime publication on bids table

## Technical Considerations
- **Connection Management**: Handle reconnection scenarios gracefully
- **Optimistic Updates**: Show pending bids immediately for better UX
- **Error Handling**: Remove optimistic bids if submission fails
- **Performance**: Limit bid history to prevent memory issues
- **Security**: Ensure RLS policies apply to realtime subscriptions

## Success Metrics
- Real-time bid updates appear within 100ms
- Optimistic UI provides immediate feedback
- Connection status is clearly indicated
- No memory leaks from subscription cleanup
- Graceful handling of network interruptions

## Dependencies
- `@supabase/supabase-js` - Realtime subscriptions
- Supabase Realtime enabled on bids table
- Existing auction and bid infrastructure
