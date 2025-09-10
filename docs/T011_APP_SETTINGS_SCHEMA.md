# T011 - App Settings Schema

## Overview
Implemented flexible application settings and KYC fields schema to support dynamic configuration management and customizable Know Your Customer verification processes across different user roles.

## Implementation Details

### 1. App Settings Table
- **Key-Value Storage**: Flexible JSON-based configuration system
- **Audit Trail**: Track who made changes and when
- **Dynamic Configuration**: Runtime configuration without code deployment

### 2. KYC Fields Table
- **Role-Based Fields**: Different verification requirements per user role
- **Dynamic Forms**: Configurable form fields with validation
- **Field Types**: Support for various input types and validation rules

## Technical Implementation

### Database Schema (006_app_settings_kyc.sql)
```sql
-- Create app_settings table
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create KYC fields table
CREATE TABLE kyc_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'file', 'select', 'email', 'phone')),
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, name)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_settings
CREATE POLICY "Public can read app settings" ON app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage app settings" ON app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for kyc_fields
CREATE POLICY "Public can read KYC fields" ON kyc_fields
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage KYC fields" ON kyc_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_app_settings_updated_at ON app_settings(updated_at DESC);
CREATE INDEX idx_kyc_fields_role ON kyc_fields(role);
CREATE INDEX idx_kyc_fields_sort_order ON kyc_fields(role, sort_order);
CREATE INDEX idx_kyc_fields_required ON kyc_fields(role, required);

-- Function to get settings by keys
CREATE OR REPLACE FUNCTION get_app_settings(setting_keys TEXT[])
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  setting_key TEXT;
  setting_value JSONB;
BEGIN
  FOREACH setting_key IN ARRAY setting_keys
  LOOP
    SELECT value INTO setting_value
    FROM app_settings
    WHERE key = setting_key;
    
    IF setting_value IS NOT NULL THEN
      result := result || jsonb_build_object(setting_key, setting_value);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get KYC fields for role
CREATE OR REPLACE FUNCTION get_kyc_fields_for_role(user_role user_role)
RETURNS TABLE(
  id UUID,
  name TEXT,
  label TEXT,
  type TEXT,
  required BOOLEAN,
  options JSONB,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kyc_fields.id,
    kyc_fields.name,
    kyc_fields.label,
    kyc_fields.type,
    kyc_fields.required,
    kyc_fields.options,
    kyc_fields.sort_order
  FROM kyc_fields
  WHERE role = user_role
  ORDER BY sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Created
- `supabase/migrations/006_app_settings_kyc.sql` - Database migration

## Configuration Management Features

### App Settings
- **Flexible Storage**: JSON values support complex configurations
- **Runtime Updates**: Change settings without code deployment
- **Audit Trail**: Track configuration changes
- **Bulk Retrieval**: Efficient multi-key fetching

### KYC Field Management
- **Role-Based Configuration**: Different fields per user type
- **Dynamic Forms**: Runtime form generation
- **Field Validation**: Type-specific validation rules
- **Ordering Control**: Customizable field display order

## Security Implementation

### Row Level Security
- **Public Read Access**: Settings and KYC fields publicly readable
- **Admin Control**: Only admins can modify configurations
- **Secure Functions**: Controlled database function execution

### Data Integrity
- **Unique Constraints**: Prevent duplicate role/field combinations
- **Type Validation**: Enforce valid field types
- **JSON Validation**: Structured configuration data

## Configuration Categories

### Auction Settings
- Soft close duration
- Minimum increment strategies
- Deposit requirements
- Fee structures

### KYC Field Types
- **Text**: Free-form text input
- **Number**: Numeric values with validation
- **Date**: Date picker fields
- **File**: Document upload fields
- **Select**: Dropdown options
- **Email**: Email validation
- **Phone**: Phone number formatting

## Performance Optimization

### Indexing Strategy
- **Settings Retrieval**: Fast key-based lookups
- **KYC Queries**: Efficient role-based filtering
- **Temporal Queries**: Recent changes tracking
- **Sorting**: Optimized field ordering

### Database Functions
- **get_app_settings()**: Bulk settings retrieval
- **get_kyc_fields_for_role()**: Role-specific field fetching
- **Security Definer**: Controlled execution context

## Business Logic Support

### Dynamic Configuration
- Runtime setting updates
- Feature flag management
- Business rule configuration
- Regional customization

### KYC Customization
- Role-specific requirements
- Regulatory compliance
- Document type configuration
- Validation rule management

## Success Metrics
- **Configuration Flexibility**: Easy setting updates
- **Performance**: Fast settings retrieval
- **Compliance**: Proper KYC field management
- **User Experience**: Smooth form generation

## Future Enhancements
- Setting validation schemas
- Configuration versioning
- A/B testing support
- Multi-language field labels
- Advanced field dependencies
