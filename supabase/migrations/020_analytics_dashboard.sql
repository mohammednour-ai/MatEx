-- T060: Trading volume tiles - Dashboard KPIs and analytics
-- Create comprehensive analytics system for dashboard metrics

-- Create analytics_cache table for performance optimization
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for analytics cache
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Public can read cached analytics (for dashboard)
CREATE POLICY "analytics_cache_public_read" ON analytics_cache
    FOR SELECT USING (expires_at > NOW());

-- Only system can write analytics cache
CREATE POLICY "analytics_cache_system_write" ON analytics_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_updated ON analytics_cache(updated_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_analytics_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analytics_cache_updated_at
    BEFORE UPDATE ON analytics_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_cache_updated_at();

-- Function to get active auctions count
CREATE OR REPLACE FUNCTION get_active_auctions_count()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO v_count
    FROM auctions a
    JOIN listings l ON a.listing_id = l.id
    WHERE l.status = 'active'
      AND a.start_at <= NOW()
      AND a.end_at > NOW();

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly trading volume
CREATE OR REPLACE FUNCTION get_weekly_trading_volume(
    p_weeks_back INTEGER DEFAULT 1
)
RETURNS TABLE (
    week_start DATE,
    total_volume_cad DECIMAL(12,2),
    order_count INTEGER,
    avg_order_value DECIMAL(10,2)
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calculate date range
    v_start_date := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week' * p_weeks_back);
    v_end_date := v_start_date + INTERVAL '6 days';

    RETURN QUERY
    SELECT
        v_start_date as week_start,
        COALESCE(SUM(o.total_cad), 0)::DECIMAL(12,2) as total_volume_cad,
        COUNT(o.id)::INTEGER as order_count,
        COALESCE(AVG(o.total_cad), 0)::DECIMAL(10,2) as avg_order_value
    FROM orders o
    WHERE o.status IN ('paid', 'fulfilled')
      AND DATE(o.created_at) >= v_start_date
      AND DATE(o.created_at) <= v_end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get new sellers count
CREATE OR REPLACE FUNCTION get_new_sellers_count(
    p_days_back INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;

    SELECT COUNT(DISTINCT p.id)::INTEGER
    INTO v_count
    FROM profiles p
    WHERE p.role IN ('seller', 'both')
      AND p.created_at >= v_cutoff_date;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get returning buyers count
CREATE OR REPLACE FUNCTION get_returning_buyers_count(
    p_days_back INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := NOW() - INTERVAL '1 day' * p_days_back;

    -- Count buyers who have made multiple orders
    SELECT COUNT(DISTINCT o.buyer_id)::INTEGER
    INTO v_count
    FROM orders o
    WHERE o.created_at >= v_cutoff_date
      AND o.buyer_id IN (
          SELECT buyer_id
          FROM orders
          WHERE status IN ('paid', 'fulfilled')
          GROUP BY buyer_id
          HAVING COUNT(*) > 1
      );

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_active_auctions INTEGER;
    v_weekly_volume RECORD;
    v_prev_weekly_volume RECORD;
    v_new_sellers INTEGER;
    v_returning_buyers INTEGER;
    v_total_listings INTEGER;
    v_total_users INTEGER;
    v_pending_kyc INTEGER;
    v_recent_activity JSONB;
BEGIN
    -- Get active auctions
    SELECT get_active_auctions_count() INTO v_active_auctions;

    -- Get current week volume
    SELECT * INTO v_weekly_volume FROM get_weekly_trading_volume(0) LIMIT 1;

    -- Get previous week volume for comparison
    SELECT * INTO v_prev_weekly_volume FROM get_weekly_trading_volume(1) LIMIT 1;

    -- Get new sellers (last 7 days)
    SELECT get_new_sellers_count(7) INTO v_new_sellers;

    -- Get returning buyers (last 7 days)
    SELECT get_returning_buyers_count(7) INTO v_returning_buyers;

    -- Get total listings count
    SELECT COUNT(*)::INTEGER INTO v_total_listings FROM listings WHERE status = 'active';

    -- Get total users count
    SELECT COUNT(*)::INTEGER INTO v_total_users FROM profiles;

    -- Get pending KYC count
    SELECT COUNT(*)::INTEGER INTO v_pending_kyc FROM profiles WHERE kyc_status = 'pending';

    -- Get recent activity (last 10 activities)
    SELECT COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'type', activity_type,
                'description', description,
                'timestamp', created_at,
                'user_name', user_name
            ) ORDER BY created_at DESC
        ), '[]'::JSON
    )::JSONB INTO v_recent_activity
    FROM (
        -- Recent listings
        SELECT
            'listing' as activity_type,
            'New listing: ' || l.title as description,
            l.created_at,
            p.full_name as user_name
        FROM listings l
        JOIN profiles p ON l.seller_id = p.id
        WHERE l.status = 'active'

        UNION ALL

        -- Recent orders
        SELECT
            'order' as activity_type,
            'Order completed: ' || l.title as description,
            o.created_at,
            p.full_name as user_name
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        JOIN profiles p ON o.buyer_id = p.id
        WHERE o.status IN ('paid', 'fulfilled')

        UNION ALL

        -- Recent bids
        SELECT
            'bid' as activity_type,
            'New bid on: ' || l.title as description,
            b.created_at,
            p.full_name as user_name
        FROM bids b
        JOIN auctions a ON b.auction_id = a.id
        JOIN listings l ON a.listing_id = l.id
        JOIN profiles p ON b.bidder_id = p.id

        ORDER BY created_at DESC
        LIMIT 10
    ) activities;

    -- Build result JSON
    v_result := JSON_BUILD_OBJECT(
        'active_auctions', JSON_BUILD_OBJECT(
            'current', v_active_auctions,
            'label', 'Active Auctions',
            'icon', 'gavel'
        ),
        'weekly_volume', JSON_BUILD_OBJECT(
            'current', COALESCE(v_weekly_volume.total_volume_cad, 0),
            'previous', COALESCE(v_prev_weekly_volume.total_volume_cad, 0),
            'order_count', COALESCE(v_weekly_volume.order_count, 0),
            'avg_order_value', COALESCE(v_weekly_volume.avg_order_value, 0),
            'label', 'Weekly Volume',
            'icon', 'chart-bar'
        ),
        'new_sellers', JSON_BUILD_OBJECT(
            'current', v_new_sellers,
            'label', 'New Sellers (7d)',
            'icon', 'user-plus'
        ),
        'returning_buyers', JSON_BUILD_OBJECT(
            'current', v_returning_buyers,
            'label', 'Returning Buyers (7d)',
            'icon', 'arrow-path'
        ),
        'total_listings', JSON_BUILD_OBJECT(
            'current', v_total_listings,
            'label', 'Active Listings',
            'icon', 'list-bullet'
        ),
        'total_users', JSON_BUILD_OBJECT(
            'current', v_total_users,
            'label', 'Total Users',
            'icon', 'users'
        ),
        'pending_kyc', JSON_BUILD_OBJECT(
            'current', v_pending_kyc,
            'label', 'Pending KYC',
            'icon', 'clock'
        ),
        'recent_activity', v_recent_activity,
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get historical trading volume data
CREATE OR REPLACE FUNCTION get_historical_trading_volume(
    p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
    week_start DATE,
    week_end DATE,
    total_volume_cad DECIMAL(12,2),
    order_count INTEGER,
    avg_order_value DECIMAL(10,2),
    unique_buyers INTEGER,
    unique_sellers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_data AS (
        SELECT
            DATE_TRUNC('week', o.created_at)::DATE as week_start,
            (DATE_TRUNC('week', o.created_at) + INTERVAL '6 days')::DATE as week_end,
            SUM(o.total_cad)::DECIMAL(12,2) as total_volume_cad,
            COUNT(o.id)::INTEGER as order_count,
            AVG(o.total_cad)::DECIMAL(10,2) as avg_order_value,
            COUNT(DISTINCT o.buyer_id)::INTEGER as unique_buyers,
            COUNT(DISTINCT o.seller_id)::INTEGER as unique_sellers
        FROM orders o
        WHERE o.status IN ('paid', 'fulfilled')
          AND o.created_at >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week' * p_weeks)
        GROUP BY DATE_TRUNC('week', o.created_at)
        ORDER BY week_start DESC
    )
    SELECT * FROM weekly_data;
END;
$$ LANGUAGE plpgsql;

-- Function to cache dashboard metrics
CREATE OR REPLACE FUNCTION cache_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
    v_metrics JSONB;
    v_cache_key VARCHAR(255) := 'dashboard_metrics';
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
BEGIN
    -- Get fresh metrics
    SELECT get_dashboard_metrics() INTO v_metrics;

    -- Upsert into cache
    INSERT INTO analytics_cache (cache_key, data, expires_at)
    VALUES (v_cache_key, v_metrics, v_expires_at)
    ON CONFLICT (cache_key)
    DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();

    RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached dashboard metrics
CREATE OR REPLACE FUNCTION get_cached_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
    v_cached_data JSONB;
BEGIN
    -- Try to get from cache first
    SELECT data INTO v_cached_data
    FROM analytics_cache
    WHERE cache_key = 'dashboard_metrics'
      AND expires_at > NOW();

    -- If not found or expired, generate fresh data
    IF v_cached_data IS NULL THEN
        SELECT cache_dashboard_metrics() INTO v_cached_data;
    END IF;

    RETURN v_cached_data;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache
    WHERE expires_at <= NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON analytics_cache TO anon, authenticated;
GRANT ALL ON analytics_cache TO service_role;
GRANT EXECUTE ON FUNCTION get_active_auctions_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_trading_volume(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_new_sellers_count(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_returning_buyers_count(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_historical_trading_volume(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cached_dashboard_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cache_dashboard_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_analytics_cache() TO service_role;

-- Add table and function comments
COMMENT ON TABLE analytics_cache IS 'Cached analytics data for dashboard performance optimization';
COMMENT ON FUNCTION get_active_auctions_count() IS 'Get count of currently active auctions';
COMMENT ON FUNCTION get_weekly_trading_volume(INTEGER) IS 'Get trading volume statistics for specified weeks back';
COMMENT ON FUNCTION get_new_sellers_count(INTEGER) IS 'Get count of new sellers in specified days';
COMMENT ON FUNCTION get_returning_buyers_count(INTEGER) IS 'Get count of returning buyers in specified days';
COMMENT ON FUNCTION get_dashboard_metrics() IS 'Get comprehensive dashboard KPI metrics';
COMMENT ON FUNCTION get_historical_trading_volume(INTEGER) IS 'Get historical trading volume data for charts';
COMMENT ON FUNCTION cache_dashboard_metrics() IS 'Cache dashboard metrics with 5-minute TTL';
COMMENT ON FUNCTION get_cached_dashboard_metrics() IS 'Get dashboard metrics from cache or generate fresh';
COMMENT ON FUNCTION cleanup_expired_analytics_cache() IS 'Remove expired cache entries';
