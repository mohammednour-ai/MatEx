import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reminder settings (default 24 hours before)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'inspections.reminder_hours_before');

    const reminderHours = settings?.[0]?.value || 24;
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + reminderHours);

    // Find inspection bookings that need reminders
    const { data: bookings, error: bookingsError } = await supabase
      .from('inspection_bookings')
      .select(`
        id,
        user_id,
        reminder_sent_at,
        inspections!inner(
          id,
          slot_at,
          location_address,
          listings!inner(
            id,
            title,
            seller_id,
            profiles!inner(
              id,
              full_name,
              phone
            )
          )
        ),
        profiles!inspection_bookings_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'booked')
      .is('reminder_sent_at', null)
      .gte('inspections.slot_at', new Date().toISOString())
      .lte('inspections.slot_at', reminderTime.toISOString());

    if (bookingsError) {
      console.error('Error fetching inspection bookings:', bookingsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const processedReminders = [];

    for (const booking of bookings || []) {
      try {
        const inspection = (booking.inspections as any);
        const listing = inspection.listings;
        const seller = listing.profiles;
        const buyer = (booking.profiles as any);

        // Create notification for buyer
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            type: 'info',
            title: 'Inspection Reminder',
            message: `Your inspection for "${listing.title}" is scheduled for ${new Date(inspection.slot_at).toLocaleString()}`,
            link: `/listings/${listing.id}`,
            metadata: {
              inspection_id: inspection.id,
              listing_id: listing.id,
              seller_name: seller.full_name,
              seller_phone: seller.phone,
              location: inspection.location_address
            },
            created_at: new Date().toISOString()
          });

        if (notificationError) {
          console.error(`Error creating notification for booking ${booking.id}:`, notificationError);
          continue;
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('inspection_bookings')
          .update({
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Error updating booking ${booking.id}:`, updateError);
          continue;
        }

        processedReminders.push({
          booking_id: booking.id,
          buyer_name: buyer.full_name,
          listing_title: listing.title,
          inspection_time: inspection.slot_at,
          reminder_sent_at: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error processing reminder for booking ${booking.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed_count: processedReminders.length,
      processed_reminders: processedReminders,
      reminder_hours_before: reminderHours,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
