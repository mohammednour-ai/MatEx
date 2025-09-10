# T007 - Listings + Images Schema

## Overview
Implemented comprehensive listings and listing images schema to support material listings with multiple images, pricing options, and location-based filtering for the MatEx marketplace.

## Implementation Details

### 1. Listings Table
- **Material Information**: Title, description, material type, condition
- **Quantity & Pricing**: Numeric quantities with units, flexible pricing
- **Location Data**: City and province for Canadian marketplace
- **Status Management**: Draft, active, sold, expired states

### 2. Listing Images Table
- **Multiple Images**: Support for multiple photos per listing
- **Image Ordering**: Sort order for image gallery display
- **Storage Integration**: URLs pointing to Supabase Storage

## Technical Implementation

### Database Schema (002_listings_images.sql)
```sql
-- Create enum types
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'expired', 'cancelled');
CREATE TYPE pricing_type AS ENUM ('fixed', 'auction');
CREATE TYPE material_condition AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

-- Create listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  material TEXT NOT NULL,
  condition material_condition NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  pricing_type pricing_type NOT NULL DEFAULT 'fixed',
  price_cad NUMERIC CHECK (price_cad >= 0),
  buy_now_cad NUMERIC CHECK (buy_now_cad >= 0),
  location_city TEXT NOT NULL,
  location_province TEXT NOT NULL,
  status listing_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create listing images table
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings
CREATE POLICY "Sellers can CRUD own listings" ON listings
  FOR ALL USING (seller_id = auth.uid());

CREATE POLICY "Public can read active listings" ON listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins have full access to listings" ON listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for listing_images
CREATE POLICY "Sellers can manage own listing images" ON listing_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Public can read images of active listings" ON listing_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id AND status = 'active'
    )
  );

-- Indexes
CREATE INDEX idx_listings_seller_id ON listings(seller_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_material ON listings(material);
CREATE INDEX idx_listings_location ON listings(location_province, location_city);
CREATE INDEX idx_listings_pricing_type ON listings(pricing_type);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX idx_listing_images_sort_order ON listing_images(listing_id, sort_order);
```

## Files Created
- `supabase/migrations/002_listings_images.sql` - Database migration

## Data Model Features

### Listings Table Fields
- `id`: Unique listing identifier
- `seller_id`: Reference to seller profile
- `title`: Listing headline
- `description`: Detailed description
- `material`: Type of material (steel, aluminum, etc.)
- `condition`: Material condition rating
- `quantity`: Amount available
- `unit`: Unit of measurement (tons, kg, pieces)
- `pricing_type`: Fixed price or auction
- `price_cad`: Fixed price in CAD
- `buy_now_cad`: Buy-it-now price for auctions
- `location_city`: City location
- `location_province`: Province location
- `status`: Current listing status

### Listing Images Features
- Multiple images per listing
- Sortable image order
- Automatic cleanup on listing deletion
- Secure access through RLS

## Security Implementation

### Row Level Security
- Sellers can manage their own listings
- Public can view active listings only
- Admins have full access for moderation
- Images follow listing access permissions

### Data Validation
- Positive quantity constraints
- Non-negative pricing constraints
- Required fields enforcement
- Enum type validation

## Performance Optimization

### Indexing Strategy
- Seller ID for user dashboards
- Status for public browsing
- Material type for filtering
- Location for geographic searches
- Creation date for sorting
- Image sorting for galleries

### Query Patterns
- Efficient listing browsing
- Fast seller dashboard loading
- Optimized image gallery display
- Location-based filtering

## Success Metrics
- **Data Integrity**: Proper constraints and validation
- **Performance**: Fast queries with proper indexing
- **Security**: Secure access control with RLS
- **Scalability**: Efficient schema for growth

## Future Enhancements
- Full-text search on title/description
- Additional material categories
- Image compression and optimization
- Geolocation coordinates
- Listing analytics and views tracking
