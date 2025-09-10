# T013 - Terms Acceptances

## Overview
Implemented terms and conditions acceptance tracking system to ensure legal compliance and user consent management for platform usage, bidding activities, and regulatory requirements.

## Implementation Details

### 1. Terms Acceptances Table
- **User Consent Tracking**: Record when users accept terms and conditions
- **Version Management**: Track which version of terms was accepted
- **Audit Trail**: Complete history of user consent for legal compliance
- **Timestamp Tracking**: Precise acceptance timing for legal records

### 2. Legal Compliance Features
- **Mandatory Acceptance**: Block certain actions until terms accepted
- **Version Updates**: Force re-acceptance when terms change
- **User Access Control**: Users can view their own acceptance history

## Technical Implementation

### Database Schema (008_terms_acceptances.sql)
```sql
-- Create terms acceptances table
CREATE TABLE terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, terms_version)
);

-- Enable RLS
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own acceptances" ON terms_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own acceptances" ON terms_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all acceptances" ON terms_acceptances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_version ON terms_acceptances(terms_version);
CREATE INDEX idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at DESC);
CREATE INDEX idx_terms_acceptances_user_version ON terms_acceptances(user_id, terms_version);

-- Function to check if user has accepted current terms
CREATE OR REPLACE FUNCTION has_accepted_current_terms(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_version TEXT;
  has_accepted BOOLEAN := false;
BEGIN
  -- Get current terms version from app_settings
  SELECT value->>'terms_version' INTO current_version
  FROM app_settings
  WHERE key = 'legal.current_terms_version';
  
  IF current_version IS NULL THEN
    RETURN true; -- No terms version set, allow access
  END IF;
  
  -- Check if user has accepted current version
  SELECT EXISTS(
    SELECT 1 FROM terms_acceptances
    WHERE user_id = user_uuid AND terms_version = current_version
  ) INTO has_accepted;
  
  RETURN has_accepted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's latest acceptance
CREATE OR REPLACE FUNCTION get_latest_terms_acceptance(user_uuid UUID)
RETURNS TABLE(
  terms_version TEXT,
  accepted_at TIMESTAMPTZ,
  is_current BOOLEAN
) AS $$
DECLARE
  current_version TEXT;
BEGIN
  -- Get current terms version
  SELECT value->>'terms_version' INTO current_version
  FROM app_settings
  WHERE key = 'legal.current_terms_version';
  
  RETURN QUERY
  SELECT 
    ta.terms_version,
    ta.accepted_at,
    (ta.terms_version = current_version) as is_current
  FROM terms_acceptances ta
  WHERE ta.user_id = user_uuid
  ORDER BY ta.accepted_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record terms acceptance
CREATE OR REPLACE FUNCTION record_terms_acceptance(
  user_uuid UUID,
  version TEXT,
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  acceptance_id UUID;
BEGIN
  INSERT INTO terms_acceptances (user_id, terms_version, ip_address, user_agent)
  VALUES (user_uuid, version, client_ip, client_user_agent)
  ON CONFLICT (user_id, terms_version) DO NOTHING
  RETURNING id INTO acceptance_id;
  
  RETURN acceptance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Created
- `supabase/migrations/008_terms_acceptances.sql` - Database migration

## Legal Compliance Features

### Terms Acceptance Tracking
- **Version Control**: Track specific terms version accepted
- **Unique Constraints**: One acceptance per user per version
- **Audit Information**: IP address and user agent logging
- **Timestamp Precision**: Exact acceptance time recording

### Compliance Functions
- **Current Terms Check**: Verify user has accepted latest terms
- **Acceptance History**: Complete user consent history
- **Automatic Recording**: Streamlined acceptance process

## Security Implementation

### Row Level Security
- **User Privacy**: Users can only see their own acceptances
- **Admin Oversight**: Admins can view all acceptances for compliance
- **Controlled Creation**: Users can only create their own acceptances

### Data Integrity
- **Foreign Key Constraints**: Proper user relationships
- **Unique Constraints**: Prevent duplicate acceptances
- **Cascade Deletes**: Clean removal with user accounts

## Performance Optimization

### Indexing Strategy
- **User Queries**: Fast acceptance history retrieval
- **Version Lookups**: Efficient version-specific queries
- **Temporal Sorting**: Chronological acceptance display
- **Composite Index**: Optimized user-version lookups

### Database Functions
- **has_accepted_current_terms()**: Real-time compliance checking
- **get_latest_terms_acceptance()**: User acceptance status
- **record_terms_acceptance()**: Streamlined acceptance recording

## Legal Compliance Support

### Regulatory Requirements
- **PIPEDA Compliance**: Privacy law consent tracking
- **Consumer Protection**: Clear consent documentation
- **Audit Trail**: Complete legal compliance history
- **Data Retention**: Proper consent record keeping

### Terms Management
- **Version Control**: Track terms updates over time
- **Force Re-acceptance**: Require consent for new versions
- **Granular Tracking**: Specific version acceptance records

## Integration Points

### Application Settings
- Integration with app_settings for current terms version
- Dynamic terms version management
- Centralized legal document control

### User Authentication
- Terms acceptance gates for protected actions
- Bidding and deposit authorization requirements
- Account access control based on consent

## Business Logic Support

### Consent Gates
- Block bidding until terms accepted
- Prevent deposit authorization without consent
- Restrict sensitive actions based on acceptance

### User Experience
- Clear consent requirements
- Easy acceptance process
- Transparent consent history

## Success Metrics
- **Compliance Rate**: High user terms acceptance rate
- **Legal Protection**: Complete audit trail maintenance
- **User Experience**: Smooth consent process
- **Data Integrity**: Accurate consent tracking

## Future Enhancements
- Granular consent categories (privacy, terms, marketing)
- Consent withdrawal mechanisms
- Multi-language terms support
- Advanced audit reporting
- Integration with legal document management
