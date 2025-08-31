-- Migration: 003_auctions_bids.sql
-- Description: Create auctions and bids tables with RLS policies
-- Task: T008 - Auctions & Bids schema

-- Create auctions table
CREATE TABLE auctions (
  listing_id UUID PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  min_increment_cad DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  soft_close_seconds INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT auctions_valid_timeframe CHECK (end_at > start_at),
  CONSTRAINT auctions_positive_increment CHECK (min_increment_cad > 0),
  CONSTRAINT auctions_positive_soft_close CHECK (soft_close_seconds >= 0)
);

-- Create bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(listing_id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cad DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bids_positive_amount CHECK (amount_cad > 0),
  CONSTRAINT bids_no_self_bid CHECK (
    bidder_id != (
      SELECT seller_id 
      FROM listings 
      WHERE id = auction_id
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_auctions_start_at ON auctions(start_at);
CREATE INDEX idx_auctions_end_at ON auctions(end_at);
CREATE INDEX idx_auctions_status ON auctions(start_at, end_at); -- For active auction queries

CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_created_at ON bids(created_at);
CREATE INDEX idx_bids_auction_created ON bids(auction_id, created_at DESC); -- For bid history
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_bids_amount ON bids(auction_id, amount_cad DESC); -- For highest bid queries

-- Enable RLS
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auctions table

-- Public can read all auctions (needed for listing display)
CREATE POLICY "auctions_select_public" ON auctions
  FOR SELECT
  USING (true);

-- Sellers can create auctions for their own listings
CREATE POLICY "auctions_insert_seller" ON auctions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  );

-- Sellers can update their own auctions (before they start)
CREATE POLICY "auctions_update_seller" ON auctions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
    AND start_at > NOW()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  );

-- Sellers can delete their own auctions (before they start)
CREATE POLICY "auctions_delete_seller" ON auctions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
    AND start_at > NOW()
  );

-- Admins can manage all auctions
CREATE POLICY "auctions_admin_all" ON auctions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for bids table

-- Public can read all bids (for auction display)
CREATE POLICY "bids_select_public" ON bids
  FOR SELECT
  USING (true);

-- Authenticated users can place bids (business logic will validate in API)
CREATE POLICY "bids_insert_authenticated" ON bids
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bidder_id = auth.uid()
  );

-- Users can view their own bids
CREATE POLICY "bids_select_own" ON bids
  FOR SELECT
  USING (bidder_id = auth.uid());

-- Sellers can view bids on their auctions
CREATE POLICY "bids_select_seller" ON bids
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN auctions a ON l.id = a.listing_id
      WHERE a.listing_id = auction_id
      AND l.seller_id = auth.uid()
    )
  );

-- Admins can manage all bids
CREATE POLICY "bids_admin_all" ON bids
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Helper functions

-- Function to get current highest bid for an auction
CREATE OR REPLACE FUNCTION get_highest_bid(auction_listing_id UUID)
RETURNS TABLE (
  bidder_id UUID,
  amount_cad DECIMAL(10,2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.bidder_id, b.amount_cad, b.created_at
  FROM bids b
  WHERE b.auction_id = auction_listing_id
  ORDER BY b.amount_cad DESC, b.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if auction is active
CREATE OR REPLACE FUNCTION is_auction_active(auction_listing_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auction_record RECORD;
BEGIN
  SELECT start_at, end_at INTO auction_record
  FROM auctions
  WHERE listing_id = auction_listing_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOW() BETWEEN auction_record.start_at AND auction_record.end_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend auction end time (for soft close)
CREATE OR REPLACE FUNCTION extend_auction_end_time(
  auction_listing_id UUID,
  extension_seconds INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_end_time TIMESTAMPTZ;
BEGIN
  UPDATE auctions
  SET end_at = end_at + (extension_seconds || ' seconds')::INTERVAL,
      updated_at = NOW()
  WHERE listing_id = auction_listing_id
  RETURNING end_at INTO new_end_time;
  
  RETURN new_end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for auctions
CREATE OR REPLACE FUNCTION update_auctions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auctions_updated_at();

-- Comments for documentation
COMMENT ON TABLE auctions IS 'Auction configurations for listings with auction pricing type';
COMMENT ON TABLE bids IS 'Bids placed on auctions by users';

COMMENT ON COLUMN auctions.listing_id IS 'Foreign key to listings table (one-to-one relationship)';
COMMENT ON COLUMN auctions.start_at IS 'When the auction becomes active for bidding';
COMMENT ON COLUMN auctions.end_at IS 'When the auction closes (can be extended by soft close)';
COMMENT ON COLUMN auctions.min_increment_cad IS 'Minimum bid increment in CAD';
COMMENT ON COLUMN auctions.soft_close_seconds IS 'Seconds to extend auction if bid placed near end';

COMMENT ON COLUMN bids.auction_id IS 'Foreign key to auctions table via listing_id';
COMMENT ON COLUMN bids.bidder_id IS 'Foreign key to profiles table (the bidder)';
COMMENT ON COLUMN bids.amount_cad IS 'Bid amount in CAD';

COMMENT ON FUNCTION get_highest_bid(UUID) IS 'Returns the current highest bid for an auction';
COMMENT ON FUNCTION is_auction_active(UUID) IS 'Checks if an auction is currently active for bidding';
COMMENT ON FUNCTION extend_auction_end_time(UUID, INTEGER) IS 'Extends auction end time for soft close feature';
