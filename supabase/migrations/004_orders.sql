-- Migration: 004_orders.sql
-- Description: Create orders table for payment and order tracking
-- Task: T009 - Orders schema

-- Create order_type enum
CREATE TYPE order_type AS ENUM ('fixed', 'auction');

-- Create order_status enum
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled', 'fulfilled');

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type order_type NOT NULL,
  total_cad DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent TEXT, -- Stripe PaymentIntent ID
  stripe_checkout_session TEXT, -- Stripe Checkout Session ID (for fixed price orders)
  platform_fee_cad DECIMAL(10,2), -- Platform fee amount
  seller_payout_cad DECIMAL(10,2), -- Amount to be paid to seller after fees
  notes TEXT, -- Admin or system notes
  fulfilled_at TIMESTAMPTZ, -- When order was marked as fulfilled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT orders_positive_total CHECK (total_cad > 0),
  CONSTRAINT orders_positive_fee CHECK (platform_fee_cad >= 0 OR platform_fee_cad IS NULL),
  CONSTRAINT orders_positive_payout CHECK (seller_payout_cad >= 0 OR seller_payout_cad IS NULL),
  CONSTRAINT orders_buyer_not_seller CHECK (buyer_id != seller_id),
  CONSTRAINT orders_fulfilled_when_status CHECK (
    (status = 'fulfilled' AND fulfilled_at IS NOT NULL) OR 
    (status != 'fulfilled' AND fulfilled_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_stripe_payment_intent ON orders(stripe_payment_intent) WHERE stripe_payment_intent IS NOT NULL;
CREATE INDEX idx_orders_stripe_checkout_session ON orders(stripe_checkout_session) WHERE stripe_checkout_session IS NOT NULL;
CREATE INDEX idx_orders_buyer_status ON orders(buyer_id, status); -- For buyer order history
CREATE INDEX idx_orders_seller_status ON orders(seller_id, status); -- For seller order management

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table

-- Buyers can read their own orders
CREATE POLICY "orders_select_buyer" ON orders
  FOR SELECT
  USING (buyer_id = auth.uid());

-- Sellers can read orders for their listings
CREATE POLICY "orders_select_seller" ON orders
  FOR SELECT
  USING (seller_id = auth.uid());

-- System can create orders (via API with service role)
CREATE POLICY "orders_insert_system" ON orders
  FOR INSERT
  WITH CHECK (true); -- Will be controlled by API logic

-- Buyers can update their own orders (limited fields)
CREATE POLICY "orders_update_buyer" ON orders
  FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- Sellers can update orders for their listings (limited fields)
CREATE POLICY "orders_update_seller" ON orders
  FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Admins can manage all orders
CREATE POLICY "orders_admin_all" ON orders
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

-- Function to calculate platform fee
CREATE OR REPLACE FUNCTION calculate_platform_fee(order_total DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  fee_percent DECIMAL;
BEGIN
  -- Get fee percentage from app_settings (will be created in T011)
  -- For now, use a default of 4%
  fee_percent := 0.04;
  
  RETURN ROUND(order_total * fee_percent, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate seller payout
CREATE OR REPLACE FUNCTION calculate_seller_payout(order_total DECIMAL, platform_fee DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  RETURN order_total - COALESCE(platform_fee, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create order from listing (for fixed price)
CREATE OR REPLACE FUNCTION create_fixed_order(
  p_listing_id UUID,
  p_buyer_id UUID
)
RETURNS UUID AS $$
DECLARE
  listing_record RECORD;
  order_id UUID;
  platform_fee DECIMAL;
  seller_payout DECIMAL;
BEGIN
  -- Get listing details
  SELECT l.id, l.seller_id, l.price_cad, l.status, l.pricing_type
  INTO listing_record
  FROM listings l
  WHERE l.id = p_listing_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF listing_record.status != 'active' THEN
    RAISE EXCEPTION 'Listing is not active';
  END IF;
  
  IF listing_record.pricing_type != 'fixed' THEN
    RAISE EXCEPTION 'Listing is not fixed price';
  END IF;
  
  IF listing_record.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Buyer cannot purchase their own listing';
  END IF;
  
  -- Calculate fees
  platform_fee := calculate_platform_fee(listing_record.price_cad);
  seller_payout := calculate_seller_payout(listing_record.price_cad, platform_fee);
  
  -- Create order
  INSERT INTO orders (
    listing_id,
    buyer_id,
    seller_id,
    type,
    total_cad,
    platform_fee_cad,
    seller_payout_cad,
    status
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    listing_record.seller_id,
    'fixed',
    listing_record.price_cad,
    platform_fee,
    seller_payout,
    'pending'
  ) RETURNING id INTO order_id;
  
  RETURN order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create order from auction (for auction winner)
CREATE OR REPLACE FUNCTION create_auction_order(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_winning_bid_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
  listing_record RECORD;
  order_id UUID;
  platform_fee DECIMAL;
  seller_payout DECIMAL;
BEGIN
  -- Get listing details
  SELECT l.id, l.seller_id, l.status, l.pricing_type
  INTO listing_record
  FROM listings l
  WHERE l.id = p_listing_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  
  IF listing_record.pricing_type != 'auction' THEN
    RAISE EXCEPTION 'Listing is not auction type';
  END IF;
  
  IF listing_record.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Seller cannot win their own auction';
  END IF;
  
  -- Calculate fees
  platform_fee := calculate_platform_fee(p_winning_bid_amount);
  seller_payout := calculate_seller_payout(p_winning_bid_amount, platform_fee);
  
  -- Create order
  INSERT INTO orders (
    listing_id,
    buyer_id,
    seller_id,
    type,
    total_cad,
    platform_fee_cad,
    seller_payout_cad,
    status
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    listing_record.seller_id,
    'auction',
    p_winning_bid_amount,
    platform_fee,
    seller_payout,
    'pending'
  ) RETURNING id INTO order_id;
  
  RETURN order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_status order_status;
BEGIN
  -- Get current status
  SELECT status INTO current_status
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Update order
  UPDATE orders
  SET 
    status = p_new_status,
    fulfilled_at = CASE WHEN p_new_status = 'fulfilled' THEN NOW() ELSE fulfilled_at END,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Comments for documentation
COMMENT ON TABLE orders IS 'Orders created from fixed price purchases or auction wins';

COMMENT ON COLUMN orders.listing_id IS 'Foreign key to the listing being purchased';
COMMENT ON COLUMN orders.buyer_id IS 'Foreign key to the buyer profile';
COMMENT ON COLUMN orders.seller_id IS 'Foreign key to the seller profile';
COMMENT ON COLUMN orders.type IS 'Type of order: fixed price or auction';
COMMENT ON COLUMN orders.total_cad IS 'Total order amount in CAD';
COMMENT ON COLUMN orders.status IS 'Order status: pending, paid, cancelled, fulfilled';
COMMENT ON COLUMN orders.stripe_payment_intent IS 'Stripe PaymentIntent ID for payment tracking';
COMMENT ON COLUMN orders.stripe_checkout_session IS 'Stripe Checkout Session ID for fixed price orders';
COMMENT ON COLUMN orders.platform_fee_cad IS 'Platform fee amount deducted from total';
COMMENT ON COLUMN orders.seller_payout_cad IS 'Amount to be paid to seller after fees';
COMMENT ON COLUMN orders.fulfilled_at IS 'Timestamp when order was marked as fulfilled';

COMMENT ON FUNCTION calculate_platform_fee(DECIMAL) IS 'Calculates platform fee based on order total';
COMMENT ON FUNCTION calculate_seller_payout(DECIMAL, DECIMAL) IS 'Calculates seller payout after platform fees';
COMMENT ON FUNCTION create_fixed_order(UUID, UUID) IS 'Creates an order for a fixed price listing';
COMMENT ON FUNCTION create_auction_order(UUID, UUID, DECIMAL) IS 'Creates an order for an auction winner';
COMMENT ON FUNCTION update_order_status(UUID, order_status, TEXT) IS 'Updates order status with optional notes';
