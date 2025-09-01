import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET /api/inspections/bookings - Get user's inspection bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'booked';
    const upcoming = searchParams.get('upcoming') === 'true';
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let query = supabaseServer
      .from('inspection_bookings')
      .select(`
        *,
        inspections!inner(
          id,
          slot_at,
          capacity,
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
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter for upcoming inspections only
    if (upcoming) {
      const now = new Date().toISOString();
      query = query.gte('inspections.slot_at', now);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching inspection bookings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inspection bookings' },
        { status: 500 }
      );
    }

    // Transform the data for easier consumption
    const transformedBookings = bookings?.map(booking => ({
      booking_id: booking.id,
      inspection_id: booking.inspection_id,
      status: booking.status,
      notes: booking.notes,
      booked_at: booking.booked_at,
      cancelled_at: booking.cancelled_at,
      inspection: {
        slot_at: booking.inspections.slot_at,
        capacity: booking.inspections.capacity,
        duration_minutes: booking.inspections.duration_minutes,
        location_address: booking.inspections.location_address,
        location_notes: booking.inspections.location_notes,
        listing: {
          id: booking.inspections.listing_id,
          title: booking.inspections.listings.title,
          material: booking.inspections.listings.material,
          location: `${booking.inspections.listings.location_city}, ${booking.inspections.listings.location_province}`,
          seller: {
            name: booking.inspections.listings.profiles.full_name,
            phone: booking.inspections.listings.profiles.phone,
            email: booking.inspections.listings.profiles.email
          }
        }
      }
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedBookings,
      total: transformedBookings.length
    });

  } catch (error) {
    console.error('Error in GET inspection bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
