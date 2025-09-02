import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';

type RouteContextParams = { params?: Record<string, string | undefined> | Promise<Record<string, string | undefined>> };

type BookingRow = { status?: string };

// Zod schema for updating inspection slots
const UpdateInspectionSchema = z.object({
  slot_at: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  location_address: z.string().min(1).max(500).optional(),
  location_notes: z.string().max(1000).optional(),
  is_active: z.boolean().optional()
});

// Helper function to get inspection settings from app_settings
async function getInspectionSettings() {
  const { data: settings } = await supabaseServer
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'inspections.default_duration_minutes',
      'inspections.max_slots_per_listing',
      'inspections.min_buffer_minutes',
      'inspections.max_advance_days'
    ]);

  const settingsMap = (settings || []).reduce((acc: Record<string, unknown>, setting: unknown) => {
    const s = setting as { key?: string; value?: unknown };
    if (s.key) acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, unknown>);

  const toNumber = (v: unknown, fallback: number) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  return {
    default_duration_minutes: toNumber(settingsMap['inspections.default_duration_minutes'], 60),
    max_slots_per_listing: toNumber(settingsMap['inspections.max_slots_per_listing'], 10),
    min_buffer_minutes: toNumber(settingsMap['inspections.min_buffer_minutes'], 30),
    max_advance_days: toNumber(settingsMap['inspections.max_advance_days'], 30)
  };
}

// Helper function to validate time overlaps
async function validateTimeOverlaps(
  listingId: string, 
  slotAt: string, 
  durationMinutes: number, 
  excludeInspectionId?: string
) {
  const slotStart = new Date(slotAt);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
  
  // Get inspection settings for buffer time
  const settings = await getInspectionSettings();
  const bufferMs = settings.min_buffer_minutes * 60000;
  
  // Check for overlapping slots (including buffer time)
  const bufferStart = new Date(slotStart.getTime() - bufferMs);
  const bufferEnd = new Date(slotEnd.getTime() + bufferMs);
  
  let query = supabaseServer
    .from('inspections')
    .select('id, slot_at, duration_minutes')
    .eq('listing_id', listingId)
    .eq('is_active', true)
    .gte('slot_at', bufferStart.toISOString())
    .lte('slot_at', bufferEnd.toISOString());
    
  if (excludeInspectionId) {
    query = query.neq('id', excludeInspectionId);
  }
  
  const { data: overlapping } = await query;
  
  if (overlapping && overlapping.length > 0) {
    // Check each overlapping slot for actual time conflict
    for (const slot of overlapping) {
      const existingStart = new Date(slot.slot_at);
      const existingEnd = new Date(existingStart.getTime() + slot.duration_minutes * 60000);
      
      // Check if there's actual overlap (with buffer)
      if (bufferStart < existingEnd && bufferEnd > existingStart) {
        return {
          isValid: false,
          error: `Time slot conflicts with existing inspection at ${existingStart.toLocaleString()}. Minimum ${settings.min_buffer_minutes} minute buffer required.`
        };
      }
    }
  }
  
  return { isValid: true };
}

// GET /api/inspections/[id] - Get specific inspection slot
export async function GET(
  request: NextRequest,
  context: RouteContextParams
) {
  try {
  const inspectionId = (await Promise.resolve(context?.params || {})).id;
    
    // Get user context from headers
    // user id is available via header when needed
    
    // Get inspection slot with booking details
    const { data: inspection, error } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        listings!inner(
          id,
          title,
          seller_id
        ),
        inspection_bookings(
          id,
          user_id,
          status,
          booked_at,
          profiles!inner(
            full_name
          )
        )
      `)
      .eq('id', inspectionId)
      .single();
      
    if (error || !inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot not found' },
        { status: 404 }
      );
    }
    
    // Calculate booking statistics
    const activeBookings = inspection.inspection_bookings?.filter(
      (booking: unknown) => (booking as BookingRow).status === 'booked'
    ).length || 0;
    
    const responseData = {
      ...inspection,
      bookings_count: activeBookings,
      available_capacity: inspection.capacity - activeBookings
    };
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error in GET inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/inspections/[id] - Update inspection slot
export async function PUT(
  request: NextRequest,
  context: RouteContextParams
) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`inspections_put:${ip}`, 10, 60_000)) {
      const status = getRateLimitStatus(`inspections_put:${ip}`, 10, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() },
        { status: 429 }
      );
    }
    
  const inspectionId = (await Promise.resolve(context?.params || {})).id;
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const raw = await request.json().catch(() => null);
    const parsed = UpdateInspectionSchema.safeParse(raw);
    
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
    
    const updateData = parsed.data;
    
    // Get existing inspection and verify ownership
    const { data: existingInspection, error: fetchError } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        listings!inner(
          seller_id,
          title
        ),
        inspection_bookings!inner(
          id,
          status
        )
      `)
      .eq('id', inspectionId)
      .single();
      
    if (fetchError || !existingInspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot not found' },
        { status: 404 }
      );
    }
    
    if (existingInspection.listings.seller_id !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only the listing owner can update inspection slots' },
        { status: 403 }
      );
    }
    
    // Check if there are active bookings when trying to modify time/capacity
    const activeBookings = existingInspection.inspection_bookings?.filter(
      (booking: unknown) => (booking as BookingRow).status === 'booked'
    ).length || 0;
    
    if (activeBookings > 0) {
      // Prevent changes that could affect existing bookings
      if (updateData.slot_at || (updateData.capacity && updateData.capacity < activeBookings)) {
        return NextResponse.json(
          { success: false, error: `Cannot modify time or reduce capacity below ${activeBookings} due to existing bookings` },
          { status: 400 }
        );
      }
    }
    
    // Validate time changes if slot_at is being updated
    if (updateData.slot_at) {
      const slotTime = new Date(updateData.slot_at);
      const now = new Date();
      
      if (slotTime <= now) {
        return NextResponse.json(
          { success: false, error: 'Inspection slot must be in the future' },
          { status: 400 }
        );
      }
      
      // Get inspection settings for validation
      const settings = await getInspectionSettings();
      const maxAdvanceMs = settings.max_advance_days * 24 * 60 * 60 * 1000;
      
      if (slotTime.getTime() - now.getTime() > maxAdvanceMs) {
        return NextResponse.json(
          { success: false, error: `Inspection slots cannot be more than ${settings.max_advance_days} days in advance` },
          { status: 400 }
        );
      }
      
      // Validate time overlaps with updated duration
      const durationMinutes = updateData.duration_minutes || existingInspection.duration_minutes;
      const overlapValidation = await validateTimeOverlaps(
        existingInspection.listing_id,
        updateData.slot_at,
        durationMinutes,
        inspectionId
      );
      
      if (!overlapValidation.isValid) {
        return NextResponse.json(
          { success: false, error: overlapValidation.error },
          { status: 400 }
        );
      }
    }
    
    // Update the inspection slot
    const { data: updatedInspection, error: updateError } = await supabaseServer
      .from('inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating inspection slot:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update inspection slot' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedInspection,
        bookings_count: activeBookings,
        available_capacity: updatedInspection.capacity - activeBookings
      },
      message: 'Inspection slot updated successfully'
    });
    
  } catch (error) {
    console.error('Error in PUT inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/inspections/[id] - Delete/deactivate inspection slot
export async function DELETE(
  request: NextRequest,
  context: RouteContextParams
) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`inspections_delete:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(`inspections_delete:${ip}`, 5, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() },
        { status: 429 }
      );
    }
    
  const inspectionId = (await Promise.resolve(context?.params || {})).id;
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get existing inspection and verify ownership
    const { data: existingInspection, error: fetchError } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        listings!inner(
          seller_id,
          title
        ),
        inspection_bookings!inner(
          id,
          status
        )
      `)
      .eq('id', inspectionId)
      .single();
      
    if (fetchError || !existingInspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot not found' },
        { status: 404 }
      );
    }
    
    if (existingInspection.listings.seller_id !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only the listing owner can delete inspection slots' },
        { status: 403 }
      );
    }
    
    // Check if there are active bookings
    const activeBookings = existingInspection.inspection_bookings?.filter(
      (booking: unknown) => (booking as BookingRow).status === 'booked'
    ).length || 0;
    
    if (activeBookings > 0) {
      // Instead of hard delete, deactivate the slot
      const { data: deactivatedInspection, error: deactivateError } = await supabaseServer
        .from('inspections')
        .update({ is_active: false })
        .eq('id', inspectionId)
        .select()
        .single();
        
      if (deactivateError) {
        console.error('Error deactivating inspection slot:', deactivateError);
        return NextResponse.json(
          { success: false, error: 'Failed to deactivate inspection slot' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: deactivatedInspection,
        message: `Inspection slot deactivated due to ${activeBookings} existing booking(s)`
      });
    }
    
    // No active bookings, safe to delete
    const { error: deleteError } = await supabaseServer
      .from('inspections')
      .delete()
      .eq('id', inspectionId);
      
    if (deleteError) {
      console.error('Error deleting inspection slot:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete inspection slot' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Inspection slot deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in DELETE inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
