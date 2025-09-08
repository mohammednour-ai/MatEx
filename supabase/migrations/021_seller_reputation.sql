-- T061: Seller reputation scoring system
-- Create tables and functions to compute seller reputation based on fulfillment time, disputes, and cancellations

-- Create seller_reputation_scores table to cache computed scores
CREATE TABLE seller_reputation_scores (
  seller_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 5), -- 0.00 to 5.00
  total_orders INTEGER NOT NULL DEFAULT 0,
  fulfilled_orders INTEGER NOT NULL DEFAULT 0,
  avg_fulfillment_days NUMERIC(5,2),
  dispute_count INTEGER NOT NULL DEFAULT 0,
  cancellation_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE seller_reputation_scores ENABLE ROW LEVEL SECURITY;

-- Public can read all reputation scores
CREATE POLICY "Public can read reputation scores" ON seller_reputation_scores
  FOR SELECT USING (true);

-- Only admins can insert/update reputation scores
CREATE POLICY "Admins can manage reputation scores" ON seller_reputation_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX idx_seller_reputation_scores_seller_id ON seller_reputation_scores(seller_id);
CREATE INDEX idx_seller_reputation_scores_score ON seller_reputation_scores(score DESC);
CREATE INDEX idx_seller_reputation_scores_last_calculated ON seller_reputation_scores(last_calculated_at);

-- Function to calculate seller reputation score
CREATE OR REPLACE FUNCTION calculate_seller_reputation_score(seller_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_orders INTEGER := 0;
  fulfilled_orders INTEGER := 0;
  avg_fulfillment_days NUMERIC := 0;
  dispute_count INTEGER := 0;
  cancellation_count INTEGER := 0;
  base_score NUMERIC := 5.0;
  fulfillment_penalty NUMERIC := 0;
  dispute_penalty NUMERIC := 0;
  cancellation_penalty NUMERIC := 0;
  final_score NUMERIC := 5.0;
BEGIN
  -- Get total orders for this seller
  SELECT COUNT(*) INTO total_orders
  FROM orders
  WHERE seller_id = seller_user_id;

  -- If no orders, return neutral score
  IF total_orders = 0 THEN
    RETURN 3.0;
  END IF;

  -- Get fulfilled orders count
  SELECT COUNT(*) INTO fulfilled_orders
  FROM orders
  WHERE seller_id = seller_user_id
    AND status = 'fulfilled';

  -- Calculate average fulfillment time (in days) for fulfilled orders
  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) INTO avg_fulfillment_days
  FROM orders
  WHERE seller_id = seller_user_id
    AND status = 'fulfilled';

  -- Count disputes (orders with status indicating issues)
  SELECT COUNT(*) INTO dispute_count
  FROM orders
  WHERE seller_id = seller_user_id
    AND status IN ('disputed', 'refunded');

  -- Count cancellations
  SELECT COUNT(*) INTO cancellation_count
  FROM orders
  WHERE seller_id = seller_user_id
    AND status = 'cancelled';

  -- Calculate penalties

  -- Fulfillment rate penalty (0-1.5 points)
  IF total_orders > 0 THEN
    fulfillment_penalty := (1.0 - (fulfilled_orders::NUMERIC / total_orders)) * 1.5;
  END IF;

  -- Average fulfillment time penalty (0-1.0 points)
  -- Penalty increases if fulfillment takes longer than 7 days
  IF avg_fulfillment_days IS NOT NULL AND avg_fulfillment_days > 7 THEN
    fulfillment_penalty := fulfillment_penalty + LEAST((avg_fulfillment_days - 7) / 14, 1.0);
  END IF;

  -- Dispute penalty (0.5 points per dispute, max 2.0 points)
  dispute_penalty := LEAST(dispute_count * 0.5, 2.0);

  -- Cancellation penalty (0.3 points per cancellation, max 1.5 points)
  cancellation_penalty := LEAST(cancellation_count * 0.3, 1.5);

  -- Calculate final score
  final_score := base_score - fulfillment_penalty - dispute_penalty - cancellation_penalty;

  -- Ensure score is between 0 and 5
  final_score := GREATEST(0, LEAST(5, final_score));

  RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update seller reputation score
CREATE OR REPLACE FUNCTION update_seller_reputation_score(seller_user_id UUID)
RETURNS void AS $$
DECLARE
  calculated_score NUMERIC;
  total_orders INTEGER := 0;
  fulfilled_orders INTEGER := 0;
  avg_fulfillment_days NUMERIC;
  dispute_count INTEGER := 0;
  cancellation_count INTEGER := 0;
BEGIN
  -- Calculate the score
  calculated_score := calculate_seller_reputation_score(seller_user_id);

  -- Get additional metrics for storage
  SELECT COUNT(*) INTO total_orders
  FROM orders WHERE seller_id = seller_user_id;

  SELECT COUNT(*) INTO fulfilled_orders
  FROM orders WHERE seller_id = seller_user_id AND status = 'fulfilled';

  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) INTO avg_fulfillment_days
  FROM orders WHERE seller_id = seller_user_id AND status = 'fulfilled';

  SELECT COUNT(*) INTO dispute_count
  FROM orders WHERE seller_id = seller_user_id AND status IN ('disputed', 'refunded');

  SELECT COUNT(*) INTO cancellation_count
  FROM orders WHERE seller_id = seller_user_id AND status = 'cancelled';

  -- Upsert the reputation score
  INSERT INTO seller_reputation_scores (
    seller_id,
    score,
    total_orders,
    fulfilled_orders,
    avg_fulfillment_days,
    dispute_count,
    cancellation_count,
    last_calculated_at,
    updated_at
  ) VALUES (
    seller_user_id,
    calculated_score,
    total_orders,
    fulfilled_orders,
    avg_fulfillment_days,
    dispute_count,
    cancellation_count,
    NOW(),
    NOW()
  )
  ON CONFLICT (seller_id) DO UPDATE SET
    score = EXCLUDED.score,
    total_orders = EXCLUDED.total_orders,
    fulfilled_orders = EXCLUDED.fulfilled_orders,
    avg_fulfillment_days = EXCLUDED.avg_fulfillment_days,
    dispute_count = EXCLUDED.dispute_count,
    cancellation_count = EXCLUDED.cancellation_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get seller reputation with details
CREATE OR REPLACE FUNCTION get_seller_reputation(seller_user_id UUID)
RETURNS TABLE (
  seller_id UUID,
  score NUMERIC,
  total_orders INTEGER,
  fulfilled_orders INTEGER,
  fulfillment_rate NUMERIC,
  avg_fulfillment_days NUMERIC,
  dispute_count INTEGER,
  cancellation_count INTEGER,
  badge_level TEXT,
  last_calculated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Update score if it's older than 1 hour or doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM seller_reputation_scores
    WHERE seller_reputation_scores.seller_id = seller_user_id
      AND last_calculated_at > NOW() - INTERVAL '1 hour'
  ) THEN
    PERFORM update_seller_reputation_score(seller_user_id);
  END IF;

  -- Return the reputation data with badge level
  RETURN QUERY
  SELECT
    srs.seller_id,
    srs.score,
    srs.total_orders,
    srs.fulfilled_orders,
    CASE
      WHEN srs.total_orders = 0 THEN 0
      ELSE ROUND((srs.fulfilled_orders::NUMERIC / srs.total_orders) * 100, 1)
    END as fulfillment_rate,
    srs.avg_fulfillment_days,
    srs.dispute_count,
    srs.cancellation_count,
    CASE
      WHEN srs.score >= 4.5 THEN 'excellent'
      WHEN srs.score >= 4.0 THEN 'very-good'
      WHEN srs.score >= 3.5 THEN 'good'
      WHEN srs.score >= 3.0 THEN 'fair'
      WHEN srs.score >= 2.0 THEN 'poor'
      ELSE 'very-poor'
    END as badge_level,
    srs.last_calculated_at
  FROM seller_reputation_scores srs
  WHERE srs.seller_id = seller_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all seller reputation scores (for admin/cron use)
CREATE OR REPLACE FUNCTION refresh_all_seller_reputation_scores()
RETURNS INTEGER AS $$
DECLARE
  seller_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Update scores for all sellers who have orders
  FOR seller_record IN
    SELECT DISTINCT seller_id
    FROM orders
    WHERE seller_id IS NOT NULL
  LOOP
    PERFORM update_seller_reputation_score(seller_record.seller_id);
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update reputation when order status changes
CREATE OR REPLACE FUNCTION trigger_update_seller_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation for the seller when order status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM update_seller_reputation_score(NEW.seller_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM update_seller_reputation_score(NEW.seller_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_orders_reputation_update ON orders;
CREATE TRIGGER trigger_orders_reputation_update
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_seller_reputation();

-- Add comment for documentation
COMMENT ON TABLE seller_reputation_scores IS 'Cached seller reputation scores based on fulfillment time, disputes, and cancellations';
COMMENT ON FUNCTION calculate_seller_reputation_score(UUID) IS 'Calculates seller reputation score (0-5) based on order history';
COMMENT ON FUNCTION get_seller_reputation(UUID) IS 'Gets seller reputation with automatic refresh if stale';
