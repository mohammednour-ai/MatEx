-- Migration: 010_full_text_search.sql
-- Description: Add PostgreSQL Full-Text Search (FTS) capabilities to listings
-- Created: 2025-08-31
-- Phase: 3 - Auth & KYC

-- Add full-text search vector column to listings table
ALTER TABLE listings 
ADD COLUMN search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_listings_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.material_type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_city, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.location_province, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_search_vector();

-- Update existing records with search vectors
UPDATE listings SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(material_type, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(location_city, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(location_province, '')), 'D');

-- Create GIN index for full-text search performance
CREATE INDEX IF NOT EXISTS listings_search_vector_idx ON listings USING GIN(search_vector);

-- Create additional indexes for search optimization
CREATE INDEX IF NOT EXISTS listings_title_gin_idx ON listings USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS listings_description_gin_idx ON listings USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS listings_material_type_gin_idx ON listings USING GIN(to_tsvector('english', material_type));

-- Create search ranking function
CREATE OR REPLACE FUNCTION search_listings(
  search_query text,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  material_type text,
  category text,
  condition listing_condition,
  quantity numeric,
  unit text,
  pricing_type pricing_type,
  price_cad numeric,
  buy_now_cad numeric,
  location_city text,
  location_province text,
  status listing_status,
  seller_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  search_rank real,
  search_headline_title text,
  search_headline_description text
) AS $$
DECLARE
  search_tsquery tsquery;
BEGIN
  -- Convert search query to tsquery with proper formatting
  search_tsquery := plainto_tsquery('english', search_query);
  
  -- Return empty result if query is invalid
  IF search_tsquery IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.material_type,
    l.category,
    l.condition,
    l.quantity,
    l.unit,
    l.pricing_type,
    l.price_cad,
    l.buy_now_cad,
    l.location_city,
    l.location_province,
    l.status,
    l.seller_id,
    l.created_at,
    l.updated_at,
    ts_rank(l.search_vector, search_tsquery) AS search_rank,
    ts_headline('english', l.title, search_tsquery, 'MaxWords=10, MinWords=1, ShortWord=3, HighlightAll=false, MaxFragments=1') AS search_headline_title,
    ts_headline('english', l.description, search_tsquery, 'MaxWords=20, MinWords=1, ShortWord=3, HighlightAll=false, MaxFragments=2') AS search_headline_description
  FROM listings l
  WHERE 
    l.search_vector @@ search_tsquery
    AND l.status = 'active'
  ORDER BY 
    ts_rank(l.search_vector, search_tsquery) DESC,
    l.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create search suggestions function for autocomplete
CREATE OR REPLACE FUNCTION get_search_suggestions(
  partial_query text,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  suggestion text,
  category text,
  frequency bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_terms AS (
    -- Extract unique words from titles and material types
    SELECT 
      unnest(string_to_array(lower(title), ' ')) as term,
      'title' as source_category
    FROM listings 
    WHERE status = 'active' AND title IS NOT NULL
    
    UNION ALL
    
    SELECT 
      unnest(string_to_array(lower(material_type), ' ')) as term,
      'material' as source_category
    FROM listings 
    WHERE status = 'active' AND material_type IS NOT NULL
    
    UNION ALL
    
    SELECT 
      lower(category) as term,
      'category' as source_category
    FROM listings 
    WHERE status = 'active' AND category IS NOT NULL
  ),
  filtered_terms AS (
    SELECT 
      term,
      source_category,
      COUNT(*) as term_frequency
    FROM search_terms
    WHERE 
      length(term) >= 3
      AND term LIKE lower(partial_query) || '%'
      AND term NOT IN ('the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should')
    GROUP BY term, source_category
  )
  SELECT 
    ft.term as suggestion,
    ft.source_category as category,
    ft.term_frequency as frequency
  FROM filtered_terms ft
  ORDER BY ft.term_frequency DESC, ft.term ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create search analytics function
CREATE OR REPLACE FUNCTION log_search_query(
  query_text text,
  user_id uuid DEFAULT NULL,
  results_count integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  -- Insert search query for analytics (optional table creation)
  -- This can be used later for search analytics and improvements
  INSERT INTO search_logs (query, user_id, results_count, created_at)
  VALUES (query_text, user_id, results_count, NOW())
  ON CONFLICT DO NOTHING; -- Ignore if search_logs table doesn't exist yet
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist yet, ignore for now
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create search_logs table for analytics (optional)
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

-- Create index on search_logs for analytics queries
CREATE INDEX IF NOT EXISTS search_logs_created_at_idx ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS search_logs_query_idx ON search_logs(query);
CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON search_logs(user_id);

-- Enable RLS on search_logs
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_logs
CREATE POLICY "Users can view their own search logs" ON search_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert search logs" ON search_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all search logs" ON search_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON search_logs TO authenticated;
GRANT INSERT ON search_logs TO authenticated;
GRANT SELECT ON search_logs TO anon;

-- Add helpful comments
COMMENT ON COLUMN listings.search_vector IS 'Full-text search vector for efficient searching across title, description, material_type, category, and location';
COMMENT ON FUNCTION search_listings IS 'Full-text search function with ranking and highlighting for listings';
COMMENT ON FUNCTION get_search_suggestions IS 'Autocomplete suggestions based on existing listing content';
COMMENT ON FUNCTION log_search_query IS 'Log search queries for analytics and search improvement';
COMMENT ON TABLE search_logs IS 'Search query logs for analytics and search optimization';

-- Create view for popular search terms
CREATE OR REPLACE VIEW popular_search_terms AS
SELECT 
  query,
  COUNT(*) as search_count,
  AVG(results_count) as avg_results,
  MAX(created_at) as last_searched
FROM search_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY query
HAVING COUNT(*) >= 2
ORDER BY search_count DESC, last_searched DESC;

-- Grant access to the view
GRANT SELECT ON popular_search_terms TO authenticated;

COMMENT ON VIEW popular_search_terms IS 'Popular search terms from the last 30 days for analytics and trending topics';
