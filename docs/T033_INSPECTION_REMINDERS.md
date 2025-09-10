# T033: Inspection Reminders

## Overview
Implement automated reminder notifications for upcoming inspections. This system sends timely reminders to both buyers and sellers before scheduled inspections, with configurable timing and multiple notification channels to ensure no one misses their appointments.

## Implementation Details

### Reminder Scheduling System
Create a system that automatically schedules and sends inspection reminders based on configurable settings.

### Database Schema Enhancement
```sql
-- Add reminder tracking to inspection_bookings
ALTER TABLE inspection_bookings 
ADD COLUMN reminder_sent_at TIMESTAMPTZ,
ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN reminder_2h_sent BOOLEAN DEFAULT FALSE;

-- Create inspection reminder settings
INSERT INTO app_settings (key, value, updated_at) VALUES
('inspection.reminder_24h_enabled', 'true', NOW()),
('inspection.reminder_2h_enabled', 'true', NOW()),
('inspection.reminder_custom_hours', '[24, 2]', NOW()),
('inspection.reminder_channels', '["inapp", "email"]', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

### Reminder Service Implementation
```typescript
// src/lib/inspection-reminders.ts
import { supabase } from './supabaseServer';
import { sendEmailNotification } from './notification-helpers';

interface InspectionReminder {
  booking_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  inspection_id: string;
  slot_at: string;
  duration_minutes: number;
  listing_id: string;
  listing_title: string;
  listing_location: string;
  seller_id: string;
  seller_name: string;
  seller_phone?: string;
  notes?: string;
}

export class InspectionReminderService {
  private static instance: InspectionReminderService;
  private reminderInterval: NodeJS.Timeout | null = null;

  static getInstance(): InspectionReminderService {
    if (!InspectionReminderService.instance) {
      InspectionReminderService.instance = new InspectionReminderService();
    }
    return InspectionReminderService.instance;
  }

  async startReminderService() {
    if (this.reminderInterval) return;

    console.log('Starting inspection reminder service...');
    
    // Check for reminders every 15 minutes
    this.reminderInterval = setInterval(async () => {
      await this.processReminders();
    }, 15 * 60 * 1000);

    // Run immediately on start
    await this.processReminders();
  }

  stopReminderService() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('Inspection reminder service stopped');
    }
  }

  private async processReminders() {
    try {
      const settings = await this.getReminderSettings();
      if (!settings.enabled) return;

      const upcomingInspections = await this.getUpcomingInspections();
      
      for (const inspection of upcomingInspections) {
        await this.checkAndSendReminders(inspection, settings);
      }
    } catch (error) {
      console.error('Error processing inspection reminders:', error);
    }
  }

  private async getReminderSettings() {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'inspection.reminder_24h_enabled',
        'inspection.reminder_2h_enabled',
        'inspection.reminder_custom_hours',
        'inspection.reminder_channels'
      ]);

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>) || {};

    return {
      enabled: settingsMap['inspection.reminder_24h_enabled'] === true || 
               settingsMap['inspection.reminder_2h_enabled'] === true,
      reminder24h: settingsMap['inspection.reminder_24h_enabled'] === true,
      reminder2h: settingsMap['inspection.reminder_2h_enabled'] === true,
      customHours: settingsMap['inspection.reminder_custom_hours'] || [24, 2],
      channels: settingsMap['inspection.reminder_channels'] || ['inapp', 'email']
    };
  }

  private async getUpcomingInspections(): Promise<InspectionReminder[]> {
    const now = new Date();
    const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: inspections } = await supabase
      .from('inspection_bookings')
      .select(`
        id,
        user_id,
        reminder_24h_sent,
        reminder_2h_sent,
        user:profiles!inspection_bookings_user_id_fkey(
          full_name,
          email
        ),
        inspection:inspections(
          id,
          slot_at,
          duration_minutes,
          notes,
          listing:listings(
            id,
            title,
            location_city,
            location_province,
            seller_id,
            seller:profiles!listings_seller_id_fkey(
              full_name,
              phone
            )
          )
        )
      `)
      .eq('status', 'booked')
      .gte('inspection.slot_at', now.toISOString())
      .lte('inspection.slot_at', next48Hours.toISOString());

    return inspections?.map(booking => ({
      booking_id: booking.id,
      user_id: booking.user_id,
      user_name: booking.user.full_name,
      user_email: booking.user.email,
      inspection_id: booking.inspection.id,
      slot_at: booking.inspection.slot_at,
      duration_minutes: booking.inspection.duration_minutes,
      listing_id: booking.inspection.listing.id,
      listing_title: booking.inspection.listing.title,
      listing_location: `${booking.inspection.listing.location_city}, ${booking.inspection.listing.location_province}`,
      seller_id: booking.inspection.listing.seller_id,
      seller_name: booking.inspection.listing.seller.full_name,
      seller_phone: booking.inspection.listing.seller.phone,
      notes: booking.inspection.notes,
      reminder_24h_sent: booking.reminder_24h_sent,
      reminder_2h_sent: booking.reminder_2h_sent
    })) || [];
  }

  private async checkAndSendReminders(inspection: InspectionReminder, settings: any) {
    const now = new Date();
    const inspectionTime = new Date(inspection.slot_at);
    const hoursUntilInspection = (inspectionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 24-hour reminder
    if (settings.reminder24h && 
        !inspection.reminder_24h_sent && 
        hoursUntilInspection <= 24 && 
        hoursUntilInspection > 23) {
      await this.sendReminder(inspection, '24-hour', settings.channels);
      await this.markReminderSent(inspection.booking_id, 'reminder_24h_sent');
    }

    // 2-hour reminder
    if (settings.reminder2h && 
        !inspection.reminder_2h_sent && 
        hoursUntilInspection <= 2 && 
        hoursUntilInspection > 1.5) {
      await this.sendReminder(inspection, '2-hour', settings.channels);
      await this.markReminderSent(inspection.booking_id, 'reminder_2h_sent');
    }
  }

  private async sendReminder(
    inspection: InspectionReminder, 
    reminderType: string, 
    channels: string[]
  ) {
    const inspectionDate = new Date(inspection.slot_at);
    const formattedDate = inspectionDate.toLocaleDateString();
    const formattedTime = inspectionDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Send in-app notification to buyer
    if (channels.includes('inapp')) {
      await supabase
        .from('notifications')
        .insert({
          user_id: inspection.user_id,
          type: 'info',
          title: `Inspection Reminder - ${reminderType}`,
          message: `Your inspection for "${inspection.listing_title}" is scheduled for ${formattedDate} at ${formattedTime}. Location: ${inspection.listing_location}`,
          link: `/listings/${inspection.listing_id}`,
          created_at: new Date().toISOString()
        });

      // Send notification to seller
      await supabase
        .from('notifications')
        .insert({
          user_id: inspection.seller_id,
          type: 'info',
          title: `Upcoming Inspection - ${reminderType}`,
          message: `${inspection.user_name} has an inspection scheduled for "${inspection.listing_title}" on ${formattedDate} at ${formattedTime}`,
          link: `/listings/${inspection.listing_id}`,
          created_at: new Date().toISOString()
        });
    }

    // Send email notification
    if (channels.includes('email')) {
      await this.sendEmailReminder(inspection, reminderType);
    }

    console.log(`Sent ${reminderType} reminder for inspection ${inspection.inspection_id}`);
  }

  private async sendEmailReminder(inspection: InspectionReminder, reminderType: string) {
    const inspectionDate = new Date(inspection.slot_at);
    const formattedDateTime = inspectionDate.toLocaleString();

    // Get email template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('code', 'INSPECTION_REMINDER')
      .eq('is_active', true)
      .single();

    if (!template) {
      console.error('INSPECTION_REMINDER template not found');
      return;
    }

    // Send to buyer
    await sendEmailNotification({
      to: inspection.user_email,
      subject: template.subject.replace('{{reminder_type}}', reminderType),
      template: template.body_md,
      variables: {
        user_name: inspection.user_name,
        reminder_type: reminderType,
        listing_title: inspection.listing_title,
        inspection_date: formattedDateTime,
        inspection_duration: inspection.duration_minutes.toString(),
        listing_location: inspection.listing_location,
        seller_name: inspection.seller_name,
        seller_phone: inspection.seller_phone || 'Not provided',
        inspection_notes: inspection.notes || 'No special notes',
        listing_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${inspection.listing_id}`
      }
    });
  }

  private async markReminderSent(bookingId: string, field: string) {
    await supabase
      .from('inspection_bookings')
      .update({ [field]: true })
      .eq('id', bookingId);
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  InspectionReminderService.getInstance().startReminderService();
}
```

### Email Template for Reminders
```sql
-- Insert inspection reminder email template
INSERT INTO notification_templates (
  code,
  channel,
  subject,
  body_md,
  is_active,
  created_at,
  updated_at
) VALUES (
  'INSPECTION_REMINDER',
  'email',
  'Inspection Reminder ({{reminder_type}}) - {{listing_title}}',
  '# Inspection Reminder

Hi {{user_name}},

This is a {{reminder_type}} reminder for your upcoming inspection:

## Inspection Details
**Listing:** {{listing_title}}  
**Date & Time:** {{inspection_date}}  
**Duration:** {{inspection_duration}} minutes  
**Location:** {{listing_location}}

## Seller Contact
**Name:** {{seller_name}}  
**Phone:** {{seller_phone}}

{{#if inspection_notes}}
## Special Notes
{{inspection_notes}}
{{/if}}

## Preparation Checklist
- [ ] Bring valid photo ID
- [ ] Arrive 5-10 minutes early
- [ ] Bring measuring tools if needed
- [ ] Prepare your questions in advance
- [ ] Have seller contact info handy

[View Listing Details]({{listing_url}})

---

*Need to cancel or reschedule? Please contact the seller directly or cancel through your dashboard at least 1 hour before the scheduled time.*

Best regards,  
The MatEx Team',
  true,
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_md = EXCLUDED.body_md,
  updated_at = NOW();
```

### API Endpoint for Manual Reminder Testing
```typescript
// src/app/api/admin/inspections/send-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { InspectionReminderService } from '@/lib/inspection-reminders';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reminderService = InspectionReminderService.getInstance();
    await reminderService.processReminders();

    return NextResponse.json({ 
      message: 'Reminder processing completed successfully' 
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### React Component for Reminder Settings
```typescript
// src/components/admin/ReminderSettings.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ReminderSettings {
  reminder_24h_enabled: boolean;
  reminder_2h_enabled: boolean;
  reminder_channels: string[];
}

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>({
    reminder_24h_enabled: true,
    reminder_2h_enabled: true,
    reminder_channels: ['inapp', 'email']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'inspection.reminder_24h_enabled',
          'inspection.reminder_2h_enabled',
          'inspection.reminder_channels'
        ]);

      if (data) {
        const settingsMap = data.reduce((acc, setting) => {
          acc[setting.key.replace('inspection.', '')] = setting.value;
          return acc;
        }, {} as Record<string, any>);

        setSettings({
          reminder_24h_enabled: settingsMap.reminder_24h_enabled === true,
          reminder_2h_enabled: settingsMap.reminder_2h_enabled === true,
          reminder_channels: settingsMap.reminder_channels || ['inapp', 'email']
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          key: 'inspection.reminder_24h_enabled',
          value: settings.reminder_24h_enabled
        },
        {
          key: 'inspection.reminder_2h_enabled',
          value: settings.reminder_2h_enabled
        },
        {
          key: 'inspection.reminder_channels',
          value: settings.reminder_channels
        }
      ];

      for (const update of updates) {
        await supabase
          .from('app_settings')
          .upsert({
            key: update.key,
            value: update.value,
            updated_at: new Date().toISOString()
          });
      }

      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testReminders = async () => {
    try {
      const response = await fetch('/api/admin/inspections/send-reminders', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Reminder processing triggered successfully');
      } else {
        alert('Failed to trigger reminder processing');
      }
    } catch (error) {
      console.error('Failed to test reminders:', error);
      alert('Failed to test reminders');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading reminder settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Inspection Reminder Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              24-Hour Reminders
            </label>
            <p className="text-sm text-gray-500">
              Send reminders 24 hours before inspections
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.reminder_24h_enabled}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              reminder_24h_enabled: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">
              2-Hour Reminders
            </label>
            <p className="text-sm text-gray-500">
              Send reminders 2 hours before inspections
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.reminder_2h_enabled}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              reminder_2h_enabled: e.target.checked 
            }))}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Notification Channels
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.reminder_channels.includes('inapp')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...settings.reminder_channels, 'inapp']
                    : settings.reminder_channels.filter(c => c !== 'inapp');
                  setSettings(prev => ({ ...prev, reminder_channels: channels }));
                }}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
              />
              <span className="text-sm text-gray-700">In-app notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.reminder_channels.includes('email')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...settings.reminder_channels, 'email']
                    : settings.reminder_channels.filter(c => c !== 'email');
                  setSettings(prev => ({ ...prev, reminder_channels: channels }));
                }}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
              />
              <span className="text-sm text-gray-700">Email notifications</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        
        <button
          onClick={testReminders}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Test Reminders
        </button>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">How Reminders Work</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Reminders are checked every 15 minutes automatically</li>
          <li>• 24-hour reminders are sent when inspection is 23-24 hours away</li>
          <li>• 2-hour reminders are sent when inspection is 1.5-2 hours away</li>
          <li>• Each reminder is sent only once per booking</li>
          <li>• Both buyers and sellers receive notifications</li>
        </ul>
      </div>
    </div>
  );
}
```

## Files Created/Modified
- Database: Enhanced `inspection_bookings` table with reminder tracking fields
- Database: Added reminder configuration settings to `app_settings`
- Database: `INSPECTION_REMINDER` email template
- `src/lib/inspection-reminders.ts` - Reminder service implementation
- `src/app/api/admin/inspections/send-reminders/route.ts` - Manual reminder trigger
- `src/components/admin/ReminderSettings.tsx` - Admin settings interface

## Technical Considerations
- **Timing Accuracy**: 15-minute check intervals balance performance with timeliness
- **Duplicate Prevention**: Track sent reminders to avoid spam
- **Configurable Settings**: Admin-controlled reminder timing and channels
- **Error Handling**: Graceful failure handling for email delivery issues
- **Performance**: Efficient queries to minimize database load
- **Scalability**: Service can handle large numbers of concurrent inspections

## Success Metrics
- Reminder delivery within 15 minutes of scheduled time
- Zero duplicate reminders sent
- 95%+ email delivery success rate
- Configurable reminder timing working correctly
- Both buyers and sellers receive appropriate notifications
- Admin can successfully test and configure reminder system

## Dependencies
- Existing inspection booking system
- Email notification infrastructure
- App settings configuration system
- Notification templates system
- Background job processing capability
