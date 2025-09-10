# T027 - Auction Helpers

## Overview
Implemented auction status and bidding helper functions to compute auction states, time remaining, current bids, and minimum next bid amounts based on configurable settings.

## Implementation Details

### 1. Auction Status Helpers
- **isActive**: Determine if auction is currently accepting bids
- **timeLeft**: Calculate remaining auction time with soft-close handling
- **currentHighBid**: Get current highest bid amount
- **minNextBid**: Calculate minimum next bid based on strategy

### 2. Configurable Bidding Rules
- **Fixed Increment**: Minimum CAD amount increment
- **Percentage Increment**: Percentage-based increment strategy
- **Soft Close**: Automatic auction extension logic
- **Settings Integration**: Dynamic configuration from app_settings

## Technical Implementation

### Auction Helpers Library
```typescript
// lib/auction-helpers.ts
import { supabase } from './supabaseClient'

export interface AuctionData {
  id: string
  listing_id: string
  start_at: string
  end_at: string
  min_increment_cad: number
  soft_close_seconds: number
  bids?: Array<{
    amount_cad: number
    created_at: string
    bidder_id: string
  }>
}

export interface AuctionStatus {
  isActive: boolean
  isPending: boolean
  isEnded: boolean
  timeLeft: number
  currentHighBid: number
  minNextBid: number
  bidCount: number
  lastBidTime?: string
}

export async function getAuctionStatus(auction: AuctionData): Promise<AuctionStatus> {
  const now = new Date()
  const startTime = new Date(auction.start_at)
  const endTime = new Date(auction.end_at)
  
  const isPending = now < startTime
  const isEnded = now > endTime
  const isActive = !isPending && !isEnded
  
  const timeLeft = Math.max(0, endTime.getTime() - now.getTime())
  
  // Get current highest bid
  const currentHighBid = auction.bids?.length > 0 
    ? Math.max(...auction.bids.map(b => b.amount_cad))
    : 0
  
  const bidCount = auction.bids?.length || 0
  const lastBidTime = auction.bids?.length > 0
    ? auction.bids.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
    : undefined
  
  // Calculate minimum next bid
  const minNextBid = await calculateMinNextBid(currentHighBid, auction.min_increment_cad)
  
  return {
    isActive,
    isPending,
    isEnded,
    timeLeft,
    currentHighBid,
    minNextBid,
    bidCount,
    lastBidTime
  }
}

async function calculateMinNextBid(currentBid: number, baseIncrement: number): Promise<number> {
  try {
    // Get increment strategy from settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .in('key', ['auction.min_increment_strategy', 'auction.min_increment_percent'])
    
    const strategy = settings?.find(s => s.key === 'auction.min_increment_strategy')?.value || 'fixed'
    const percentIncrement = settings?.find(s => s.key === 'auction.min_increment_percent')?.value || 0.05
    
    if (strategy === 'percentage' && currentBid > 0) {
      const percentAmount = currentBid * percentIncrement
      return currentBid + Math.max(percentAmount, baseIncrement)
    }
    
    return currentBid + baseIncrement
  } catch (error) {
    console.error('Error calculating min next bid:', error)
    return currentBid + baseIncrement
  }
}

export function formatTimeLeft(milliseconds: number): string {
  if (milliseconds <= 0) return 'Ended'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export async function checkSoftClose(auctionId: string, newBidTime: Date): Promise<boolean> {
  try {
    const { data: auction } = await supabase
      .from('auctions')
      .select('end_at, soft_close_seconds')
      .eq('id', auctionId)
      .single()
    
    if (!auction) return false
    
    const endTime = new Date(auction.end_at)
    const timeUntilEnd = endTime.getTime() - newBidTime.getTime()
    const softCloseMs = auction.soft_close_seconds * 1000
    
    // If bid placed within soft close window, extend auction
    if (timeUntilEnd <= softCloseMs) {
      const newEndTime = new Date(newBidTime.getTime() + softCloseMs)
      
      await supabase
        .from('auctions')
        .update({ end_at: newEndTime.toISOString() })
        .eq('id', auctionId)
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Soft close check error:', error)
    return false
  }
}
```

### Auction Status Hook
```typescript
// hooks/useAuctionStatus.ts
'use client'

import { useState, useEffect } from 'react'
import { getAuctionStatus, AuctionData, AuctionStatus } from '@/lib/auction-helpers'

export function useAuctionStatus(auction: AuctionData) {
  const [status, setStatus] = useState<AuctionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const newStatus = await getAuctionStatus(auction)
        setStatus(newStatus)
      } catch (error) {
        console.error('Error updating auction status:', error)
      } finally {
        setLoading(false)
      }
    }

    updateStatus()
    
    // Update every second if auction is active
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [auction])

  return { status, loading }
}
```

## Files Created
- `src/lib/auction-helpers.ts` - Core auction helper functions
- `src/hooks/useAuctionStatus.ts` - React hook for auction status

## Key Features
- **Real-time Status**: Live auction status calculation
- **Flexible Bidding**: Configurable increment strategies
- **Soft Close**: Automatic auction extension logic
- **Time Formatting**: Human-readable time remaining display
- **Settings Integration**: Dynamic configuration from database

## Success Metrics
- **Accuracy**: Precise auction timing and bid calculations
- **Performance**: Fast status computation
- **User Experience**: Clear auction state communication
- **Reliability**: Consistent soft-close behavior
