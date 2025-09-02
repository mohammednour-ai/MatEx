import { supabaseServer } from './supabaseServer';

// Interface for app setting
// AppSetting type not required in this module at present

/**
 * Upsert app setting
 */
async function upsertAppSetting(
  key: string,
  value: unknown,
  description?: string,
  category?: string
): Promise<boolean> {
  try {
    const { error } = await supabaseServer
      .from('app_settings')
      .upsert({
        key,
        value,
        description,
        category,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error(`Error upserting app setting '${key}':`, error);
      return false;
    }

    console.log(`App setting '${key}' upserted successfully`);
    return true;
  } catch (error) {
    console.error(`Error in upsertAppSetting for '${key}':`, error);
    return false;
  }
}

/**
 * Initialize inspection reminder settings
 */
export async function initializeInspectionReminderSettings(): Promise<void> {
  try {
    console.log('Initializing inspection reminder settings...');

    // Reminder hours before inspection
    await upsertAppSetting(
      'inspections.reminder_hours_before',
      24,
      'Number of hours before inspection to send reminder',
      'inspections'
    );

    // Reminder enabled flag
    await upsertAppSetting(
      'inspections.reminder_enabled',
      true,
      'Whether inspection reminders are enabled',
      'inspections'
    );

    // Reminder channels
    await upsertAppSetting(
      'inspections.reminder_channels',
      ['inapp', 'email'],
      'Channels to send inspection reminders through',
      'inspections'
    );

    console.log('Inspection reminder settings initialized successfully');
  } catch (error) {
    console.error('Error initializing inspection reminder settings:', error);
  }
}

/**
 * Initialize all default app settings
 */
export async function initializeAllSettings(): Promise<void> {
  try {
    console.log('Initializing all default app settings...');

    // Initialize inspection reminder settings
    await initializeInspectionReminderSettings();

    // Initialize other inspection settings
    await upsertAppSetting(
      'inspections.max_slots_per_day',
      10,
      'Maximum number of inspection slots per day',
      'inspections'
    );

    await upsertAppSetting(
      'inspections.default_duration_minutes',
      60,
      'Default duration for inspection slots in minutes',
      'inspections'
    );

    await upsertAppSetting(
      'inspections.advance_booking_days',
      30,
      'Maximum days in advance inspections can be booked',
      'inspections'
    );

    await upsertAppSetting(
      'inspections.min_advance_hours',
      24,
      'Minimum hours in advance inspections must be booked',
      'inspections'
    );

    // Initialize auction settings
    await upsertAppSetting(
      'auctions.default_duration_hours',
      168,
      'Default auction duration in hours (7 days)',
      'auctions'
    );

    await upsertAppSetting(
      'auctions.min_bid_increment_percent',
      5,
      'Minimum bid increment as percentage of current bid',
      'auctions'
    );

    await upsertAppSetting(
      'auctions.auto_extend_minutes',
      10,
      'Minutes to extend auction if bid placed near end',
      'auctions'
    );

    // Initialize notification settings
    await upsertAppSetting(
      'notifications.email_enabled',
      true,
      'Whether email notifications are enabled',
      'notifications'
    );

    await upsertAppSetting(
      'notifications.inapp_enabled',
      true,
      'Whether in-app notifications are enabled',
      'notifications'
    );

    await upsertAppSetting(
      'notifications.retention_days',
      90,
      'Number of days to retain notifications',
      'notifications'
    );

    // Initialize system settings
    await upsertAppSetting(
      'system.maintenance_mode',
      false,
      'Whether the system is in maintenance mode',
      'system'
    );

    await upsertAppSetting(
      'system.max_file_upload_mb',
      10,
      'Maximum file upload size in MB',
      'system'
    );

    await upsertAppSetting(
      'system.rate_limit_requests_per_minute',
      60,
      'Rate limit for API requests per minute per IP',
      'system'
    );

    console.log('All default app settings initialized successfully');
  } catch (error) {
    console.error('Error initializing all settings:', error);
  }
}

/**
 * Get app setting by key
 */
export async function getAppSetting(key: string, defaultValue?: unknown): Promise<unknown> {
  try {
    const { data: setting, error } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !setting) {
      console.warn(`App setting '${key}' not found, using default value`);
      return defaultValue;
    }

    return setting.value;
  } catch (error) {
    console.error(`Error getting app setting '${key}':`, error);
    return defaultValue;
  }
}

/**
 * Get multiple app settings by keys
 */
export async function getAppSettings(keys: string[]): Promise<Record<string, unknown>> {
  try {
    const { data: settings, error } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', keys);

    if (error) {
      console.error('Error getting app settings:', error);
      return {};
    }

    return (settings || []).reduce((acc: Record<string, unknown>, setting: unknown) => {
      const s = setting as { key?: string; value?: unknown };
      if (s.key) acc[s.key] = s.value as unknown;
      return acc;
    }, {} as Record<string, unknown>);
  } catch (error) {
    console.error('Error in getAppSettings:', error);
    return {};
  }
}

/**
 * Update app setting
 */
export async function updateAppSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const { error } = await supabaseServer
      .from('app_settings')
      .update({
        value,
        updated_at: new Date().toISOString()
      })
      .eq('key', key);

    if (error) {
      console.error(`Error updating app setting '${key}':`, error);
      return false;
    }

    console.log(`App setting '${key}' updated successfully`);
    return true;
  } catch (error) {
    console.error(`Error in updateAppSetting for '${key}':`, error);
    return false;
  }
}
