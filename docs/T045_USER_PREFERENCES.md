# T045: User Preferences

## Overview
Implement a user notification preferences system that allows users to control which notification channels they receive (in-app, email, SMS) and set digest frequency preferences. Store preferences in a dedicated user settings table.

## Implementation Details

### Database Schema
Create a user preferences table to store notification settings.

```sql
-- supabase/migrations/022_user_preferences.sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can access all preferences
CREATE POLICY "Admins can manage all preferences" ON user_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- Insert default notification preferences for existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT 
  id,
  'notifications',
  '{
    "channels": {
      "inapp": true,
      "email": true,
      "sms": false
    },
    "types": {
      "bid_received": true,
      "outbid_notification": true,
      "auction_won": true,
      "inspection_booked": true,
      "inspection_reminder": true,
      "deposit_authorized": true,
      "payment_received": true,
      "system_updates": true
    },
    "digest": {
      "enabled": false,
      "frequency": "daily",
      "time": "09:00"
    }
  }'::jsonb
FROM auth.users
ON CONFLICT (user_id, preference_key) DO NOTHING;
```

### User Preferences API
Create API endpoints to manage user notification preferences.

```typescript
// src/app/api/preferences/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('preference_key, preference_value')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert to key-value object
    const preferencesObj = preferences.reduce((acc, pref) => {
      acc[pref.preference_key] = pref.preference_value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ preferences: preferencesObj });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferenceKey, preferenceValue } = await request.json();

    if (!preferenceKey || preferenceValue === undefined) {
      return NextResponse.json({ error: 'Missing preference key or value' }, { status: 400 });
    }

    // Upsert preference
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preference_key: preferenceKey,
        preference_value: preferenceValue,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,preference_key'
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Preferences Helper Functions
Create utility functions to check user notification preferences.

```typescript
// src/lib/user-preferences.ts
import { createClient } from '@/lib/supabaseServer';

export interface NotificationPreferences {
  channels: {
    inapp: boolean;
    email: boolean;
    sms: boolean;
  };
  types: {
    bid_received: boolean;
    outbid_notification: boolean;
    auction_won: boolean;
    inspection_booked: boolean;
    inspection_reminder: boolean;
    deposit_authorized: boolean;
    payment_received: boolean;
    system_updates: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

export async function getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preference_value')
    .eq('user_id', userId)
    .eq('preference_key', 'notifications')
    .single();

  if (error || !data) {
    // Return default preferences if none found
    return {
      channels: { inapp: true, email: true, sms: false },
      types: {
        bid_received: true,
        outbid_notification: true,
        auction_won: true,
        inspection_booked: true,
        inspection_reminder: true,
        deposit_authorized: true,
        payment_received: true,
        system_updates: true
      },
      digest: { enabled: false, frequency: 'daily', time: '09:00' }
    };
  }

  return data.preference_value as NotificationPreferences;
}

export async function shouldSendNotification(
  userId: string,
  notificationType: keyof NotificationPreferences['types'],
  channel: keyof NotificationPreferences['channels']
): Promise<boolean> {
  const preferences = await getUserPreferences(userId);
  if (!preferences) return true; // Default to sending if no preferences

  return preferences.channels[channel] && preferences.types[notificationType];
}

export async function createDefaultPreferences(userId: string): Promise<void> {
  const supabase = createClient();
  
  const defaultPreferences: NotificationPreferences = {
    channels: { inapp: true, email: true, sms: false },
    types: {
      bid_received: true,
      outbid_notification: true,
      auction_won: true,
      inspection_booked: true,
      inspection_reminder: true,
      deposit_authorized: true,
      payment_received: true,
      system_updates: true
    },
    digest: { enabled: false, frequency: 'daily', time: '09:00' }
  };

  await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preference_key: 'notifications',
      preference_value: defaultPreferences
    }, {
      onConflict: 'user_id,preference_key'
    });
}
```

### Notification Preferences Page
Create a user-facing preferences page.

```typescript
// src/app/profile/preferences/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface NotificationPreferences {
  channels: {
    inapp: boolean;
    email: boolean;
    sms: boolean;
  };
  types: {
    bid_received: boolean;
    outbid_notification: boolean;
    auction_won: boolean;
    inspection_booked: boolean;
    inspection_reminder: boolean;
    deposit_authorized: boolean;
    payment_received: boolean;
    system_updates: boolean;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/preferences');
      const data = await response.json();
      
      if (data.preferences?.notifications) {
        setPreferences(data.preferences.notifications);
      } else {
        // Set default preferences
        const defaultPrefs: NotificationPreferences = {
          channels: { inapp: true, email: true, sms: false },
          types: {
            bid_received: true,
            outbid_notification: true,
            auction_won: true,
            inspection_booked: true,
            inspection_reminder: true,
            deposit_authorized: true,
            payment_received: true,
            system_updates: true
          },
          digest: { enabled: false, frequency: 'daily', time: '09:00' }
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferenceKey: 'notifications',
          preferenceValue: preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateChannelPreference = (channel: keyof NotificationPreferences['channels'], enabled: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: enabled
      }
    });
  };

  const updateTypePreference = (type: keyof NotificationPreferences['types'], enabled: boolean) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      types: {
        ...preferences.types,
        [type]: enabled
      }
    });
  };

  const updateDigestPreference = (key: keyof NotificationPreferences['digest'], value: any) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      digest: {
        ...preferences.digest,
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600">Failed to load preferences. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="text-gray-600 mt-2">
            Control how and when you receive notifications from MatEx.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Notification Channels */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">In-App Notifications</label>
                  <p className="text-sm text-gray-600">Receive notifications in the MatEx app</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channels.inapp}
                  onChange={(e) => updateChannelPreference('inapp', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channels.email}
                  onChange={(e) => updateChannelPreference('email', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                  <p className="text-sm text-gray-600">Receive notifications via text message</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.channels.sms}
                  onChange={(e) => updateChannelPreference('sms', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h2>
            <div className="space-y-4">
              {Object.entries({
                bid_received: 'New bids on your listings',
                outbid_notification: 'When you\'ve been outbid',
                auction_won: 'When you win an auction',
                inspection_booked: 'Inspection bookings',
                inspection_reminder: 'Inspection reminders',
                deposit_authorized: 'Deposit confirmations',
                payment_received: 'Payment confirmations',
                system_updates: 'System updates and announcements'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">{label}</label>
                  <input
                    type="checkbox"
                    checked={preferences.types[key as keyof NotificationPreferences['types']]}
                    onChange={(e) => updateTypePreference(key as keyof NotificationPreferences['types'], e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Digest Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Digest</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Enable Email Digest</label>
                  <p className="text-sm text-gray-600">Receive a summary of notifications instead of individual emails</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.digest.enabled}
                  onChange={(e) => updateDigestPreference('enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {preferences.digest.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Digest Frequency</label>
                    <select
                      value={preferences.digest.frequency}
                      onChange={(e) => updateDigestPreference('frequency', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Digest Time</label>
                    <input
                      type="time"
                      value={preferences.digest.time}
                      onChange={(e) => updateDigestPreference('time', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Updated Notification System
Update notification helpers to respect user preferences.

```typescript
// src/lib/notification-helpers.ts (updated)
import { shouldSendNotification } from '@/lib/user-preferences';

export async function notifyNewBid(auctionId: string, bidAmount: number, bidderName: string) {
  const supabase = createClient();
  
  // Get auction and listing details
  const { data: auction } = await supabase
    .from('auctions')
    .select(`
      listing_id,
      end_at,
      listings!inner(
        title,
        seller_id,
        profiles!seller_id(full_name, email)
      )
    `)
    .eq('listing_id', auctionId)
    .single();

  if (!auction) return;

  const sellerId = auction.listings.seller_id;

  // Check if user wants in-app notifications
  if (await shouldSendNotification(sellerId, 'bid_received', 'inapp')) {
    await createNotification({
      userId: sellerId,
      type: 'info',
      title: 'New Bid Received',
      message: `${bidderName} placed a bid of $${bidAmount.toFixed(2)} on "${auction.listings.title}"`,
      link: `/listings/${auctionId}`
    });
  }

  // Check if user wants email notifications
  if (auction.listings.profiles.email && 
      await shouldSendNotification(sellerId, 'bid_received', 'email')) {
    await emailRenderer.sendEmail('bid_received', auction.listings.profiles.email, {
      sellerName: auction.listings.profiles.full_name || 'Seller',
      bidderName,
      bidAmount: bidAmount.toFixed(2),
      listingTitle: auction.listings.title,
      bidTime: new Date().toLocaleString(),
      listingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${auctionId}`
    });
  }
}

// Similar updates for other notification functions...
```

## Files Created/Modified

### New Files
- `supabase/migrations/022_user_preferences.sql` - User preferences table schema
- `src/app/api/preferences/route.ts` - API endpoints for managing preferences
- `src/lib/user-preferences.ts` - Helper functions for user preferences
- `src/app/profile/preferences/page.tsx` - User preferences management page

### Modified Files
- `src/lib/notification-helpers.ts` - Respect user preferences when sending notifications

## Database Requirements
- New `user_preferences` table with RLS policies
- Default preferences seeded for existing users

## Success Metrics
- [ ] Users can view their notification preferences
- [ ] Users can update channel preferences (in-app, email, SMS)
- [ ] Users can toggle specific notification types
- [ ] Users can configure email digest settings
- [ ] Notification system respects user preferences
- [ ] Default preferences created for new users
- [ ] Preferences persist across sessions
- [ ] Admin can view user preferences for support

## Testing Checklist
- [ ] Preferences page loads correctly
- [ ] Channel toggles work properly
- [ ] Notification type toggles work properly
- [ ] Digest settings can be configured
- [ ] Preferences save successfully
- [ ] Notifications respect user preferences
- [ ] Default preferences created for new users
- [ ] RLS policies prevent unauthorized access
