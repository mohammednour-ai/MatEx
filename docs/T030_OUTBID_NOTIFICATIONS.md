# T030: Outbid Notifications

## Overview
Implement automated notification system to alert users when they have been outbid in an auction. This system triggers notifications via in-app and email channels using the notification templates system, ensuring users stay engaged and can respond to competitive bidding situations.

## Implementation Details

### Notification Trigger System
Create a system that automatically detects when a user has been outbid and sends appropriate notifications.

### Database Trigger Function
```sql
-- Create function to handle outbid notifications
CREATE OR REPLACE FUNCTION handle_outbid_notifications()
RETURNS TRIGGER AS $$
DECLARE
  previous_high_bidder_id UUID;
  auction_listing_id UUID;
  auction_title TEXT;
  new_bid_amount NUMERIC;
BEGIN
  -- Get the auction listing details
  SELECT l.id, l.title INTO auction_listing_id, auction_title
  FROM auctions a
  JOIN listings l ON l.id = a.listing_id
  WHERE a.listing_id = NEW.auction_id;

  -- Find the previous highest bidder (excluding the new bid)
  SELECT bidder_id INTO previous_high_bidder_id
  FROM bids
  WHERE auction_id = NEW.auction_id
    AND bidder_id != NEW.bidder_id
    AND created_at < NEW.created_at
  ORDER BY amount_cad DESC, created_at DESC
  LIMIT 1;

  -- If there was a previous high bidder, notify them
  IF previous_high_bidder_id IS NOT NULL THEN
    -- Insert in-app notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      created_at
    ) VALUES (
      previous_high_bidder_id,
      'warning',
      'You''ve been outbid!',
      format('Your bid on "%s" has been outbid. New high bid: $%s CAD', 
             auction_title, 
             NEW.amount_cad::TEXT),
      format('/listings/%s', auction_listing_id),
      NOW()
    );

    -- Trigger email notification (handled by notification system)
    PERFORM pg_notify('outbid_notification', json_build_object(
      'user_id', previous_high_bidder_id,
      'auction_id', NEW.auction_id,
      'listing_id', auction_listing_id,
      'listing_title', auction_title,
      'new_bid_amount', NEW.amount_cad,
      'outbid_at', NEW.created_at
    )::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_outbid_notifications ON bids;
CREATE TRIGGER trigger_outbid_notifications
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_outbid_notifications();
```

### Notification Helper Functions
```typescript
// src/lib/notification-helpers.ts (updated)
import { supabase } from './supabaseServer';

export interface OutbidNotificationData {
  user_id: string;
  auction_id: string;
  listing_id: string;
  listing_title: string;
  new_bid_amount: number;
  outbid_at: string;
}

export async function sendOutbidNotification(data: OutbidNotificationData) {
  try {
    // Get user preferences and contact info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, notification_preferences')
      .eq('id', data.user_id)
      .single();

    if (!profile) return;

    // Get notification template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('code', 'OUTBID_ALERT')
      .eq('is_active', true)
      .single();

    if (!template) {
      console.error('OUTBID_ALERT template not found');
      return;
    }

    // Check if user wants email notifications
    const preferences = profile.notification_preferences || { email: true };
    
    if (preferences.email && template.channel === 'email') {
      await sendEmailNotification({
        to: profile.email,
        subject: template.subject,
        template: template.body_md,
        variables: {
          user_name: profile.full_name,
          listing_title: data.listing_title,
          new_bid_amount: data.new_bid_amount.toLocaleString(),
          listing_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${data.listing_id}`,
          outbid_time: new Date(data.outbid_at).toLocaleString()
        }
      });
    }

    console.log(`Outbid notification sent to user ${data.user_id}`);
  } catch (error) {
    console.error('Failed to send outbid notification:', error);
  }
}

export async function sendEmailNotification({
  to,
  subject,
  template,
  variables
}: {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}) {
  // Simple template variable replacement
  let emailBody = template;
  Object.entries(variables).forEach(([key, value]) => {
    emailBody = emailBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  console.log('Email notification:', {
    to,
    subject,
    body: emailBody
  });

  // For development, you might want to log or use a service like Mailtrap
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 Email to ${to}: ${subject}`);
    console.log(emailBody);
  }
}
```

### PostgreSQL Notification Listener
```typescript
// src/lib/notification-triggers.ts
import { Client } from 'pg';
import { sendOutbidNotification, type OutbidNotificationData } from './notification-helpers';

let notificationClient: Client | null = null;

export async function startNotificationListener() {
  if (notificationClient) return;

  notificationClient = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await notificationClient.connect();
    
    // Listen for outbid notifications
    await notificationClient.query('LISTEN outbid_notification');
    
    notificationClient.on('notification', async (msg) => {
      if (msg.channel === 'outbid_notification' && msg.payload) {
        try {
          const data: OutbidNotificationData = JSON.parse(msg.payload);
          await sendOutbidNotification(data);
        } catch (error) {
          console.error('Error processing outbid notification:', error);
        }
      }
    });

    console.log('Notification listener started');
  } catch (error) {
    console.error('Failed to start notification listener:', error);
    notificationClient = null;
  }
}

export async function stopNotificationListener() {
  if (notificationClient) {
    await notificationClient.end();
    notificationClient = null;
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  startNotificationListener();
}
```

### Notification Templates Seeding
```sql
-- Insert outbid notification template
INSERT INTO notification_templates (
  code,
  channel,
  subject,
  body_md,
  is_active,
  created_at,
  updated_at
) VALUES (
  'OUTBID_ALERT',
  'email',
  'You''ve been outbid on {{listing_title}}',
  '# You''ve Been Outbid!

Hi {{user_name}},

Someone has placed a higher bid on the listing you were interested in:

**{{listing_title}}**

**New high bid:** ${{new_bid_amount}} CAD  
**Time:** {{outbid_time}}

Don''t let this opportunity slip away! You can place a new bid by visiting the listing:

[View Listing and Bid]({{listing_url}})

---

*This is an automated notification from MatEx. You can manage your notification preferences in your account settings.*',
  true,
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_md = EXCLUDED.body_md,
  updated_at = NOW();
```

### React Component for Notification Preferences
```typescript
// src/components/NotificationPreferences.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface NotificationPreferences {
  email: boolean;
  inapp: boolean;
  outbid_alerts: boolean;
  auction_ending: boolean;
  inspection_reminders: boolean;
}

export function NotificationPreferences({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    inapp: true,
    outbid_alerts: true,
    auction_ending: true,
    inspection_reminders: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (profile?.notification_preferences) {
        setPreferences({ ...preferences, ...profile.notification_preferences });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              Email Notifications
            </label>
            <p className="text-sm text-gray-500">
              Receive notifications via email
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.email}
            onChange={(e) => setPreferences(prev => ({ ...prev, email: e.target.checked }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              Outbid Alerts
            </label>
            <p className="text-sm text-gray-500">
              Get notified when someone outbids you
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.outbid_alerts}
            onChange={(e) => setPreferences(prev => ({ ...prev, outbid_alerts: e.target.checked }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              Auction Ending Soon
            </label>
            <p className="text-sm text-gray-500">
              Alerts when auctions you're bidding on are ending
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.auction_ending}
            onChange={(e) => setPreferences(prev => ({ ...prev, auction_ending: e.target.checked }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
        </div>
      </div>

      <button
        onClick={savePreferences}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
```

## Files Created/Modified
- Database: `handle_outbid_notifications()` function and trigger
- Database: `OUTBID_ALERT` notification template
- `src/lib/notification-helpers.ts` - Outbid notification functions
- `src/lib/notification-triggers.ts` - PostgreSQL notification listener
- `src/components/NotificationPreferences.tsx` - User preference management

## Technical Considerations
- **Real-time Processing**: Database triggers ensure immediate notification
- **User Preferences**: Respect user notification settings
- **Template System**: Use configurable email templates
- **Error Handling**: Graceful failure for notification delivery
- **Performance**: Efficient queries to find previous high bidder
- **Scalability**: PostgreSQL NOTIFY/LISTEN for async processing

## Success Metrics
- Outbid notifications sent within 5 seconds of new bid
- Email delivery rate > 95%
- User engagement increase after receiving notifications
- Zero false positive notifications
- Proper handling of user preference changes

## Dependencies
- PostgreSQL database with trigger support
- Email service integration (SendGrid, AWS SES, etc.)
- Existing notification templates system
- User profile and preferences system
