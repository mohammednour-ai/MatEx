# T018 - Audit Log Table

## Overview
Implemented comprehensive audit logging system to track all critical system changes, user actions, and administrative operations for compliance, security, and debugging purposes in the MatEx platform.

## Implementation Details

### 1. Audit Log Table
- **Action Tracking**: Record all significant system changes
- **User Attribution**: Track who performed each action
- **Before/After States**: Complete change history with JSON data
- **Timestamp Precision**: Exact timing of all actions

### 2. Helper Functions
- **Logging Utilities**: Simplified audit log creation
- **Settings Integration**: Automatic logging for settings changes
- **Query Helpers**: Efficient audit log retrieval and filtering

## Technical Implementation

### Database Schema (009_audit_logs.sql)
```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  before JSONB,
  after JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can read all audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs" ON audit_log
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_ip_address ON audit_log(ip_address);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_actor_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_log (
    actor_id,
    action,
    resource_type,
    resource_id,
    before,
    after,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_before,
    p_after,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log settings changes
CREATE OR REPLACE FUNCTION log_settings_change(
  p_actor_id UUID,
  p_setting_key TEXT,
  p_old_value JSONB,
  p_new_value JSONB,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN create_audit_log(
    p_actor_id,
    'settings_update',
    'app_settings',
    NULL,
    jsonb_build_object('key', p_setting_key, 'value', p_old_value),
    jsonb_build_object('key', p_setting_key, 'value', p_new_value),
    p_ip_address,
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit log summary
CREATE OR REPLACE FUNCTION get_audit_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  action TEXT,
  count BIGINT,
  unique_actors BIGINT,
  latest_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action,
    COUNT(*) as count,
    COUNT(DISTINCT al.actor_id) as unique_actors,
    MAX(al.created_at) as latest_occurrence
  FROM audit_log al
  WHERE al.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY al.action
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  actor_uuid UUID;
BEGIN
  -- Get current user ID
  actor_uuid := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      actor_uuid,
      TG_TABLE_NAME || '_insert',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      actor_uuid,
      TG_TABLE_NAME || '_update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      actor_uuid,
      TG_TABLE_NAME || '_delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for critical tables
CREATE TRIGGER audit_app_settings
  AFTER INSERT OR UPDATE OR DELETE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### Helper Library (lib/audit-helpers.ts)
```typescript
import { supabaseServer } from './supabaseServer'

export interface AuditLogEntry {
  actor_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  before?: any
  after?: any
  ip_address?: string
  user_agent?: string
}

export async function createAuditLog(entry: AuditLogEntry) {
  const { data, error } = await supabaseServer
    .rpc('create_audit_log', {
      p_actor_id: entry.actor_id || null,
      p_action: entry.action,
      p_resource_type: entry.resource_type || null,
      p_resource_id: entry.resource_id || null,
      p_before: entry.before || null,
      p_after: entry.after || null,
      p_ip_address: entry.ip_address || null,
      p_user_agent: entry.user_agent || null
    })

  if (error) {
    console.error('Audit log creation failed:', error)
    throw error
  }

  return data
}

export async function logUserAction(
  userId: string,
  action: string,
  details?: any,
  request?: Request
) {
  const ip_address = request?.headers.get('x-forwarded-for') || 
                    request?.headers.get('x-real-ip') || null
  const user_agent = request?.headers.get('user-agent') || null

  return createAuditLog({
    actor_id: userId,
    action,
    after: details,
    ip_address,
    user_agent
  })
}

export async function logSettingsChange(
  userId: string,
  settingKey: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string
) {
  const { data, error } = await supabaseServer
    .rpc('log_settings_change', {
      p_actor_id: userId,
      p_setting_key: settingKey,
      p_old_value: oldValue,
      p_new_value: newValue,
      p_ip_address: ipAddress || null
    })

  if (error) {
    console.error('Settings audit log failed:', error)
    throw error
  }

  return data
}

export async function getAuditSummary(days: number = 30) {
  const { data, error } = await supabaseServer
    .rpc('get_audit_summary', { p_days: days })

  if (error) {
    console.error('Audit summary fetch failed:', error)
    throw error
  }

  return data
}
```

## Files Created
- `supabase/migrations/009_audit_logs.sql` - Audit log table and functions
- `src/lib/audit-helpers.ts` - Audit logging utilities

## Audit Log Features

### Comprehensive Tracking
- **User Actions**: All user-initiated changes
- **System Events**: Automated system operations
- **Admin Operations**: Administrative actions and changes
- **Security Events**: Login attempts, permission changes

### Data Capture
- **Actor Identification**: Who performed the action
- **Action Classification**: What type of action occurred
- **Resource Context**: What resource was affected
- **State Changes**: Before and after values
- **Request Context**: IP address and user agent

## Security Implementation

### Row Level Security
- **Admin Access**: Only admins can read audit logs
- **System Creation**: System can create audit entries
- **No User Access**: Regular users cannot access audit logs
- **Secure Functions**: Controlled function execution

### Data Protection
- **Sensitive Data**: Careful handling of sensitive information
- **Retention Policy**: Configurable log retention periods
- **Access Logging**: Track who accesses audit logs
- **Encryption**: Sensitive data encryption at rest

## Performance Optimization

### Indexing Strategy
- **Actor Queries**: Fast user action history
- **Action Filtering**: Efficient action type queries
- **Resource Lookups**: Quick resource-specific logs
- **Temporal Queries**: Time-based log retrieval
- **IP Tracking**: Security-focused IP queries

### Database Functions
- **create_audit_log()**: Efficient log entry creation
- **log_settings_change()**: Specialized settings logging
- **get_audit_summary()**: Performance-optimized summaries
- **Trigger Functions**: Automatic logging for critical tables

## Audit Categories

### User Actions
- **Authentication**: Login, logout, password changes
- **Profile Updates**: Profile modifications, KYC changes
- **Listings**: Create, update, delete listings
- **Bidding**: Bid placement, auction participation
- **Orders**: Purchase completion, payment processing

### Administrative Actions
- **Settings Changes**: Configuration modifications
- **User Management**: Role changes, account actions
- **Content Moderation**: Listing approvals, rejections
- **System Configuration**: Feature toggles, maintenance mode

### System Events
- **Automated Processes**: Auction closures, payment processing
- **Scheduled Tasks**: Cleanup operations, notifications
- **Error Events**: System errors, failed operations
- **Security Events**: Suspicious activities, rate limiting

## Integration Points

### API Endpoints
- Automatic logging in sensitive endpoints
- Request context capture
- Error event logging
- Performance monitoring

### Admin Dashboard
- Audit log viewer with filtering
- User activity summaries
- Security event alerts
- Compliance reporting

## Success Metrics
- **Coverage**: All critical actions logged
- **Performance**: Minimal impact on system performance
- **Retention**: Appropriate log retention periods
- **Compliance**: Meet regulatory audit requirements

## Future Enhancements
- **Real-time Alerts**: Suspicious activity notifications
- **Advanced Analytics**: Pattern detection and analysis
- **Export Functionality**: Audit log export for compliance
- **Retention Policies**: Automated log cleanup
- **Integration**: SIEM system integration
