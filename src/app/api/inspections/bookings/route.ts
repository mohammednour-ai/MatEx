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
    type BookingShape = {
      id?: string;
      inspection_id?: string;
      status?: string;
      notes?: string;
      booked_at?: string;
      cancelled_at?: string | null;
      inspections?: {
        slot_at?: string;
        capacity?: number;
        duration_minutes?: number;
        location_address?: string;
        location_notes?: string;
        listing_id?: string;
        listings?: {
          title?: string;
          material?: string;
          location_city?: string;
          location_province?: string;
          profiles?: { full_name?: string; phone?: string; email?: string };
        };
      };
    };

    const transformedBookings = bookings?.map((booking: unknown) => {
      const b = booking as BookingShape;
      return {
        booking_id: b.id,
        inspection_id: b.inspection_id,
        status: b.status,
        notes: b.notes,
        booked_at: b.booked_at,
        cancelled_at: b.cancelled_at,
        inspection: {
          slot_at: b.inspections?.slot_at,
          capacity: b.inspections?.capacity,
          duration_minutes: b.inspections?.duration_minutes,
          location_address: b.inspections?.location_address,
          location_notes: b.inspections?.location_notes,
          listing: {
            id: b.inspections?.listing_id,
            title: b.inspections?.listings?.title,
            material: b.inspections?.listings?.material,
            location: `${b.inspections?.listings?.location_city}, ${b.inspections?.listings?.location_province}`,
            seller: {
              name: b.inspections?.listings?.profiles?.full_name,
              phone: b.inspections?.listings?.profiles?.phone,
              email: b.inspections?.listings?.profiles?.email
            }
          }
        }
      };
    }) || [];

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
