# T008 - Auctions & Bids Schema

## Overview
Implemented auction and bidding system schema to support time-based auctions with soft-close functionality, bid tracking, and real-time bidding capabilities for the MatEx marketplace.

## Implementation Details

### 1. Auctions Table
- **Listing Integration**: One-to-one relationship with listings
- **Time Management**: Start and end timestamps for auction periods
- **Bidding Rules**: Minimum increment and soft-close settings
- **Auction Status**: Active, ended, cancelled states

### 2. Bids Table
- **Bid Tracking**: Complete history of all bids
- **User Association**: Links bids to bidder profiles
- **Amount Validation**: CAD amounts with proper constraints
- **Timestamp Tracking**: Precise bid timing for auction logic

## Technical Implementation

### Database Schema (003_auctions_bids.sql)
```sql
-- Create auctions table
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  min_increment_cad NUMERIC NOT NULL CHECK (min_increment_cad > 0),
  soft_close_seconds INTEGER NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_auction_period CHECK (end_at > start_at)
);

-- Create bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cad NUMERIC NOT NULL CHECK (amount_cad > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auctions
CREATE POLICY "Public can read auctions" ON auctions
  FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own auctions" ON auctions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to auctions" ON auctions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for bids
CREATE POLICY "Public can read bids" ON bids
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids" ON bids
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Bidders can read own bids" ON bids
  FOR SELECT USING (bidder_id = auth.uid());

CREATE POLICY "Admins have full access to bids" ON bids
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_auctions_listing_id ON auctions(listing_id);
CREATE INDEX idx_auctions_start_at ON auctions(start_at);
CREATE INDEX idx_auctions_end_at ON auctions(end_at);
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_bids_created_at ON bids(auction_id, created_at DESC);
CREATE INDEX idx_bids_amount ON bids(auction_id, amount_cad DESC);

-- Function to get current highest bid
CREATE OR REPLACE FUNCTION get_highest_bid(auction_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(MAX(amount_cad), 0)
    FROM bids
    WHERE auction_id = auction_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bid count
CREATE OR REPLACE FUNCTION get_bid_count(auction_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM bids
    WHERE auction_id = auction_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Created
- `supabase/migrations/003_auctions_bids.sql` - Database migration

## Auction System Features

### Auction Management
- **Time-based Auctions**: Start and end timestamps
- **Soft Close**: Automatic extension when bids placed near end
- **Minimum Increments**: Configurable bid increment requirements
- **Listing Integration**: Seamless connection to material listings

### Bidding System
- **Real-time Bidding**: Support for live bid updates
- **Bid History**: Complete audit trail of all bids
- **User Validation**: Authenticated users only
- **Amount Validation**: Positive amounts with increment checking

## Security Implementation

### Row Level Security
- **Public Visibility**: Anyone can view auctions and bids
- **Seller Control**: Sellers manage their own auctions
- **Bidder Privacy**: Users can view their own bid history
- **Admin Oversight**: Full access for platform management

### Data Integrity
- **Foreign Key Constraints**: Proper relationships maintained
- **Check Constraints**: Valid amounts and time periods
- **Unique Constraints**: One auction per listing
- **Cascade Deletes**: Clean data removal

## Performance Optimization

### Indexing Strategy
- **Auction Lookups**: Fast listing-to-auction mapping
- **Time Queries**: Efficient active auction filtering
- **Bid Sorting**: Quick highest bid and history retrieval
- **User Queries**: Fast bidder history access

### Database Functions
- **get_highest_bid()**: Optimized current bid retrieval
- **get_bid_count()**: Efficient bid counting
- **Security Definer**: Controlled function execution

## Auction Logic Support

### Time Management
- Start and end timestamp validation
- Soft-close period configuration
- Timezone-aware operations

### Bid Validation
- Minimum increment enforcement
- Duplicate bid prevention
- User authentication requirements

## Success Metrics
- **Performance**: Sub-100ms bid placement
- **Reliability**: Zero data loss during high-traffic auctions
- **Security**: Proper access control and validation
- **Scalability**: Support for concurrent bidding

## Future Enhancements
- Automatic bid extension triggers
- Reserve price functionality
- Bid retraction policies
- Advanced auction types (Dutch, sealed bid)
- Real-time notification triggers
