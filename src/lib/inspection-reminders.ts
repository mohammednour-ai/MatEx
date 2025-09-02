import { supabaseServer } from './supabaseServer';
import { createNotificationFromTemplate } from './notification-helpers';

// Interface for inspection reminder settings
interface ReminderSettings {
  reminder_hours_before: number;
  reminder_enabled: boolean;
  reminder_channels: string[];
}

// Interface for inspection booking with details
interface InspectionBookingDetails {
  id: string;
  user_id: string;
  inspection_id: string;
  status: string;
  booked_at: string;
  reminder_sent_at?: string;
  inspection: {
    slot_at: string;
    duration_minutes: number;
    location_address?: string;
    location_notes?: string;
    listing_id: string;
    listing: {
      title: string;
      seller_id: string;
      material: string;
      location_city: string;
      location_province: string;
      seller: {
        full_name: string;
        phone: string;
        email: string;
      };
    };
  };
  user: {
    full_name: string;
    email: string;
  };
}

// Raw booking row shape from Supabase (partial, optional fields)
type BookingRow = {
  id?: string;
  user_id?: string;
  inspection_id?: string;
  status?: string;
  booked_at?: string;
  reminder_sent_at?: string | null;
  inspections?: {
    slot_at?: string;
    duration_minutes?: number;
    location_address?: string | null;
    location_notes?: string | null;
    listing_id?: string;
    listings?: {
      title?: string;
      seller_id?: string;
      material?: string;
      location_city?: string;
      location_province?: string;
      profiles?: {
        full_name?: string;
        phone?: string;
        email?: string;
      } | null;
    } | null;
  } | null;
  profiles?: {
    full_name?: string;
    email?: string;
  } | null;
};

/**
 * Get reminder settings from app_settings
 */
async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const { data: settings } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', [
        'inspections.reminder_hours_before',
        'inspections.reminder_enabled',
        'inspections.reminder_channels'
      ]);

    const settingsMap = settings?.reduce((acc: Record<string, unknown>, setting: unknown) => {
      const s = setting as { key?: string; value?: unknown };
      if (s.key) acc[s.key] = s.value as unknown;
      return acc;
    }, {} as Record<string, unknown>) || {};

    return {
      reminder_hours_before: typeof settingsMap['inspections.reminder_hours_before'] === 'number' ? (settingsMap['inspections.reminder_hours_before'] as number) : Number(settingsMap['inspections.reminder_hours_before']) || 24,
      reminder_enabled: (settingsMap['inspections.reminder_enabled'] as boolean) !== false,
      reminder_channels: (settingsMap['inspections.reminder_channels'] as string[]) || ['inapp', 'email']
    };
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    // Return default settings if fetch fails
    return {
      reminder_hours_before: 24,
      reminder_enabled: true,
      reminder_channels: ['inapp', 'email']
    };
  }
}

/**
 * Get inspection bookings that need reminders
 */
async function getBookingsNeedingReminders(reminderHours: number): Promise<InspectionBookingDetails[]> {
  try {
    // Calculate the time window for reminders
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const bufferTime = new Date(reminderTime.getTime() + 30 * 60 * 1000); // 30-minute buffer

    const { data: bookings, error } = await supabaseServer
      .from('inspection_bookings')
      .select(`
        id,
        user_id,
        inspection_id,
        status,
        booked_at,
        reminder_sent_at,
        inspections!inner(
          slot_at,
          duration_minutes,
          location_address,
          location_notes,
          listing_id,
          listings!inner(
            title,
            seller_id,
            material,
            location_city,
            location_province,
            profiles!seller_id(
              full_name,
              phone,
              email
            )
          )
        ),
        profiles!user_id(
          full_name,
          email
        )
      `)
      .eq('status', 'booked')
      .gte('inspections.slot_at', reminderTime.toISOString())
      .lte('inspections.slot_at', bufferTime.toISOString())
      .is('reminder_sent_at', null);

    if (error) {
      console.error('Error fetching bookings for reminders:', error);
      return [];
    }

    return (bookings || []).map((booking: unknown) => {
      const b = booking as BookingRow;
      return {
        id: b.id || '',
        user_id: b.user_id || '',
        inspection_id: b.inspection_id || '',
        status: b.status || '',
        booked_at: b.booked_at || '',
        reminder_sent_at: b.reminder_sent_at || undefined,
        inspection: {
          slot_at: b.inspections?.slot_at || '',
          duration_minutes: b.inspections?.duration_minutes || 0,
          location_address: b.inspections?.location_address || undefined,
          location_notes: b.inspections?.location_notes || undefined,
          listing_id: b.inspections?.listing_id || '',
          listing: {
            title: b.inspections?.listings?.title || '',
            seller_id: b.inspections?.listings?.seller_id || '',
            material: b.inspections?.listings?.material || '',
            location_city: b.inspections?.listings?.location_city || '',
            location_province: b.inspections?.listings?.location_province || '',
            seller: {
              full_name: b.inspections?.listings?.profiles?.full_name || '',
              phone: b.inspections?.listings?.profiles?.phone || '',
              email: b.inspections?.listings?.profiles?.email || ''
            }
          }
        },
        user: {
          full_name: b.profiles?.full_name || '',
          email: b.profiles?.email || ''
        }
      } as InspectionBookingDetails;
    });
  } catch (error) {
    console.error('Error in getBookingsNeedingReminders:', error);
    return [];
  }
}

/**
 * Send reminder notification for an inspection booking
 */
async function sendInspectionReminder(booking: InspectionBookingDetails): Promise<boolean> {
  try {
    const slotTime = new Date(booking.inspection.slot_at);
    const now = new Date();
    const hoursUntil = Math.round((slotTime.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    // Format inspection details
    const inspectionDate = slotTime.toLocaleDateString();
    const inspectionTime = slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const location = `${booking.inspection.listing.location_city}, ${booking.inspection.listing.location_province}`;
    
    // Prepare notification variables
    const variables = {
      buyer_name: booking.user.full_name,
      listing_title: booking.inspection.listing.title,
      material: booking.inspection.listing.material,
      inspection_date: inspectionDate,
      inspection_time: inspectionTime,
      hours_until: hoursUntil.toString(),
      duration_minutes: booking.inspection.duration_minutes.toString(),
      location: location,
      location_address: booking.inspection.location_address || location,
      seller_name: booking.inspection.listing.seller.full_name,
      seller_phone: booking.inspection.listing.seller.phone,
      seller_email: booking.inspection.listing.seller.email,
      listing_url: `/listings/${booking.inspection.listing_id}`
    };

    // Send reminder notification using template
    const success = await createNotificationFromTemplate(
      'inspection_reminder',
      booking.user_id,
      variables
    );

    if (success) {
      // Mark reminder as sent
      await supabaseServer
        .from('inspection_bookings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id);

      console.log(`Inspection reminder sent successfully for booking ${booking.id}`);
      return true;
    } else {
      console.error(`Failed to send inspection reminder for booking ${booking.id}`);
      return false;
    }
  } catch (error) {
    console.error(`Error sending inspection reminder for booking ${booking.id}:`, error);
    return false;
  }
}

/**
 * Process all inspection reminders
 * This function should be called periodically (e.g., via cron job or scheduled task)
 */
export async function processInspectionReminders(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  try {
    console.log('Starting inspection reminder processing...');
    
    // Get reminder settings
    const settings = await getReminderSettings();
    
    if (!settings.reminder_enabled) {
      console.log('Inspection reminders are disabled');
      return { processed: 0, successful: 0, failed: 0 };
    }

    // Get bookings that need reminders
    const bookings = await getBookingsNeedingReminders(settings.reminder_hours_before);
    
    if (bookings.length === 0) {
      console.log('No inspection bookings need reminders at this time');
      return { processed: 0, successful: 0, failed: 0 };
    }

    console.log(`Found ${bookings.length} inspection bookings that need reminders`);

    let successful = 0;
    let failed = 0;

    // Process each booking
    for (const booking of bookings) {
      const success = await sendInspectionReminder(booking);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Add small delay between notifications to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Inspection reminder processing complete: ${successful} successful, ${failed} failed`);
    
    return {
      processed: bookings.length,
      successful,
      failed
    };
  } catch (error) {
    console.error('Error in processInspectionReminders:', error);
    return { processed: 0, successful: 0, failed: 0 };
  }
}

/**
 * Send immediate reminder for a specific booking (for testing or manual triggers)
 */
export async function sendImmediateReminder(bookingId: string): Promise<boolean> {
  try {
    const { data: booking, error } = await supabaseServer
      .from('inspection_bookings')
      .select(`
        id,
        user_id,
        inspection_id,
        status,
        booked_at,
        reminder_sent_at,
        inspections!inner(
          slot_at,
          duration_minutes,
          location_address,
          location_notes,
          listing_id,
          listings!inner(
            title,
            seller_id,
            material,
            location_city,
            location_province,
            profiles!seller_id(
              full_name,
              phone,
              email
            )
          )
        ),
        profiles!user_id(
          full_name,
          email
        )
      `)
      .eq('id', bookingId)
      .eq('status', 'booked')
      .single();

    if (error || !booking) {
      console.error('Booking not found or error fetching booking:', error);
      return false;
    }

    const b = booking as BookingRow;
    const bookingDetails: InspectionBookingDetails = {
      id: b.id || '',
      user_id: b.user_id || '',
      inspection_id: b.inspection_id || '',
      status: b.status || '',
      booked_at: b.booked_at || '',
      reminder_sent_at: b.reminder_sent_at || undefined,
      inspection: {
        slot_at: b.inspections?.slot_at || '',
        duration_minutes: b.inspections?.duration_minutes || 0,
        location_address: b.inspections?.location_address || undefined,
        location_notes: b.inspections?.location_notes || undefined,
        listing_id: b.inspections?.listing_id || '',
        listing: {
          title: b.inspections?.listings?.title || '',
          seller_id: b.inspections?.listings?.seller_id || '',
          material: b.inspections?.listings?.material || '',
          location_city: b.inspections?.listings?.location_city || '',
          location_province: b.inspections?.listings?.location_province || '',
          seller: {
            full_name: b.inspections?.listings?.profiles?.full_name || '',
            phone: b.inspections?.listings?.profiles?.phone || '',
            email: b.inspections?.listings?.profiles?.email || ''
          }
        }
      },
      user: {
        full_name: b.profiles?.full_name || '',
        email: b.profiles?.email || ''
      }
    };

    return await sendInspectionReminder(bookingDetails);
  } catch (error) {
    console.error('Error in sendImmediateReminder:', error);
    return false;
  }
}

/**
 * Get reminder statistics for admin dashboard
 */
export async function getReminderStats(): Promise<{
  total_bookings: number;
  reminders_sent: number;
  pending_reminders: number;
  settings: ReminderSettings;
}> {
  try {
    const settings = await getReminderSettings();
    
    // Get total active bookings
    const { count: totalBookings } = await supabaseServer
      .from('inspection_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booked')
      .gte('inspections.slot_at', new Date().toISOString());

    // Get bookings with reminders sent
    const { count: remindersSent } = await supabaseServer
      .from('inspection_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booked')
      .not('reminder_sent_at', 'is', null);

    // Get pending reminders
    const now = new Date();
    const reminderTime = new Date(now.getTime() + settings.reminder_hours_before * 60 * 60 * 1000);
    const bufferTime = new Date(reminderTime.getTime() + 30 * 60 * 1000);

    const { count: pendingReminders } = await supabaseServer
      .from('inspection_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'booked')
      .gte('inspections.slot_at', reminderTime.toISOString())
      .lte('inspections.slot_at', bufferTime.toISOString())
      .is('reminder_sent_at', null);

    return {
      total_bookings: totalBookings || 0,
      reminders_sent: remindersSent || 0,
      pending_reminders: pendingReminders || 0,
      settings
    };
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    return {
      total_bookings: 0,
      reminders_sent: 0,
      pending_reminders: 0,
      settings: await getReminderSettings()
    };
  }
}
