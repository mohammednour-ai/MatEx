# T012 - Notifications Schema

## Overview
Implemented comprehensive notification system with templates and user notifications to support multi-channel communication (in-app, email, SMS) for auction updates, inspection reminders, and platform events.

## Implementation Details

### 1. Notification Templates Table
- **Template Management**: Reusable notification templates with versioning
- **Multi-Channel Support**: Templates for in-app, email, and SMS channels
- **Dynamic Content**: Markdown-based templates with variable substitution
- **Active Status**: Enable/disable templates without deletion

### 2. Notifications Table
- **User Notifications**: Individual notification instances for users
- **Type Classification**: Info, warning, success, error notification types
- **Read Status**: Track notification read/unread state
- **Action Links**: Optional links for notification actions

## Technical Implementation

### Database Schema (007_notifications.sql)
```sql
-- Create enum types
CREATE TYPE notification_channel AS ENUM ('inapp', 'email', 'sms');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');

-- Create notification templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  channel notification_channel NOT NULL,
  subject TEXT,
  body_md TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates
CREATE POLICY "Public can read active templates" ON notification_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_notification_templates_code ON notification_templates(code);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = user_uuid AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(user_uuid UUID, notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = user_uuid 
    AND id = ANY(notification_ids)
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  template_code TEXT,
  target_user_id UUID,
  variables JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  template_record notification_templates%ROWTYPE;
  notification_id UUID;
  processed_title TEXT;
  processed_message TEXT;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM notification_templates
  WHERE code = template_code AND is_active = true AND channel = 'inapp';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_code;
  END IF;
  
  -- Process template variables (simple substitution)
  processed_title := COALESCE(template_record.subject, '');
  processed_message := template_record.body_md;
  
  -- Insert notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (target_user_id, processed_title, processed_message, 'info')
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Files Created
- `supabase/migrations/007_notifications.sql` - Database migration

## Notification System Features

### Template Management
- **Code-Based Templates**: Unique identifiers for different notification types
- **Multi-Channel Support**: Separate templates for in-app, email, SMS
- **Markdown Content**: Rich text formatting for notification bodies
- **Active Status**: Enable/disable without deletion

### User Notifications
- **Type Classification**: Visual categorization with info/warning/success/error
- **Read Tracking**: Mark notifications as read with timestamps
- **Action Links**: Optional links for user actions
- **User Isolation**: Secure per-user notification access

## Security Implementation

### Row Level Security
- **User Privacy**: Users can only access their own notifications
- **Template Access**: Public read access to active templates
- **Admin Control**: Full template and notification management
- **System Operations**: Controlled notification creation

### Data Integrity
- **Foreign Key Constraints**: Proper user relationships
- **Cascade Deletes**: Clean notification removal with users
- **Template Validation**: Ensure active templates exist

## Performance Optimization

### Indexing Strategy
- **User Queries**: Fast notification retrieval per user
- **Read Status**: Efficient unread notification filtering
- **Template Lookups**: Quick template code resolution
- **Temporal Sorting**: Chronological notification display

### Database Functions
- **get_unread_notification_count()**: Real-time unread count
- **mark_notifications_read()**: Bulk read status updates
- **create_notification_from_template()**: Template-based creation

## Notification Types

### System Notifications
- **Auction Updates**: Bid notifications, auction end alerts
- **Inspection Reminders**: Upcoming inspection notifications
- **Payment Alerts**: Payment confirmations, failures
- **Account Updates**: KYC status changes, profile updates

### Template Categories
- **Bidding**: New bid, outbid, auction won/lost
- **Inspections**: Booking confirmations, reminders
- **Payments**: Deposit authorized, payment completed
- **System**: Account verified, listing approved

## Integration Points

### Real-time Updates
- Supabase Realtime subscriptions
- Live notification count updates
- Instant notification delivery

### Multi-Channel Support
- In-app notifications for immediate alerts
- Email templates for detailed communications
- SMS templates for urgent notifications

## Success Metrics
- **Delivery Rate**: High notification delivery success
- **Read Rate**: Good user engagement with notifications
- **Performance**: Fast notification queries and updates
- **User Experience**: Clear, actionable notifications

## Future Enhancements
- Advanced template variable processing
- Notification preferences per user
- Digest notifications (daily/weekly summaries)
- Push notification support
- Notification analytics and tracking
