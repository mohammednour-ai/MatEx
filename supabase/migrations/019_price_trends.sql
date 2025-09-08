-- T059: Price trend charts - Historical price data aggregation and analytics
-- Create comprehensive price trends system with weekly aggregation and caching

-- Create price_trends table for aggregated historical data
CREATE TABLE IF NOT EXISTS price_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material VARCHAR(100) NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    avg_winning_bid_cad DECIMAL(10,2),
    median_winning_bid_cad DECIMAL(10,2),
    min_winning_bid_cad DECIMAL(10,2),
    max_winning_bid_cad DECIMAL(10,2),
    total_volume_kg DECIMAL(12,2),
    auction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT price_trends_positive_prices CHECK (
        avg_winning_bid_cad >= 0 AND
        median_winning_bid_cad >= 0 AND
        min_winning_bid_cad >= 0 AND
        max_winning_bid_cad >= 0
    ),
    CONSTRAINT price_trends_positive_volume CHECK (total_volume_kg >= 0),
    CONSTRAINT price_trends_positive_count CHECK (auction_count >= 0),
    CONSTRAINT price_trends_valid_week CHECK (week_end >= week_start),
    CONSTRAINT price_trends_unique_material_week UNIQUE (material, week_start)
);

-- Add RLS policies
ALTER TABLE price_trends ENABLE ROW LEVEL SECURITY;

-- Public can read price trends (for charts)
CREATE POLICY "price_trends_public_read" ON price_trends
    FOR SELECT USING (true);

-- Only system can insert/update price trends
CREATE POLICY "price_trends_system_write" ON price_trends
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_price_trends_material ON price_trends(material);
CREATE INDEX idx_price_trends_week_start ON price_trends(week_start DESC);
CREATE INDEX idx_price_trends_material_week ON price_trends(material, week_start DESC);
CREATE INDEX idx_price_trends_updated_at ON price_trends(updated_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_price_trends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_trends_updated_at
    BEFORE UPDATE ON price_trends
    FOR EACH ROW
    EXECUTE FUNCTION update_price_trends_updated_at();

-- Function to aggregate price data for a specific week and material
CREATE OR REPLACE FUNCTION aggregate_price_data_for_week(
    p_material VARCHAR(100),
    p_week_start DATE
)
RETURNS VOID AS $$
DECLARE
    v_week_end DATE;
    v_avg_price DECIMAL(10,2);
    v_median_price DECIMAL(10,2);
    v_min_price DECIMAL(10,2);
    v_max_price DECIMAL(10,2);
    v_total_volume DECIMAL(12,2);
    v_auction_count INTEGER;
BEGIN
    -- Calculate week end (Sunday)
    v_week_end := p_week_start + INTERVAL '6 days';

    -- Aggregate winning bid data for completed auctions
    SELECT
        AVG(o.total_cad)::DECIMAL(10,2),
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.total_cad)::DECIMAL(10,2),
        MIN(o.total_cad)::DECIMAL(10,2),
        MAX(o.total_cad)::DECIMAL(10,2),
        SUM(COALESCE(l.quantity_kg, 0))::DECIMAL(12,2),
        COUNT(*)::INTEGER
    INTO
        v_avg_price,
        v_median_price,
        v_min_price,
        v_max_price,
        v_total_volume,
        v_auction_count
    FROM orders o
    JOIN listings l ON o.listing_id = l.id
    JOIN auctions a ON l.id = a.listing_id
    WHERE
        l.material = p_material
        AND o.type = 'auction'
        AND o.status = 'fulfilled'
        AND DATE(a.end_at) >= p_week_start
        AND DATE(a.end_at) <= v_week_end;

    -- Only insert if we have data
    IF v_auction_count > 0 THEN
        INSERT INTO price_trends (
            material,
            week_start,
            week_end,
            avg_winning_bid_cad,
            median_winning_bid_cad,
            min_winning_bid_cad,
            max_winning_bid_cad,
            total_volume_kg,
            auction_count
        ) VALUES (
            p_material,
            p_week_start,
            v_week_end,
            v_avg_price,
            v_median_price,
            v_min_price,
            v_max_price,
            v_total_volume,
            v_auction_count
        )
        ON CONFLICT (material, week_start)
        DO UPDATE SET
            week_end = EXCLUDED.week_end,
            avg_winning_bid_cad = EXCLUDED.avg_winning_bid_cad,
            median_winning_bid_cad = EXCLUDED.median_winning_bid_cad,
            min_winning_bid_cad = EXCLUDED.min_winning_bid_cad,
            max_winning_bid_cad = EXCLUDED.max_winning_bid_cad,
            total_volume_kg = EXCLUDED.total_volume_kg,
            auction_count = EXCLUDED.auction_count,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate all materials for a specific week
CREATE OR REPLACE FUNCTION aggregate_price_data_for_all_materials(
    p_week_start DATE DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_week_start DATE;
    v_material_record RECORD;
    v_processed_count INTEGER := 0;
BEGIN
    -- Default to last Monday if no date provided
    IF p_week_start IS NULL THEN
        v_week_start := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week');
    ELSE
        v_week_start := DATE_TRUNC('week', p_week_start);
    END IF;

    -- Process each material that has completed auctions
    FOR v_material_record IN
        SELECT DISTINCT l.material
        FROM listings l
        JOIN auctions a ON l.id = a.listing_id
        JOIN orders o ON l.id = o.listing_id
        WHERE
            o.type = 'auction'
            AND o.status = 'fulfilled'
            AND DATE(a.end_at) >= v_week_start
            AND DATE(a.end_at) <= v_week_start + INTERVAL '6 days'
    LOOP
        PERFORM aggregate_price_data_for_week(v_material_record.material, v_week_start);
        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get price trends for a material with date range
CREATE OR REPLACE FUNCTION get_price_trends(
    p_material VARCHAR(100),
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 52
)
RETURNS TABLE (
    week_start DATE,
    week_end DATE,
    avg_price DECIMAL(10,2),
    median_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    volume_kg DECIMAL(12,2),
    auction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.week_start,
        pt.week_end,
        pt.avg_winning_bid_cad,
        pt.median_winning_bid_cad,
        pt.min_winning_bid_cad,
        pt.max_winning_bid_cad,
        pt.total_volume_kg,
        pt.auction_count
    FROM price_trends pt
    WHERE
        pt.material = p_material
        AND (p_start_date IS NULL OR pt.week_start >= p_start_date)
        AND (p_end_date IS NULL OR pt.week_start <= p_end_date)
    ORDER BY pt.week_start DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get available materials with price data
CREATE OR REPLACE FUNCTION get_materials_with_price_data()
RETURNS TABLE (
    material VARCHAR(100),
    latest_week DATE,
    total_weeks INTEGER,
    avg_weekly_volume DECIMAL(12,2),
    latest_avg_price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.material,
        MAX(pt.week_start) as latest_week,
        COUNT(*)::INTEGER as total_weeks,
        AVG(pt.total_volume_kg)::DECIMAL(12,2) as avg_weekly_volume,
        (SELECT pt2.avg_winning_bid_cad
         FROM price_trends pt2
         WHERE pt2.material = pt.material
         ORDER BY pt2.week_start DESC
         LIMIT 1)::DECIMAL(10,2) as latest_avg_price
    FROM price_trends pt
    GROUP BY pt.material
    ORDER BY latest_week DESC, pt.material;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old price trends (keep 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_price_trends()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM price_trends
    WHERE week_start < CURRENT_DATE - INTERVAL '2 years';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON price_trends TO anon, authenticated;
GRANT ALL ON price_trends TO service_role;
GRANT EXECUTE ON FUNCTION get_price_trends(VARCHAR, DATE, DATE, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_materials_with_price_data() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION aggregate_price_data_for_week(VARCHAR, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION aggregate_price_data_for_all_materials(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_price_trends() TO service_role;

-- Add table and function comments
COMMENT ON TABLE price_trends IS 'Weekly aggregated price data for materials from completed auctions';
COMMENT ON FUNCTION aggregate_price_data_for_week(VARCHAR, DATE) IS 'Aggregate price data for a specific material and week';
COMMENT ON FUNCTION aggregate_price_data_for_all_materials(DATE) IS 'Aggregate price data for all materials for a specific week';
COMMENT ON FUNCTION get_price_trends(VARCHAR, DATE, DATE, INTEGER) IS 'Retrieve price trends for a material with optional date filtering';
COMMENT ON FUNCTION get_materials_with_price_data() IS 'Get list of materials with available price trend data';
COMMENT ON FUNCTION cleanup_old_price_trends() IS 'Remove price trend data older than 2 years';
