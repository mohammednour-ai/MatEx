-- Migration: 007_notifications.sql
-- Description: Create notification_templates and notifications tables
-- Task: T012 - Notifications schema

-- Create notification_channel enum
CREATE TYPE notification_channel AS ENUM ('inapp', 'email', 'sms');

-- Create notification_type enum
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');

-- Create notification_templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- Unique template identifier (e.g., 'bid_placed', 'auction_won')
  name TEXT NOT NULL, -- Human-readable template name
  channel notification_channel NOT NULL, -- Which channel this template is for
  subject TEXT, -- Email subject line (null for in-app notifications)
  body_md TEXT NOT NULL, -- Template body in Markdown with variable placeholders
  variables JSONB, -- Available variables for this template with descriptions
  is_active BOOLEAN NOT NULL DEFAULT true, -- Whether this template is currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT templates_non_empty_code CHECK (length(code) > 0),
  CONSTRAINT templates_non_empty_name CHECK (length(name) > 0),
  CONSTRAINT templates_non_empty_body CHECK (length(body_md) > 0),
  CONSTRAINT templates_email_has_subject CHECK (
    channel != 'email' OR (subject IS NOT NULL AND length(subject) > 0)
  )
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'info',
  title TEXT NOT NULL, -- Notification title/headline
  message TEXT NOT NULL, -- Notification message/body
  link TEXT, -- Optional link for the notification (e.g., to listing, order, etc.)
  metadata JSONB, -- Additional data (listing_id, order_id, etc.)
  is_read BOOLEAN NOT NULL DEFAULT false, -- Whether user has read this notification
  read_at TIMESTAMPTZ, -- When notification was marked as read
  expires_at TIMESTAMPTZ, -- Optional expiration date for the notification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT notifications_non_empty_title CHECK (length(title) > 0),
  CONSTRAINT notifications_non_empty_message CHECK (length(message) > 0),
  CONSTRAINT notifications_read_when_timestamp CHECK (
    (is_read = true AND read_at IS NOT NULL) OR 
    (is_read = false AND read_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_templates_code ON notification_templates(code);
CREATE INDEX idx_templates_channel ON notification_templates(channel);
CREATE INDEX idx_templates_active ON notification_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_metadata ON notifications USING GIN(metadata);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates table

-- Public can read active templates (for client-side rendering)
CREATE POLICY "templates_select_public" ON notification_templates
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify templates
CREATE POLICY "templates_modify_admin" ON notification_templates
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

-- RLS Policies for notifications table

-- Users can read their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications (via API with service role)
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT
  WITH CHECK (true); -- Will be controlled by API logic

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all notifications
CREATE POLICY "notifications_admin_all" ON notifications
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

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  template_code TEXT,
  recipient_user_id UUID,
  template_variables JSONB DEFAULT '{}',
  notification_link TEXT DEFAULT NULL,
  notification_metadata JSONB DEFAULT '{}',
  expires_in_hours INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  rendered_title TEXT;
  rendered_message TEXT;
  notification_id UUID;
  expires_at_value TIMESTAMPTZ;
BEGIN
  -- Get template
  SELECT id, name, body_md, is_active
  INTO template_record
  FROM notification_templates
  WHERE code = template_code AND channel = 'inapp' AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active in-app notification template not found: %', template_code;
  END IF;
  
  -- Simple variable replacement (in production, use a proper template engine)
  rendered_title := template_record.name;
  rendered_message := template_record.body_md;
  
  -- Replace common variables
  IF template_variables ? 'user_name' THEN
    rendered_title := replace(rendered_title, '{{user_name}}', template_variables->>'user_name');
    rendered_message := replace(rendered_message, '{{user_name}}', template_variables->>'user_name');
  END IF;
  
  IF template_variables ? 'listing_title' THEN
    rendered_title := replace(rendered_title, '{{listing_title}}', template_variables->>'listing_title');
    rendered_message := replace(rendered_message, '{{listing_title}}', template_variables->>'listing_title');
  END IF;
  
  IF template_variables ? 'amount' THEN
    rendered_title := replace(rendered_title, '{{amount}}', template_variables->>'amount');
    rendered_message := replace(rendered_message, '{{amount}}', template_variables->>'amount');
  END IF;
  
  -- Calculate expiration
  IF expires_in_hours IS NOT NULL THEN
    expires_at_value := NOW() + (expires_in_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata,
    expires_at
  ) VALUES (
    recipient_user_id,
    'info', -- Default type, can be overridden in metadata
    rendered_title,
    rendered_message,
    notification_link,
    notification_metadata,
    expires_at_value
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  notification_id UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = notification_id
  AND user_id = user_uuid
  AND is_read = false;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE user_id = user_uuid
  AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = user_uuid
  AND is_read = false
  AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for notification_templates
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- Insert default notification templates
INSERT INTO notification_templates (code, name, channel, subject, body_md, variables, is_active) VALUES
-- Auction/Bidding templates
('bid_placed', 'New Bid Placed', 'inapp', NULL, 'A new bid of **${{amount}}** has been placed on your listing "{{listing_title}}".', '{"amount": "Bid amount", "listing_title": "Title of the listing", "bidder_name": "Name of the bidder"}', true),
('bid_placed_email', 'New Bid on Your Listing', 'email', 'New Bid: ${{amount}} on {{listing_title}}', 'Hello {{seller_name}},\n\nGreat news! A new bid of **${{amount}}** has been placed on your listing "{{listing_title}}".\n\n**Bidder:** {{bidder_name}}\n**Current High Bid:** ${{amount}}\n**Auction Ends:** {{auction_end_time}}\n\n[View Listing]({{listing_url}})\n\nBest regards,\nThe MatEx Team', '{"amount": "Bid amount", "listing_title": "Title of the listing", "seller_name": "Seller name", "bidder_name": "Bidder name", "auction_end_time": "When auction ends", "listing_url": "Link to listing"}', true),

('outbid', 'You Have Been Outbid', 'inapp', NULL, 'You have been outbid on "{{listing_title}}". The current high bid is **${{current_bid}}**.', '{"listing_title": "Title of the listing", "current_bid": "Current highest bid", "your_bid": "User previous bid"}', true),
('outbid_email', 'You Have Been Outbid', 'email', 'Outbid Alert: {{listing_title}}', 'Hello {{bidder_name}},\n\nYou have been outbid on the listing "{{listing_title}}".\n\n**Your Previous Bid:** ${{your_bid}}\n**Current High Bid:** ${{current_bid}}\n**Auction Ends:** {{auction_end_time}}\n\nYou can place a new bid to stay in the running!\n\n[View Listing]({{listing_url}})\n\nBest regards,\nThe MatEx Team', '{"listing_title": "Title of the listing", "bidder_name": "Bidder name", "your_bid": "Previous bid amount", "current_bid": "Current highest bid", "auction_end_time": "When auction ends", "listing_url": "Link to listing"}', true),

('auction_won', 'Congratulations! You Won the Auction', 'inapp', NULL, 'Congratulations! You won the auction for "{{listing_title}}" with a bid of **${{winning_bid}}**.', '{"listing_title": "Title of the listing", "winning_bid": "Winning bid amount", "seller_name": "Seller name"}', true),
('auction_won_email', 'Auction Won!', 'email', 'Congratulations! You won {{listing_title}}', 'Hello {{winner_name}},\n\nCongratulations! You have won the auction for "{{listing_title}}".\n\n**Winning Bid:** ${{winning_bid}}\n**Seller:** {{seller_name}}\n**Next Steps:** You will receive payment instructions shortly.\n\n[View Order]({{order_url}})\n\nThank you for using MatEx!\n\nBest regards,\nThe MatEx Team', '{"listing_title": "Title of the listing", "winner_name": "Winner name", "winning_bid": "Winning bid amount", "seller_name": "Seller name", "order_url": "Link to order"}', true),

-- Inspection templates
('inspection_booked', 'Inspection Booked', 'inapp', NULL, 'Your inspection for "{{listing_title}}" has been booked for {{inspection_date}}.', '{"listing_title": "Title of the listing", "inspection_date": "Date and time of inspection", "seller_name": "Seller name"}', true),
('inspection_reminder', 'Inspection Reminder', 'inapp', NULL, 'Reminder: You have an inspection for "{{listing_title}}" tomorrow at {{inspection_time}}.', '{"listing_title": "Title of the listing", "inspection_time": "Time of inspection", "location": "Inspection location"}', true),
('inspection_cancelled', 'Inspection Cancelled', 'inapp', NULL, 'Your inspection for "{{listing_title}}" scheduled for {{inspection_date}} has been cancelled.', '{"listing_title": "Title of the listing", "inspection_date": "Date of cancelled inspection", "reason": "Cancellation reason"}', true),

-- Order/Payment templates
('payment_received', 'Payment Received', 'inapp', NULL, 'Payment of **${{amount}}** has been received for your order of "{{listing_title}}".', '{"listing_title": "Title of the listing", "amount": "Payment amount", "buyer_name": "Buyer name"}', true),
('order_fulfilled', 'Order Fulfilled', 'inapp', NULL, 'Your order for "{{listing_title}}" has been marked as fulfilled by the seller.', '{"listing_title": "Title of the listing", "seller_name": "Seller name", "fulfillment_date": "Date fulfilled"}', true),

-- System templates
('welcome', 'Welcome to MatEx!', 'inapp', NULL, 'Welcome to MatEx, {{user_name}}! Your account has been created successfully.', '{"user_name": "User name"}', true),
('kyc_approved', 'KYC Verification Approved', 'inapp', NULL, 'Great news! Your KYC verification has been approved. You can now start {{action}} on MatEx.', '{"user_name": "User name", "action": "buying/selling"}', true),
('kyc_rejected', 'KYC Verification Requires Attention', 'inapp', NULL, 'Your KYC verification requires additional information. Please check your profile for details.', '{"user_name": "User name", "reason": "Rejection reason"}', true),

-- Maintenance templates
('maintenance_mode', 'System Maintenance', 'inapp', NULL, 'MatEx is currently undergoing maintenance. We''ll be back shortly!', '{"estimated_duration": "Estimated maintenance duration"}', true);

-- Comments for documentation
COMMENT ON TABLE notification_templates IS 'Templates for generating notifications across different channels';
COMMENT ON TABLE notifications IS 'User notifications with read status and metadata';

COMMENT ON COLUMN notification_templates.code IS 'Unique identifier for the template (e.g., bid_placed, auction_won)';
COMMENT ON COLUMN notification_templates.channel IS 'Delivery channel: inapp, email, or sms';
COMMENT ON COLUMN notification_templates.body_md IS 'Template body in Markdown with {{variable}} placeholders';
COMMENT ON COLUMN notification_templates.variables IS 'JSON object describing available template variables';

COMMENT ON COLUMN notifications.user_id IS 'Foreign key to the user receiving the notification';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, warning, success, error';
COMMENT ON COLUMN notifications.link IS 'Optional link for the notification action';
COMMENT ON COLUMN notifications.metadata IS 'Additional structured data (listing_id, order_id, etc.)';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration date for time-sensitive notifications';

COMMENT ON FUNCTION create_notification_from_template(TEXT, UUID, JSONB, TEXT, JSONB, INTEGER) IS 'Creates a notification from a template with variable substitution';
COMMENT ON FUNCTION mark_notification_read(UUID, UUID) IS 'Marks a specific notification as read';
COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION get_unread_notification_count(UUID) IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Removes expired notifications (for scheduled cleanup)';
