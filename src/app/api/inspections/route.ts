import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';

// Zod schema for creating inspection slots
const CreateInspectionSchema = z.object({
  listing_id: z.string().uuid(),
  slot_at: z.string().datetime(),
  capacity: z.number().int().min(1).max(50),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  location_address: z.string().min(1).max(500).optional(),
  location_notes: z.string().max(1000).optional()
});

// Zod schema for updating inspection slots
const UpdateInspectionSchema = z.object({
  slot_at: z.string().datetime().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  location_address: z.string().min(1).max(500).optional(),
  location_notes: z.string().max(1000).optional(),
  is_active: z.boolean().optional()
});

interface InspectionSlot {
  id: string;
  listing_id: string;
  slot_at: string;
  capacity: number;
  duration_minutes: number;
  location_address?: string;
  location_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  available_capacity?: number;
  bookings_count?: number;
}

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

  const settingsMap = settings?.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>) || {};

  return {
    default_duration_minutes: settingsMap['inspections.default_duration_minutes'] || 60,
    max_slots_per_listing: settingsMap['inspections.max_slots_per_listing'] || 10,
    min_buffer_minutes: settingsMap['inspections.min_buffer_minutes'] || 30,
    max_advance_days: settingsMap['inspections.max_advance_days'] || 30
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

// GET /api/inspections - Get inspection slots for a listing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');
    
    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listing_id parameter is required' },
        { status: 400 }
      );
    }
    
    // Get user context from headers
    const userId = request.headers.get('x-user-id');
    
    // Get inspection slots with booking counts
    const { data: inspections, error } = await supabaseServer
      .from('inspections')
      .select(`
        *,
        inspection_bookings!inner(
          id,
          status
        )
      `)
      .eq('listing_id', listingId)
      .eq('is_active', true)
      .order('slot_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching inspections:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inspection slots' },
        { status: 500 }
      );
    }
    
    // Calculate available capacity for each slot
    const slotsWithCapacity = inspections?.map(inspection => {
      const activeBookings = inspection.inspection_bookings?.filter(
        (booking: any) => booking.status === 'booked'
      ).length || 0;
      
      return {
        ...inspection,
        bookings_count: activeBookings,
        available_capacity: inspection.capacity - activeBookings,
        inspection_bookings: undefined // Remove detailed bookings from response
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      data: slotsWithCapacity,
      total: slotsWithCapacity.length
    });
    
  } catch (error) {
    console.error('Error in GET inspections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/inspections - Create new inspection slot
export async function POST(request: NextRequest) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`inspections_post:${ip}`, 10, 60_000)) {
      const status = getRateLimitStatus(`inspections_post:${ip}`, 10, 60_000);
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retry_after_ms: status.reset - Date.now() },
        { status: 429 }
      );
    }
    
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
    const parsed = CreateInspectionSchema.safeParse(raw);
    
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
    
    const inspectionData = parsed.data;
    
    // Verify user owns the listing
    const { data: listing, error: listingError } = await supabaseServer
      .from('listings')
      .select('seller_id, title')
      .eq('id', inspectionData.listing_id)
      .single();
      
    if (listingError || !listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }
    
    if (listing.seller_id !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only the listing owner can create inspection slots' },
        { status: 403 }
      );
    }
    
    // Get inspection settings
    const settings = await getInspectionSettings();
    const durationMinutes = inspectionData.duration_minutes || settings.default_duration_minutes;
    
    // Validate slot time is in the future
    const slotTime = new Date(inspectionData.slot_at);
    const now = new Date();
    
    if (slotTime <= now) {
      return NextResponse.json(
        { success: false, error: 'Inspection slot must be in the future' },
        { status: 400 }
      );
    }
    
    // Validate slot time is not too far in advance
    const maxAdvanceMs = settings.max_advance_days * 24 * 60 * 60 * 1000;
    if (slotTime.getTime() - now.getTime() > maxAdvanceMs) {
      return NextResponse.json(
        { success: false, error: `Inspection slots cannot be more than ${settings.max_advance_days} days in advance` },
        { status: 400 }
      );
    }
    
    // Check maximum slots per listing
    const { count: existingCount } = await supabaseServer
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', inspectionData.listing_id)
      .eq('is_active', true);
      
    if (existingCount && existingCount >= settings.max_slots_per_listing) {
      return NextResponse.json(
        { success: false, error: `Maximum ${settings.max_slots_per_listing} inspection slots allowed per listing` },
        { status: 400 }
      );
    }
    
    // Validate time overlaps
    const overlapValidation = await validateTimeOverlaps(
      inspectionData.listing_id,
      inspectionData.slot_at,
      durationMinutes
    );
    
    if (!overlapValidation.isValid) {
      return NextResponse.json(
        { success: false, error: overlapValidation.error },
        { status: 400 }
      );
    }
    
    // Create the inspection slot
    const { data: newInspection, error: createError } = await supabaseServer
      .from('inspections')
      .insert({
        listing_id: inspectionData.listing_id,
        slot_at: inspectionData.slot_at,
        capacity: inspectionData.capacity,
        duration_minutes: durationMinutes,
        location_address: inspectionData.location_address,
        location_notes: inspectionData.location_notes,
        is_active: true
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating inspection slot:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create inspection slot' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...newInspection,
        bookings_count: 0,
        available_capacity: newInspection.capacity
      },
      message: 'Inspection slot created successfully'
    });
    
  } catch (error) {
    console.error('Error in POST inspections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
