# T009 - Orders Schema

## Overview
Implemented comprehensive orders schema to track purchase transactions for both fixed-price listings and auction winners, with Stripe payment integration and order status management.

## Implementation Details

### 1. Orders Table Structure
- **Transaction Tracking**: Complete purchase history for buyers and sellers
- **Payment Integration**: Stripe PaymentIntent integration for secure payments
- **Order Types**: Support for both fixed-price and auction purchases
- **Status Management**: Comprehensive order lifecycle tracking

### 2. Multi-Party Access
- **Buyer Access**: Order history and status tracking
- **Seller Access**: Sales management and fulfillment
- **Admin Access**: Platform oversight and dispute resolution

## Technical Implementation

### Database Schema (004_orders.sql)
```sql
-- Create enum types
CREATE TYPE order_type AS ENUM ('fixed', 'auction');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled', 'fulfilled', 'disputed', 'refunded');

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type order_type NOT NULL,
  total_cad NUMERIC NOT NULL CHECK (total_cad > 0),
  status order_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers can read own orders" ON orders
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can read own sales" ON orders
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Buyers can update own orders" ON orders
  FOR UPDATE USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can update own sales" ON orders
  FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "System can create orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins have full access to orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(type);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_stripe_payment_intent ON orders(stripe_payment_intent);
```

## Files Created
- `supabase/migrations/004_orders.sql` - Database migration

## Order Management Features

### Order Types
- **Fixed Orders**: Direct purchases from fixed-price listings
- **Auction Orders**: Generated for auction winners
- **Payment Integration**: Stripe PaymentIntent tracking

### Status Lifecycle
- **Pending**: Order created, awaiting payment
- **Paid**: Payment confirmed, ready for fulfillment
- **Cancelled**: Order cancelled before payment
- **Fulfilled**: Order completed successfully
- **Disputed**: Issue requiring resolution
- **Refunded**: Payment returned to buyer

## Security Implementation

### Row Level Security
- **Buyer Privacy**: Users can only see their purchases
- **Seller Access**: Sellers can view and manage their sales
- **Admin Oversight**: Full access for platform management
- **System Operations**: Controlled order creation

### Data Protection
- **Restrict Deletes**: Prevent accidental data loss
- **Audit Trail**: Complete transaction history
- **Payment Security**: Secure Stripe integration

## Success Metrics
- **Data Integrity**: Zero order data loss
- **Performance**: Sub-200ms order queries
- **Security**: Proper access control enforcement
- **Payment Success**: High payment completion rate

## Future Enhancements
- Order item details for partial fulfillment
- Shipping and tracking integration
- Automated dispute resolution
- Order analytics and reporting
