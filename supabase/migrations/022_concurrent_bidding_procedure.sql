-- Migration: Add stored procedure for concurrent bidding with row-level locking
-- This prevents race conditions during high-traffic auction bidding

-- Create the stored procedure for atomic bid placement
CREATE OR REPLACE FUNCTION place_bid_with_lock(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_amount_cad DECIMAL(10,2),
  p_soft_close_seconds INTEGER,
  p_in_soft_close BOOLEAN
) RETURNS JSON AS $$
DECLARE
  v_auction_record RECORD;
  v_current_high_bid DECIMAL(10,2) := 0;
  v_min_increment DECIMAL(10,2);
  v_new_bid_id UUID;
  v_new_bid_created_at TIMESTAMPTZ;
  v_soft_close_extended BOOLEAN := FALSE;
  v_new_end_time TIMESTAMPTZ;
  v_listing_price DECIMAL(10,2);
  v_increment_strategy TEXT;
  v_increment_value DECIMAL(10,2);
BEGIN
  -- Start transaction with row-level locking
  -- Lock the auction row to prevent concurrent modifications
  SELECT a.*, l.price_cad as listing_price
  INTO v_auction_record
  FROM auctions a
  JOIN listings l ON a.listing_id = l.id
  WHERE a.id = p_auction_id
  FOR UPDATE; -- This creates a row-level lock

  -- Check if auction exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'auction_not_found: Auction not found';
  END IF;

  -- Check if auction is still active
  IF NOW() >= v_auction_record.end_at THEN
    RAISE EXCEPTION 'auction_ended: Auction has ended';
  END IF;

  IF NOW() < v_auction_record.start_at THEN
    RAISE EXCEPTION 'auction_not_started: Auction has not started';
  END IF;

  -- Get current highest bid amount
  SELECT COALESCE(MAX(amount_cad), v_auction_record.listing_price, 0)
  INTO v_current_high_bid
  FROM bids
  WHERE auction_id = p_auction_id;

  -- Get auction settings for minimum increment calculation
  SELECT
    COALESCE((SELECT value::TEXT FROM app_settings WHERE key = 'auction.min_increment_strategy'), 'fixed'),
    COALESCE((SELECT value::DECIMAL FROM app_settings WHERE key = 'auction.min_increment_value'), 5)
  INTO v_increment_strategy, v_increment_value;

  -- Calculate minimum increment
  IF v_increment_strategy = 'percent' THEN
    v_min_increment := v_current_high_bid * (v_increment_value / 100);
  ELSE
    v_min_increment := v_increment_value;
  END IF;

  -- Validate bid amount
  IF p_amount_cad < (v_current_high_bid + v_min_increment) THEN
    RAISE EXCEPTION 'bid_too_low: Bid amount $% is below minimum required $%',
      p_amount_cad, (v_current_high_bid + v_min_increment);
  END IF;

  -- Check for self-bidding (seller cannot bid on own auction)
  IF EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = v_auction_record.listing_id
    AND l.seller_id = p_bidder_id
  ) THEN
    RAISE EXCEPTION 'self_bidding: Sellers cannot bid on their own auctions';
  END IF;

  -- Insert the new bid
  INSERT INTO bids (auction_id, bidder_id, amount_cad)
  VALUES (p_auction_id, p_bidder_id, p_amount_cad)
  RETURNING id, created_at INTO v_new_bid_id, v_new_bid_created_at;

  -- Handle soft close extension if needed
  IF p_in_soft_close THEN
    v_new_end_time := NOW() + (p_soft_close_seconds || ' seconds')::INTERVAL;

    UPDATE auctions
    SET end_at = v_new_end_time,
        updated_at = NOW()
    WHERE id = p_auction_id;

    v_soft_close_extended := TRUE;
  END IF;

  -- Return the result as JSON
  RETURN json_build_object(
    'bid_id', v_new_bid_id,
    'bid_amount', p_amount_cad,
    'bid_created_at', v_new_bid_created_at,
    'soft_close_extended', v_soft_close_extended,
    'new_end_time', v_new_end_time
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to be handled by the application
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION place_bid_with_lock(UUID, UUID, DECIMAL, INTEGER, BOOLEAN) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION place_bid_with_lock IS
'Atomically places a bid with row-level locking to prevent race conditions during concurrent bidding. Handles soft close extensions and validates bid amounts against current auction state.';

-- Create index for better performance on bid queries
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount_desc ON bids(auction_id, amount_cad DESC);
CREATE INDEX IF NOT EXISTS idx_bids_auction_created_desc ON bids(auction_id, created_at DESC);

-- Add constraint to prevent negative bid amounts (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'bids_amount_positive'
  ) THEN
    ALTER TABLE bids ADD CONSTRAINT bids_amount_positive CHECK (amount_cad > 0);
  END IF;
END $$;

-- Add constraint to prevent bids on ended auctions (database level)
CREATE OR REPLACE FUNCTION check_auction_active()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auctions
    WHERE id = NEW.auction_id
    AND (NOW() >= end_at OR NOW() < start_at)
  ) THEN
    RAISE EXCEPTION 'Cannot place bid on inactive auction';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce auction active check
DROP TRIGGER IF EXISTS trigger_check_auction_active ON bids;
CREATE TRIGGER trigger_check_auction_active
  BEFORE INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION check_auction_active();

-- Add audit logging for bid placement
CREATE OR REPLACE FUNCTION log_bid_placement()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the bid placement in audit_logs
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    metadata
  ) VALUES (
    'bids',
    NEW.id::TEXT,
    'INSERT',
    '{}',
    json_build_object(
      'auction_id', NEW.auction_id,
      'bidder_id', NEW.bidder_id,
      'amount_cad', NEW.amount_cad
    ),
    NEW.bidder_id,
    json_build_object(
      'bid_placement', true,
      'concurrent_safe', true,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bid audit logging
DROP TRIGGER IF EXISTS trigger_log_bid_placement ON bids;
CREATE TRIGGER trigger_log_bid_placement
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION log_bid_placement();
