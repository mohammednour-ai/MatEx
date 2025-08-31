-- Migration: 002_listings_images.sql
-- Description: Create listings and listing_images tables with RLS policies
-- Date: 2025-08-30

-- Create custom types for listings
CREATE TYPE listing_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor', 'scrap');
CREATE TYPE pricing_type AS ENUM ('fixed', 'auction');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'expired', 'cancelled', 'suspended');

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material TEXT NOT NULL,
  condition listing_condition NOT NULL DEFAULT 'good',
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  pricing_type pricing_type NOT NULL DEFAULT 'fixed',
  price_cad NUMERIC(10,2) CHECK (price_cad >= 0),
  buy_now_cad NUMERIC(10,2) CHECK (buy_now_cad >= 0),
  location_city TEXT NOT NULL,
  location_province TEXT NOT NULL,
  location_address TEXT,
  postal_code TEXT,
  status listing_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_pricing CHECK (
    (pricing_type = 'fixed' AND price_cad IS NOT NULL) OR
    (pricing_type = 'auction' AND buy_now_cad IS NOT NULL)
  )
);

-- Create listing_images table
CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one primary image per listing
  CONSTRAINT unique_primary_per_listing UNIQUE (listing_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Create trigger for updated_at on listings
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings

-- Policy: Public can read active listings
CREATE POLICY "Public can read active listings" ON listings
  FOR SELECT
  USING (status = 'active');

-- Policy: Sellers can read their own listings (all statuses)
CREATE POLICY "Sellers can read own listings" ON listings
  FOR SELECT
  USING (seller_id = auth.uid());

-- Policy: Sellers can insert their own listings
CREATE POLICY "Sellers can insert own listings" ON listings
  FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Policy: Sellers can update their own listings
CREATE POLICY "Sellers can update own listings" ON listings
  FOR UPDATE
  USING (seller_id = auth.uid());

-- Policy: Sellers can delete their own listings
CREATE POLICY "Sellers can delete own listings" ON listings
  FOR DELETE
  USING (seller_id = auth.uid());

-- Policy: Admins can read all listings
CREATE POLICY "Admins can read all listings" ON listings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all listings
CREATE POLICY "Admins can update all listings" ON listings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete all listings
CREATE POLICY "Admins can delete all listings" ON listings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for listing_images

-- Policy: Public can read images of active listings
CREATE POLICY "Public can read images of active listings" ON listing_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_images.listing_id AND status = 'active'
    )
  );

-- Policy: Sellers can read images of their own listings
CREATE POLICY "Sellers can read own listing images" ON listing_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

-- Policy: Sellers can insert images for their own listings
CREATE POLICY "Sellers can insert own listing images" ON listing_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

-- Policy: Sellers can update images of their own listings
CREATE POLICY "Sellers can update own listing images" ON listing_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

-- Policy: Sellers can delete images of their own listings
CREATE POLICY "Sellers can delete own listing images" ON listing_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_images.listing_id AND seller_id = auth.uid()
    )
  );

-- Policy: Admins can manage all listing images
CREATE POLICY "Admins can manage all listing images" ON listing_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_material_idx ON listings(material);
CREATE INDEX IF NOT EXISTS listings_pricing_type_idx ON listings(pricing_type);
CREATE INDEX IF NOT EXISTS listings_location_city_idx ON listings(location_city);
CREATE INDEX IF NOT EXISTS listings_location_province_idx ON listings(location_province);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at);
CREATE INDEX IF NOT EXISTS listings_expires_at_idx ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_featured_idx ON listings(featured);
CREATE INDEX IF NOT EXISTS listings_views_count_idx ON listings(views_count);

-- Indexes for listing_images
CREATE INDEX IF NOT EXISTS listing_images_listing_id_idx ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS listing_images_sort_order_idx ON listing_images(listing_id, sort_order);
CREATE INDEX IF NOT EXISTS listing_images_is_primary_idx ON listing_images(listing_id, is_primary);

-- Create function to increment views count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings
  SET views_count = views_count + 1
  WHERE id = listing_uuid AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set primary image
CREATE OR REPLACE FUNCTION set_primary_image(image_uuid UUID)
RETURNS VOID AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  -- Get the listing_id for the image
  SELECT listing_id INTO target_listing_id
  FROM listing_images
  WHERE id = image_uuid;
  
  -- Remove primary flag from all images of this listing
  UPDATE listing_images
  SET is_primary = FALSE
  WHERE listing_id = target_listing_id;
  
  -- Set the specified image as primary
  UPDATE listing_images
  SET is_primary = TRUE
  WHERE id = image_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON listings TO authenticated;
GRANT SELECT ON listings TO anon;
GRANT ALL ON listing_images TO authenticated;
GRANT SELECT ON listing_images TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_listing_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_primary_image(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE listings IS 'Product listings for the marketplace';
COMMENT ON COLUMN listings.pricing_type IS 'Fixed price or auction listing';
COMMENT ON COLUMN listings.condition IS 'Physical condition of the material';
COMMENT ON COLUMN listings.quantity IS 'Quantity available in specified unit';
COMMENT ON COLUMN listings.featured IS 'Whether listing is featured (premium)';
COMMENT ON COLUMN listings.views_count IS 'Number of times listing has been viewed';

COMMENT ON TABLE listing_images IS 'Images associated with listings';
COMMENT ON COLUMN listing_images.sort_order IS 'Display order of images';
COMMENT ON COLUMN listing_images.is_primary IS 'Primary image for listing thumbnail';
COMMENT ON FUNCTION increment_listing_views(UUID) IS 'Safely increment listing view count';
COMMENT ON FUNCTION set_primary_image(UUID) IS 'Set an image as primary for a listing';
