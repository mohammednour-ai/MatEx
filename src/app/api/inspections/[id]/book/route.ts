import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';

// Zod schema for booking inspection
const BookInspectionSchema = z.object({
  notes: z.string().max(500).optional()
});

// Helper function to send notifications
async function sendInspectionNotifications(
  inspectionId: string,
  bookingId: string,
  type: 'booked' | 'cancelled',
  buyerId: string,
  sellerId: string
) {
  try {
    // Get inspection and listing details for notification context
    const { data: inspectionData } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        listings!inner(
          title,
          seller_id,
          profiles!seller_id(full_name, email)
        )
      `)
      .eq('id', inspectionId)
      .single();

    // Get buyer details
    const { data: buyerProfile } = await supabaseServer
      .from('profiles')
      .select('full_name, email')
      .eq('id', buyerId)
      .single();

    if (!inspectionData || !buyerProfile) {
      console.error('Failed to get inspection or buyer data for notifications');
      return;
    }

    const listing = inspectionData.listings;
    const seller = listing.profiles;
    const slotTime = new Date(inspectionData.slot_at).toLocaleString();

    // Notification for buyer
    const buyerNotification = {
      user_id: buyerId,
      type: type === 'booked' ? 'success' : 'info',
      title: type === 'booked' ? 'Inspection Booked' : 'Inspection Cancelled',
      message: type === 'booked' 
        ? `Your inspection for "${listing.title}" is confirmed for ${slotTime}`
        : `Your inspection for "${listing.title}" scheduled for ${slotTime} has been cancelled`,
      link: `/listings/${inspectionData.listing_id}`,
      is_read: false
    };

    // Notification for seller
    const sellerNotification = {
      user_id: sellerId,
      type: 'info',
      title: type === 'booked' ? 'New Inspection Booking' : 'Inspection Cancelled',
      message: type === 'booked'
        ? `${buyerProfile.full_name} booked an inspection for "${listing.title}" on ${slotTime}`
        : `${buyerProfile.full_name} cancelled their inspection for "${listing.title}" scheduled for ${slotTime}`,
      link: `/listings/${inspectionData.listing_id}`,
      is_read: false
    };

    // Insert notifications
    await supabaseServer
      .from('notifications')
      .insert([buyerNotification, sellerNotification]);

    console.log(`Inspection ${type} notifications sent successfully`);
  } catch (error) {
    console.error(`Error sending inspection ${type} notifications:`, error);
  }
}

// POST /api/inspections/[id]/book - Book an inspection slot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`inspection_book:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(`inspection_book:${ip}`, 5, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() },
        { status: 429 }
      );
    }

    const inspectionId = params.id;
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    
    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const raw = await request.json().catch(() => ({}));
    const parsed = BookInspectionSchema.safeParse(raw);
    
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const msg = [
        ...(flat.formErrors || []),
        ...Object.values(flat.fieldErrors || {}).flatMap(v => v || [])
      ].join('; ');
      return NextResponse.json(
        { success: false, error: 'Validation failed', message: msg || 'Invalid request data' },
        { status: 400 }
      );
    }

    const bookingData = parsed.data;

    // Get inspection details and verify it exists and is active
    const { data: inspection, error: inspectionError } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        listings!inner(
          seller_id,
          title,
          status
        )
      `)
      .eq('id', inspectionId)
      .eq('is_active', true)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot not found or inactive' },
        { status: 404 }
      );
    }

    // Verify listing is active
    if (inspection.listings.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Cannot book inspection for inactive listing' },
        { status: 400 }
      );
    }

    // Prevent seller from booking their own inspection
    if (inspection.listings.seller_id === userId) {
      return NextResponse.json(
        { success: false, error: 'Sellers cannot book inspections for their own listings' },
        { status: 403 }
      );
    }

    // Verify slot is in the future
    const slotTime = new Date(inspection.slot_at);
    const now = new Date();
    
    if (slotTime <= now) {
      return NextResponse.json(
        { success: false, error: 'Cannot book inspection slots in the past' },
        { status: 400 }
      );
    }

    // Check if user already has a booking for this inspection
    const { data: existingBooking } = await supabaseServer
      .from('inspection_bookings')
      .select('id, status')
      .eq('inspection_id', inspectionId)
      .eq('user_id', userId)
      .in('status', ['booked'])
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'You already have a booking for this inspection slot' },
        { status: 400 }
      );
    }

    // Check available capacity
    const { data: activeBookings } = await supabaseServer
      .from('inspection_bookings')
      .select('id')
      .eq('inspection_id', inspectionId)
      .eq('status', 'booked');

    const currentBookings = activeBookings?.length || 0;
    
    if (currentBookings >= inspection.capacity) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot is fully booked' },
        { status: 400 }
      );
    }

    // Create the booking
    const { data: newBooking, error: bookingError } = await supabaseServer
      .from('inspection_bookings')
      .insert({
        inspection_id: inspectionId,
        user_id: userId,
        status: 'booked',
        notes: bookingData.notes,
        booked_at: new Date().toISOString()
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating inspection booking:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Send notifications asynchronously
    sendInspectionNotifications(
      inspectionId,
      newBooking.id,
      'booked',
      userId,
      inspection.listings.seller_id
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        booking_id: newBooking.id,
        inspection_id: inspectionId,
        slot_at: inspection.slot_at,
        status: 'booked',
        remaining_capacity: inspection.capacity - currentBookings - 1
      },
      message: 'Inspection booked successfully'
    });

  } catch (error) {
    console.error('Error in POST inspection booking:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/inspections/[id]/book - Cancel an inspection booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`inspection_cancel:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(`inspection_cancel:${ip}`, 5, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() },
        { status: 429 }
      );
    }

    const inspectionId = params.id;
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the user's booking for this inspection
    const { data: booking, error: bookingError } = await supabaseServer
      .from('inspection_bookings')
      .select(`
        *,
        inspections!inner(
          slot_at,
          listing_id,
          listings!inner(
            seller_id,
            title
          )
        )
      `)
      .eq('inspection_id', inspectionId)
      .eq('user_id', userId)
      .eq('status', 'booked')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: 'No active booking found for this inspection' },
        { status: 404 }
      );
    }

    // Check if inspection is in the past (cannot cancel past inspections)
    const slotTime = new Date(booking.inspections.slot_at);
    const now = new Date();
    
    if (slotTime <= now) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel inspections that have already occurred' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabaseServer
      .from('inspection_bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Error cancelling inspection booking:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Send notifications asynchronously
    sendInspectionNotifications(
      inspectionId,
      booking.id,
      'cancelled',
      userId,
      booking.inspections.listings.seller_id
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        booking_id: booking.id,
        inspection_id: inspectionId,
        status: 'cancelled'
      },
      message: 'Inspection booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error in DELETE inspection booking:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
