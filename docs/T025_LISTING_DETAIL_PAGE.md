# T025 - Listing Detail Page

## Overview
Implemented comprehensive listing detail page with image gallery, seller information, inspection scheduling, and pricing/bidding interface.

## Implementation Details

### 1. Listing Display
- **Image Gallery**: Carousel with thumbnails and zoom functionality
- **Material Specifications**: Detailed material information and condition
- **Seller Profile**: Company information and reputation
- **Location & Logistics**: Pickup location and inspection scheduling

### 2. Interactive Features
- **Bidding Interface**: Real-time auction bidding for auction listings
- **Buy Now**: Direct purchase for fixed-price listings
- **Inspection Booking**: Schedule material inspection appointments
- **Contact Seller**: Direct communication with seller

## Technical Implementation

### Listing Detail Page
```typescript
// app/listings/[id]/page.tsx
import { supabaseServer } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import ListingGallery from '@/components/ListingGallery'
import SellerCard from '@/components/SellerCard'
import PricingSection from '@/components/PricingSection'
import InspectionScheduler from '@/components/InspectionScheduler'

export default async function ListingDetailPage({
  params
}: {
  params: { id: string }
}) {
  const { data: listing, error } = await supabaseServer
    .from('listings')
    .select(`
      *,
      listing_images (url, sort_order),
      profiles:seller_id (
        id, full_name, company_name, 
        created_at, phone
      ),
      inspections (
        id, slot_at, capacity,
        inspection_bookings (id, user_id, status)
      ),
      auctions (
        id, start_at, end_at, min_increment_cad,
        bids (amount_cad, created_at, bidder_id)
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !listing) {
    notFound()
  }

  const images = listing.listing_images
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ListingGallery images={images} title={listing.title} />
          
          <div className="mt-6">
            <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-600">Material</span>
                <p className="font-semibold capitalize">{listing.material}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Condition</span>
                <p className="font-semibold capitalize">{listing.condition}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Quantity</span>
                <p className="font-semibold">{listing.quantity} {listing.unit}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Location</span>
                <p className="font-semibold">
                  {listing.location_city}, {listing.location_province}
                </p>
              </div>
            </div>
            
            {listing.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <PricingSection 
            listing={listing} 
            auction={listing.auctions?.[0]} 
          />
          
          <SellerCard seller={listing.profiles} />
          
          {listing.inspections && listing.inspections.length > 0 && (
            <InspectionScheduler 
              inspections={listing.inspections}
              listingId={listing.id}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

### Pricing Section Component
```typescript
// components/PricingSection.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AuctionBiddingForm from './AuctionBiddingForm'
import BuyNowButton from './BuyNowButton'

export default function PricingSection({ listing, auction }) {
  const { user } = useAuth()
  const [showBidding, setShowBidding] = useState(false)

  if (listing.pricing_type === 'fixed') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-green-600">
            ${listing.price_cad?.toLocaleString()} CAD
          </span>
          <p className="text-gray-600">Fixed Price</p>
        </div>
        
        {user ? (
          <BuyNowButton listingId={listing.id} price={listing.price_cad} />
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Sign in to purchase</p>
            <a href="/login" className="btn-primary">Sign In</a>
          </div>
        )}
      </div>
    )
  }

  if (listing.pricing_type === 'auction' && auction) {
    const currentBid = auction.bids?.length > 0 
      ? Math.max(...auction.bids.map(b => b.amount_cad))
      : 0
    
    const isActive = new Date() >= new Date(auction.start_at) && 
                    new Date() < new Date(auction.end_at)

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-blue-600">
            ${currentBid.toLocaleString()} CAD
          </span>
          <p className="text-gray-600">
            {currentBid > 0 ? 'Current Bid' : 'Starting Bid'}
          </p>
        </div>
        
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            Auction {isActive ? 'ends' : 'ended'}: {' '}
            {new Date(auction.end_at).toLocaleString()}
          </p>
        </div>
        
        {user && isActive ? (
          <AuctionBiddingForm 
            auctionId={auction.id}
            currentBid={currentBid}
            minIncrement={auction.min_increment_cad}
          />
        ) : !user ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Sign in to bid</p>
            <a href="/login" className="btn-primary">Sign In</a>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Auction has ended</p>
          </div>
        )}
      </div>
    )
  }

  return null
}
```

## Files Created
- `src/app/listings/[id]/page.tsx` - Listing detail page
- `src/components/ListingGallery.tsx` - Image gallery component
- `src/components/PricingSection.tsx` - Pricing and bidding interface
- `src/components/SellerCard.tsx` - Seller information display

## Key Features
- **Comprehensive Display**: All listing information clearly presented
- **Interactive Gallery**: Image carousel with zoom and navigation
- **Real-time Bidding**: Live auction interface with current bid display
- **Seller Information**: Company details and contact options
- **Inspection Scheduling**: Direct booking of inspection appointments
- **Responsive Design**: Optimized for all device sizes

## Success Metrics
- **Engagement Time**: Extended time on listing pages
- **Conversion Rate**: High bid placement or purchase rate
- **Image Interaction**: Gallery usage and zoom functionality
- **Contact Rate**: Seller contact and inspection booking rates
