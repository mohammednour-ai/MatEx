-- Migration: 005_inspections.sql
-- Description: Create inspections and inspection_bookings tables
-- Task: T010 - Inspections schema

-- Create booking_status enum
CREATE TYPE booking_status AS ENUM ('booked', 'attended', 'no_show', 'cancelled');

-- Create inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  slot_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location_address TEXT, -- Optional specific address for inspection
  location_notes TEXT, -- Additional location details or instructions
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT inspections_positive_capacity CHECK (capacity > 0),
  CONSTRAINT inspections_positive_duration CHECK (duration_minutes > 0),
  CONSTRAINT inspections_future_slot CHECK (slot_at > NOW()),
  
  -- Unique constraint to prevent duplicate slots for same listing
  UNIQUE(listing_id, slot_at)
);

-- Create inspection_bookings table
CREATE TABLE inspection_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'booked',
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  attended_at TIMESTAMPTZ, -- When marked as attended
  cancelled_at TIMESTAMPTZ, -- When cancelled
  cancellation_reason TEXT, -- Optional reason for cancellation
  notes TEXT, -- Additional notes from buyer or seller
  reminder_sent_at TIMESTAMPTZ, -- When reminder notification was sent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bookings_attended_when_status CHECK (
    (status = 'attended' AND attended_at IS NOT NULL) OR 
    (status != 'attended' AND attended_at IS NULL)
  ),
  CONSTRAINT bookings_cancelled_when_status CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL) OR 
    (status != 'cancelled' AND cancelled_at IS NULL)
  ),
  
  -- Unique constraint to prevent duplicate bookings
  UNIQUE(inspection_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_inspections_listing_id ON inspections(listing_id);
CREATE INDEX idx_inspections_slot_at ON inspections(slot_at);
CREATE INDEX idx_inspections_active_slots ON inspections(listing_id, slot_at) WHERE is_active = true;
CREATE INDEX idx_inspections_upcoming ON inspections(slot_at) WHERE slot_at > NOW() AND is_active = true;

CREATE INDEX idx_bookings_inspection_id ON inspection_bookings(inspection_id);
CREATE INDEX idx_bookings_user_id ON inspection_bookings(user_id);
CREATE INDEX idx_bookings_status ON inspection_bookings(status);
CREATE INDEX idx_bookings_user_status ON inspection_bookings(user_id, status);
CREATE INDEX idx_bookings_upcoming_reminders ON inspection_bookings(inspection_id, reminder_sent_at) WHERE status = 'booked' AND reminder_sent_at IS NULL;

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspections table

-- Public can read active inspections for active listings
CREATE POLICY "inspections_select_public" ON inspections
  FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND status = 'active'
    )
  );

-- Sellers can manage inspections for their own listings
CREATE POLICY "inspections_insert_seller" ON inspections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "inspections_update_seller" ON inspections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  );

CREATE POLICY "inspections_delete_seller" ON inspections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE id = listing_id 
      AND seller_id = auth.uid()
    )
  );

-- Admins can manage all inspections
CREATE POLICY "inspections_admin_all" ON inspections
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

-- RLS Policies for inspection_bookings table

-- Users can read their own bookings
CREATE POLICY "bookings_select_own" ON inspection_bookings
  FOR SELECT
  USING (user_id = auth.uid());

-- Sellers can read bookings for their listings
CREATE POLICY "bookings_select_seller" ON inspection_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = inspection_id
      AND l.seller_id = auth.uid()
    )
  );

-- Authenticated users can create bookings
CREATE POLICY "bookings_insert_authenticated" ON inspection_bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can update their own bookings (limited fields)
CREATE POLICY "bookings_update_own" ON inspection_bookings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sellers can update bookings for their listings (limited fields)
CREATE POLICY "bookings_update_seller" ON inspection_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = inspection_id
      AND l.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = inspection_id
      AND l.seller_id = auth.uid()
    )
  );

-- Admins can manage all bookings
CREATE POLICY "bookings_admin_all" ON inspection_bookings
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

-- Function to get available capacity for an inspection slot
CREATE OR REPLACE FUNCTION get_available_capacity(inspection_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_capacity INTEGER;
  booked_count INTEGER;
BEGIN
  -- Get total capacity
  SELECT capacity INTO total_capacity
  FROM inspections
  WHERE id = inspection_uuid AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Count active bookings (not cancelled)
  SELECT COUNT(*) INTO booked_count
  FROM inspection_bookings
  WHERE inspection_id = inspection_uuid
  AND status IN ('booked', 'attended', 'no_show');
  
  RETURN total_capacity - booked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can book inspection
CREATE OR REPLACE FUNCTION can_book_inspection(
  inspection_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  inspection_record RECORD;
  existing_booking_count INTEGER;
  available_capacity INTEGER;
BEGIN
  -- Get inspection details
  SELECT i.id, i.slot_at, i.is_active, l.seller_id
  INTO inspection_record
  FROM inspections i
  JOIN listings l ON i.listing_id = l.id
  WHERE i.id = inspection_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if inspection is active and in the future
  IF NOT inspection_record.is_active OR inspection_record.slot_at <= NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is not the seller
  IF inspection_record.seller_id = user_uuid THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user already has a booking
  SELECT COUNT(*) INTO existing_booking_count
  FROM inspection_bookings
  WHERE inspection_id = inspection_uuid
  AND user_id = user_uuid
  AND status != 'cancelled';
  
  IF existing_booking_count > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Check available capacity
  available_capacity := get_available_capacity(inspection_uuid);
  
  RETURN available_capacity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to book inspection
CREATE OR REPLACE FUNCTION book_inspection(
  inspection_uuid UUID,
  user_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  booking_id UUID;
BEGIN
  -- Check if booking is allowed
  IF NOT can_book_inspection(inspection_uuid, user_uuid) THEN
    RAISE EXCEPTION 'Cannot book this inspection slot';
  END IF;
  
  -- Create booking
  INSERT INTO inspection_bookings (
    inspection_id,
    user_id,
    status
  ) VALUES (
    inspection_uuid,
    user_uuid,
    'booked'
  ) RETURNING id INTO booking_id;
  
  RETURN booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel booking
CREATE OR REPLACE FUNCTION cancel_booking(
  booking_uuid UUID,
  user_uuid UUID,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Get booking details
  SELECT id, user_id, status, inspection_id
  INTO booking_record
  FROM inspection_bookings
  WHERE id = booking_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if user owns the booking or is the seller
  IF booking_record.user_id != user_uuid THEN
    -- Check if user is the seller of the listing
    IF NOT EXISTS (
      SELECT 1 FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      WHERE i.id = booking_record.inspection_id
      AND l.seller_id = user_uuid
    ) THEN
      RAISE EXCEPTION 'Not authorized to cancel this booking';
    END IF;
  END IF;
  
  -- Check if booking can be cancelled
  IF booking_record.status NOT IN ('booked') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled';
  END IF;
  
  -- Update booking status
  UPDATE inspection_bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = reason,
    updated_at = NOW()
  WHERE id = booking_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark booking as attended
CREATE OR REPLACE FUNCTION mark_attended(
  booking_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  booking_record RECORD;
BEGIN
  -- Get booking details and check if user is the seller
  SELECT b.id, b.status, l.seller_id
  INTO booking_record
  FROM inspection_bookings b
  JOIN inspections i ON b.inspection_id = i.id
  JOIN listings l ON i.listing_id = l.id
  WHERE b.id = booking_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if user is the seller
  IF booking_record.seller_id != user_uuid THEN
    RAISE EXCEPTION 'Only seller can mark attendance';
  END IF;
  
  -- Check if booking is in booked status
  IF booking_record.status != 'booked' THEN
    RAISE EXCEPTION 'Booking is not in booked status';
  END IF;
  
  -- Update booking status
  UPDATE inspection_bookings
  SET 
    status = 'attended',
    attended_at = NOW(),
    updated_at = NOW()
  WHERE id = booking_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers
CREATE OR REPLACE FUNCTION update_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_inspections_updated_at();

CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON inspection_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- Comments for documentation
COMMENT ON TABLE inspections IS 'Inspection time slots created by sellers for their listings';
COMMENT ON TABLE inspection_bookings IS 'Bookings made by buyers for inspection slots';

COMMENT ON COLUMN inspections.listing_id IS 'Foreign key to the listing being inspected';
COMMENT ON COLUMN inspections.slot_at IS 'Date and time of the inspection slot';
COMMENT ON COLUMN inspections.capacity IS 'Maximum number of buyers that can book this slot';
COMMENT ON COLUMN inspections.duration_minutes IS 'Duration of the inspection in minutes';
COMMENT ON COLUMN inspections.location_address IS 'Specific address for the inspection if different from listing';
COMMENT ON COLUMN inspections.location_notes IS 'Additional location details or instructions';

COMMENT ON COLUMN inspection_bookings.inspection_id IS 'Foreign key to the inspection slot';
COMMENT ON COLUMN inspection_bookings.user_id IS 'Foreign key to the buyer who made the booking';
COMMENT ON COLUMN inspection_bookings.status IS 'Status of the booking: booked, attended, no_show, cancelled';
COMMENT ON COLUMN inspection_bookings.booked_at IS 'When the booking was made';
COMMENT ON COLUMN inspection_bookings.attended_at IS 'When marked as attended by seller';
COMMENT ON COLUMN inspection_bookings.cancelled_at IS 'When the booking was cancelled';
COMMENT ON COLUMN inspection_bookings.reminder_sent_at IS 'When reminder notification was sent';

COMMENT ON FUNCTION get_available_capacity(UUID) IS 'Returns available capacity for an inspection slot';
COMMENT ON FUNCTION can_book_inspection(UUID, UUID) IS 'Checks if a user can book a specific inspection slot';
COMMENT ON FUNCTION book_inspection(UUID, UUID) IS 'Books an inspection slot for a user';
COMMENT ON FUNCTION cancel_booking(UUID, UUID, TEXT) IS 'Cancels a booking with optional reason';
COMMENT ON FUNCTION mark_attended(UUID, UUID) IS 'Marks a booking as attended (seller only)';
