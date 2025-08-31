-- Migration: 006_app_settings_kyc.sql
-- Description: Create app_settings and kyc_fields tables
-- Task: T011 - App settings schema

-- Create field_type enum for KYC fields
CREATE TYPE field_type AS ENUM ('text', 'number', 'date', 'file', 'select', 'email', 'phone', 'textarea', 'checkbox');

-- Create app_settings table
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT, -- Human-readable description of the setting
  category TEXT, -- Group settings by category (auction, fees, notifications, etc.)
  is_public BOOLEAN NOT NULL DEFAULT false, -- Whether this setting can be read by public
  updated_by UUID REFERENCES profiles(id), -- Who last updated this setting
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT app_settings_valid_key CHECK (key ~ '^[a-z0-9_\.]+$'), -- Only lowercase, numbers, underscore, dot
  CONSTRAINT app_settings_non_empty_key CHECK (length(key) > 0)
);

-- Create kyc_fields table for dynamic KYC form configuration
CREATE TABLE kyc_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL, -- Which user role this field applies to
  name TEXT NOT NULL, -- Field name/identifier (used in forms)
  label TEXT NOT NULL, -- Display label for the field
  type field_type NOT NULL, -- Field input type
  required BOOLEAN NOT NULL DEFAULT false, -- Whether field is required
  options JSONB, -- Options for select fields, validation rules, etc.
  placeholder TEXT, -- Placeholder text for input fields
  help_text TEXT, -- Help text to display with the field
  sort_order INTEGER NOT NULL DEFAULT 0, -- Order to display fields
  is_active BOOLEAN NOT NULL DEFAULT true, -- Whether field is currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT kyc_fields_valid_name CHECK (name ~ '^[a-z0-9_]+$'), -- Only lowercase, numbers, underscore
  CONSTRAINT kyc_fields_non_empty_name CHECK (length(name) > 0),
  CONSTRAINT kyc_fields_non_empty_label CHECK (length(label) > 0),
  CONSTRAINT kyc_fields_select_has_options CHECK (
    type != 'select' OR (options IS NOT NULL AND jsonb_typeof(options->'items') = 'array')
  ),
  
  -- Unique constraint to prevent duplicate field names per role
  UNIQUE(role, name)
);

-- Indexes for performance
CREATE INDEX idx_app_settings_category ON app_settings(category);
CREATE INDEX idx_app_settings_public ON app_settings(is_public) WHERE is_public = true;
CREATE INDEX idx_app_settings_updated_at ON app_settings(updated_at DESC);

CREATE INDEX idx_kyc_fields_role ON kyc_fields(role);
CREATE INDEX idx_kyc_fields_active ON kyc_fields(role, is_active, sort_order) WHERE is_active = true;
CREATE INDEX idx_kyc_fields_sort_order ON kyc_fields(role, sort_order);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_settings table

-- Public can read public settings
CREATE POLICY "settings_select_public" ON app_settings
  FOR SELECT
  USING (is_public = true);

-- Authenticated users can read all settings (for app functionality)
CREATE POLICY "settings_select_authenticated" ON app_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify settings
CREATE POLICY "settings_modify_admin" ON app_settings
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

-- RLS Policies for kyc_fields table

-- Public can read active KYC fields (for registration forms)
CREATE POLICY "kyc_fields_select_public" ON kyc_fields
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify KYC fields
CREATE POLICY "kyc_fields_modify_admin" ON kyc_fields
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

-- Function to get setting value with type casting
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT, default_value JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  setting_value JSONB;
BEGIN
  SELECT value INTO setting_value
  FROM app_settings
  WHERE key = setting_key;
  
  IF NOT FOUND THEN
    RETURN default_value;
  END IF;
  
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get setting as text
CREATE OR REPLACE FUNCTION get_setting_text(setting_key TEXT, default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  setting_value JSONB;
BEGIN
  setting_value := get_setting(setting_key);
  
  IF setting_value IS NULL THEN
    RETURN default_value;
  END IF;
  
  RETURN setting_value #>> '{}'; -- Extract as text
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get setting as number
CREATE OR REPLACE FUNCTION get_setting_number(setting_key TEXT, default_value NUMERIC DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  setting_value JSONB;
BEGIN
  setting_value := get_setting(setting_key);
  
  IF setting_value IS NULL THEN
    RETURN default_value;
  END IF;
  
  RETURN (setting_value #>> '{}')::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get setting as boolean
CREATE OR REPLACE FUNCTION get_setting_boolean(setting_key TEXT, default_value BOOLEAN DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  setting_value JSONB;
BEGIN
  setting_value := get_setting(setting_key);
  
  IF setting_value IS NULL THEN
    RETURN default_value;
  END IF;
  
  RETURN (setting_value #>> '{}')::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert setting
CREATE OR REPLACE FUNCTION upsert_setting(
  setting_key TEXT,
  setting_value JSONB,
  setting_description TEXT DEFAULT NULL,
  setting_category TEXT DEFAULT NULL,
  setting_is_public BOOLEAN DEFAULT false,
  updater_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO app_settings (key, value, description, category, is_public, updated_by, updated_at)
  VALUES (setting_key, setting_value, setting_description, setting_category, setting_is_public, updater_id, NOW())
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, app_settings.description),
    category = COALESCE(EXCLUDED.category, app_settings.category),
    is_public = EXCLUDED.is_public,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get KYC fields for a role
CREATE OR REPLACE FUNCTION get_kyc_fields_for_role(user_role_param user_role)
RETURNS TABLE (
  id UUID,
  name TEXT,
  label TEXT,
  type field_type,
  required BOOLEAN,
  options JSONB,
  placeholder TEXT,
  help_text TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kf.id,
    kf.name,
    kf.label,
    kf.type,
    kf.required,
    kf.options,
    kf.placeholder,
    kf.help_text,
    kf.sort_order
  FROM kyc_fields kf
  WHERE kf.role = user_role_param
  AND kf.is_active = true
  ORDER BY kf.sort_order ASC, kf.label ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

CREATE OR REPLACE FUNCTION update_kyc_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kyc_fields_updated_at
  BEFORE UPDATE ON kyc_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_fields_updated_at();

-- Insert default app settings
INSERT INTO app_settings (key, value, description, category, is_public) VALUES
-- Auction settings
('auction.soft_close_seconds', '120', 'Seconds to extend auction if bid placed near end', 'auction', true),
('auction.min_increment_strategy', '"fixed"', 'Strategy for minimum bid increment: fixed or percent', 'auction', true),
('auction.min_increment_value', '5.00', 'Fixed increment amount in CAD or percentage (0.05 = 5%)', 'auction', true),
('auction.deposit_required', 'true', 'Whether deposits are required for bidding', 'auction', true),
('auction.deposit_percent', '0.10', 'Percentage of bid amount required as deposit (0.10 = 10%)', 'auction', true),
('auction.max_duration_days', '30', 'Maximum duration for auctions in days', 'auction', true),

-- Fee settings
('fees.transaction_percent', '0.04', 'Platform transaction fee percentage (0.04 = 4%)', 'fees', false),
('fees.minimum_fee_cad', '5.00', 'Minimum platform fee in CAD', 'fees', false),
('fees.maximum_fee_cad', '500.00', 'Maximum platform fee in CAD', 'fees', false),

-- Notification settings
('notifications.channels', '["inapp", "email"]', 'Available notification channels', 'notifications', true),
('notifications.reminder_hours_before', '24', 'Hours before inspection to send reminder', 'notifications', false),
('notifications.digest_frequency', '"daily"', 'Default digest frequency: daily, weekly, never', 'notifications', false),

-- Inspection settings
('inspections.default_duration_minutes', '60', 'Default inspection duration in minutes', 'inspections', true),
('inspections.max_capacity', '10', 'Maximum capacity per inspection slot', 'inspections', true),
('inspections.booking_deadline_hours', '24', 'Hours before inspection when booking closes', 'inspections', true),

-- Legal settings
('legal.terms_version', '"1.0"', 'Current terms and conditions version', 'legal', true),
('legal.privacy_version', '"1.0"', 'Current privacy policy version', 'legal', true),
('legal.require_terms_acceptance', 'true', 'Whether users must accept terms before actions', 'legal', true),

-- System settings
('system.maintenance_mode', 'false', 'Whether the system is in maintenance mode', 'system', true),
('system.registration_enabled', 'true', 'Whether new user registration is enabled', 'system', true),
('system.max_images_per_listing', '10', 'Maximum number of images per listing', 'system', true);

-- Insert default KYC fields for buyers
INSERT INTO kyc_fields (role, name, label, type, required, placeholder, help_text, sort_order) VALUES
('buyer', 'full_name', 'Full Name', 'text', true, 'Enter your full legal name', 'Your full name as it appears on government ID', 10),
('buyer', 'phone', 'Phone Number', 'phone', true, '+1 (555) 123-4567', 'Primary phone number for account verification', 20),
('buyer', 'date_of_birth', 'Date of Birth', 'date', true, null, 'Required for age verification (18+ only)', 30),
('buyer', 'government_id', 'Government ID', 'file', true, null, 'Upload a clear photo of your driver''s license or passport', 40),
('buyer', 'address', 'Address', 'textarea', true, 'Street address, city, province, postal code', 'Your primary residential or business address', 50);

-- Insert default KYC fields for sellers
INSERT INTO kyc_fields (role, name, label, type, required, placeholder, help_text, sort_order) VALUES
('seller', 'full_name', 'Full Name', 'text', true, 'Enter your full legal name', 'Your full name as it appears on government ID', 10),
('seller', 'phone', 'Phone Number', 'phone', true, '+1 (555) 123-4567', 'Primary phone number for account verification', 20),
('seller', 'date_of_birth', 'Date of Birth', 'date', true, null, 'Required for age verification (18+ only)', 30),
('seller', 'government_id', 'Government ID', 'file', true, null, 'Upload a clear photo of your driver''s license or passport', 40),
('seller', 'business_type', 'Business Type', 'select', true, null, 'Type of business or individual seller', 50),
('seller', 'company_name', 'Company Name', 'text', false, 'ABC Recycling Ltd.', 'Legal business name (if applicable)', 60),
('seller', 'business_license', 'Business License', 'file', false, null, 'Upload business license or registration (if applicable)', 70),
('seller', 'tax_number', 'Tax Number', 'text', false, '123456789RT0001', 'Business number or GST/HST number (if applicable)', 80),
('seller', 'address', 'Business Address', 'textarea', true, 'Street address, city, province, postal code', 'Primary business or residential address', 90),
('seller', 'bank_account', 'Bank Account Info', 'text', true, 'Institution: 001, Transit: 12345, Account: 1234567', 'For payment processing (encrypted)', 100);

-- Update business_type field with options
UPDATE kyc_fields 
SET options = '{"items": [
  {"value": "individual", "label": "Individual Seller"},
  {"value": "sole_proprietorship", "label": "Sole Proprietorship"},
  {"value": "partnership", "label": "Partnership"},
  {"value": "corporation", "label": "Corporation"},
  {"value": "cooperative", "label": "Cooperative"},
  {"value": "non_profit", "label": "Non-Profit Organization"}
]}'
WHERE role = 'seller' AND name = 'business_type';

-- Comments for documentation
COMMENT ON TABLE app_settings IS 'Application-wide configuration settings stored as key-value pairs';
COMMENT ON TABLE kyc_fields IS 'Dynamic KYC form field definitions for different user roles';

COMMENT ON COLUMN app_settings.key IS 'Unique setting identifier using dot notation (e.g., auction.soft_close_seconds)';
COMMENT ON COLUMN app_settings.value IS 'Setting value stored as JSONB for flexibility';
COMMENT ON COLUMN app_settings.description IS 'Human-readable description of what this setting controls';
COMMENT ON COLUMN app_settings.category IS 'Category grouping for settings (auction, fees, notifications, etc.)';
COMMENT ON COLUMN app_settings.is_public IS 'Whether this setting can be read by unauthenticated users';

COMMENT ON COLUMN kyc_fields.role IS 'User role this field applies to (buyer, seller, both, admin)';
COMMENT ON COLUMN kyc_fields.name IS 'Field identifier used in forms and validation';
COMMENT ON COLUMN kyc_fields.label IS 'Display label shown to users';
COMMENT ON COLUMN kyc_fields.type IS 'Input field type (text, number, date, file, select, etc.)';
COMMENT ON COLUMN kyc_fields.options IS 'Additional field configuration (select options, validation rules, etc.)';
COMMENT ON COLUMN kyc_fields.sort_order IS 'Display order in forms (lower numbers appear first)';

COMMENT ON FUNCTION get_setting(TEXT, JSONB) IS 'Retrieves a setting value with optional default';
COMMENT ON FUNCTION get_setting_text(TEXT, TEXT) IS 'Retrieves a setting value as text';
COMMENT ON FUNCTION get_setting_number(TEXT, NUMERIC) IS 'Retrieves a setting value as number';
COMMENT ON FUNCTION get_setting_boolean(TEXT, BOOLEAN) IS 'Retrieves a setting value as boolean';
COMMENT ON FUNCTION upsert_setting(TEXT, JSONB, TEXT, TEXT, BOOLEAN, UUID) IS 'Creates or updates a setting';
COMMENT ON FUNCTION get_kyc_fields_for_role(user_role) IS 'Returns active KYC fields for a specific user role';
