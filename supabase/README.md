# Supabase Migrations

This directory contains SQL migration files for the MatEx database schema.

## Migration Files

- `001_profiles_rbac.sql` - Creates profiles table with role-based access control
- `002_listings_images.sql` - Creates listings and listing_images tables with RLS policies
- `003_auctions_bids.sql` - Creates auctions and bids tables with RLS policies
- `004_orders.sql` - Creates orders table for payment and order tracking with RLS policies
- `005_inspections.sql` - Creates inspections and inspection_bookings tables with RLS policies
- `006_app_settings_kyc.sql` - Creates app_settings and kyc_fields tables with RLS policies

## Running Migrations

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project (if not already done)
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 2: Manual Execution
1. Copy the SQL content from migration files
2. Execute in Supabase SQL Editor or your preferred PostgreSQL client
3. Run migrations in order (001, 002, 003, etc.)

## Migration Structure

Each migration file follows this naming convention:
- `XXX_description.sql` where XXX is a 3-digit number

## Database Schema Overview

### Profiles Table
- **Purpose**: Store user profile information with role-based access
- **Roles**: buyer, seller, both, admin
- **KYC Status**: not_started, pending, approved, rejected
- **RLS Policies**: Users can read/update own profile, admins can access all

### Listings Table
- **Purpose**: Store marketplace product listings
- **Pricing Types**: fixed, auction
- **Conditions**: new, like_new, good, fair, poor, scrap
- **Status**: draft, active, sold, expired, cancelled, suspended
- **RLS Policies**: Public can read active listings, sellers manage own listings, admins manage all

### Listing Images Table
- **Purpose**: Store images associated with listings
- **Features**: Primary image designation, sort ordering, file metadata
- **Storage**: Integrates with Supabase Storage for file uploads
- **RLS Policies**: Public can view images of active listings, sellers manage own images

### Auctions Table
- **Purpose**: Store auction configurations for listings with auction pricing type
- **Features**: Start/end times, minimum bid increment, soft close functionality
- **Constraints**: Valid timeframes, positive increments, no self-bidding
- **RLS Policies**: Public can read auctions, sellers manage own auctions, admins manage all

### Bids Table
- **Purpose**: Store bids placed on auctions by users
- **Features**: Bid amount tracking, bidder identification, timestamp ordering
- **Helper Functions**: get_highest_bid(), is_auction_active(), extend_auction_end_time()
- **RLS Policies**: Public can read bids, authenticated users can place bids, sellers can view bids on their auctions

### Orders Table
- **Purpose**: Store orders created from fixed price purchases or auction wins
- **Order Types**: fixed, auction
- **Order Status**: pending, paid, cancelled, fulfilled
- **Features**: Stripe integration, platform fee calculation, seller payout tracking
- **Helper Functions**: calculate_platform_fee(), create_fixed_order(), create_auction_order(), update_order_status()
- **RLS Policies**: Buyers can read own orders, sellers can read orders for their listings, admins manage all

### Inspections Table
- **Purpose**: Store inspection time slots created by sellers for their listings
- **Features**: Capacity management, duration tracking, location details, active/inactive status
- **Constraints**: Future slots only, positive capacity and duration, unique slots per listing
- **Helper Functions**: get_available_capacity(), can_book_inspection(), book_inspection()
- **RLS Policies**: Public can read active inspections, sellers manage own inspections, admins manage all

### Inspection Bookings Table
- **Purpose**: Store bookings made by buyers for inspection slots
- **Booking Status**: booked, attended, no_show, cancelled
- **Features**: Attendance tracking, cancellation reasons, reminder notifications
- **Helper Functions**: cancel_booking(), mark_attended()
- **RLS Policies**: Users can read own bookings, sellers can read bookings for their listings, admins manage all

### App Settings Table
- **Purpose**: Store application-wide configuration settings as key-value pairs
- **Categories**: auction, fees, notifications, inspections, legal, system
- **Features**: Public/private settings, change tracking, JSONB values for flexibility
- **Helper Functions**: get_setting(), get_setting_text(), get_setting_number(), get_setting_boolean(), upsert_setting()
- **RLS Policies**: Public can read public settings, authenticated users can read all settings, only admins can modify

### KYC Fields Table
- **Purpose**: Store dynamic KYC form field definitions for different user roles
- **Field Types**: text, number, date, file, select, email, phone, textarea, checkbox
- **Features**: Role-specific fields, validation rules, sort ordering, active/inactive status
- **Helper Functions**: get_kyc_fields_for_role()
- **RLS Policies**: Public can read active KYC fields, only admins can modify field definitions

### Security Features
- Row Level Security (RLS) enabled on all tables
- Automatic profile creation on user signup
- Role-based access control with admin overrides
- Proper indexing for performance and search
- Helper functions for view counting and image management

## Environment Variables Required

Make sure these are set in your Supabase project:
- Database URL
- Service role key
- Anonymous key

See `.env.example` for complete list.
