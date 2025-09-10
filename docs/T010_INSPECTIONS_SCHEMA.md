# T010 - Inspections Schema

## Overview
Implemented inspection scheduling system with time slots and booking management to allow buyers to physically inspect materials before purchase, supporting both fixed-price and auction listings.

## Implementation Details

### 1. Inspections Table
- **Time Slot Management**: Scheduled inspection periods with capacity limits
- **Listing Integration**: Direct connection to material listings
- **Capacity Control**: Multiple buyers can book same slot if capacity allows

### 2. Inspection Bookings Table
- **Booking Tracking**: Individual buyer reservations for inspection slots
- **Status Management**: Booked, attended, no-show, cancelled states
- **User Association**: Links bookings to buyer profiles

## Technical Implementation

### Database Schema (005_inspections.sql)
```sql
-- Create enum types
CREATE TYPE booking_status AS ENUM ('booked', 'attended', 'no_show', 'cancelled');

-- Create inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  slot_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inspection bookings table
CREATE TABLE inspection_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'booked',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(inspection_id, user_id)
);

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspections
CREATE POLICY "Public can read inspections" ON inspections
  FOR SELECT USING (true);

CREATE POLICY "Sellers can manage own listing inspections" ON inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id AND seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to inspections" ON inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for inspection_bookings
CREATE POLICY "Users can read own bookings" ON inspection_bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own bookings" ON inspection_bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON inspection_bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Sellers can read bookings for their listings" ON inspection_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = inspection_id AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to bookings" ON inspection_bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_inspections_listing_id ON inspections(listing_id);
CREATE INDEX idx_inspections_slot_at ON inspections(slot_at);
CREATE INDEX idx_inspection_bookings_inspection_id ON inspection_bookings(inspection_id);
CREATE INDEX idx_inspection_bookings_user_id ON inspection_bookings(user_id);
CREATE INDEX idx_inspection_bookings_status ON inspection_bookings(status);
CREATE INDEX idx_inspection_bookings_booked_at ON inspection_bookings(booked_at);

-- Function to check available capacity
CREATE OR REPLACE FUNCTION get_available_capacity(inspection_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_capacity INTEGER;
  booked_count INTEGER;
BEGIN
  SELECT capacity INTO total_capacity
  FROM inspections
  WHERE id = inspection_uuid;
  
  SELECT COUNT(*) INTO booked_count
  FROM inspection_bookings
  WHERE inspection_id = inspection_uuid 
    AND status IN ('booked', 'attended');
  
  RETURN COALESCE(total_capacity, 0) - COALESCE(booked_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Created
- `supabase/migrations/005_inspections.sql` - Database migration

## Inspection System Features

### Time Slot Management
- **Flexible Scheduling**: Sellers can create multiple time slots
- **Capacity Control**: Multiple buyers per slot if desired
- **Future Scheduling**: Prevents booking past inspection times

### Booking Management
- **User Reservations**: Authenticated users can book slots
- **Status Tracking**: Complete booking lifecycle
- **Duplicate Prevention**: One booking per user per slot

## Security Implementation

### Row Level Security
- **Public Visibility**: Anyone can view available inspection slots
- **Seller Control**: Sellers manage their listing inspections
- **Buyer Privacy**: Users can only see their own bookings
- **Cross-Reference Security**: Sellers can see bookings for their listings

### Data Integrity
- **Capacity Constraints**: Positive capacity requirements
- **Unique Bookings**: Prevent duplicate user bookings
- **Cascade Deletes**: Clean data removal with listings

## Performance Optimization

### Indexing Strategy
- **Listing Lookups**: Fast inspection slot retrieval
- **Time Queries**: Efficient upcoming inspection filtering
- **User Queries**: Quick booking history access
- **Status Filtering**: Efficient booking status queries

### Database Functions
- **get_available_capacity()**: Real-time capacity checking
- **Security Definer**: Controlled function execution

## Business Logic Support

### Capacity Management
- Real-time availability checking
- Overbooking prevention
- Flexible capacity per slot

### Status Workflow
- **Booked**: Initial reservation state
- **Attended**: Confirmed attendance
- **No Show**: Missed appointment tracking
- **Cancelled**: User or system cancellation

## Integration Points

### Listing Integration
- Direct connection to material listings
- Seller permission inheritance
- Automatic cleanup on listing deletion

### User Management
- Buyer booking history
- Seller inspection oversight
- Admin platform monitoring

## Success Metrics
- **Booking Success Rate**: High successful booking percentage
- **Attendance Rate**: Good show-up rate for booked inspections
- **Capacity Utilization**: Efficient use of available slots
- **User Satisfaction**: Smooth booking experience

## Future Enhancements
- Automated reminder notifications
- Calendar integration
- Inspection feedback and ratings
- Bulk slot creation tools
- Mobile-friendly booking interface
