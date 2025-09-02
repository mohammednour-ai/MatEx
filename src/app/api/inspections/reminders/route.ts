import { NextRequest, NextResponse } from 'next/server';
import { processInspectionReminders, sendImmediateReminder, getReminderStats } from '@/lib/inspection-reminders';
import { allowRequest, getRateLimitStatus } from '@/lib/rateLimiter';
import { z } from 'zod';

// Zod schema for immediate reminder request
const ImmediateReminderSchema = z.object({
  booking_id: z.string().uuid()
});

// GET /api/inspections/reminders - Get reminder statistics
export async function GET(request: NextRequest) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`reminder_stats:${ip}`, 10, 60_000)) {
      const status = getRateLimitStatus(`reminder_stats:${ip}`, 10, 60_000);
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

    // Only allow admin users to view reminder stats
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get reminder statistics
    const stats = await getReminderStats();

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Reminder statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error in GET reminder stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/inspections/reminders - Process all pending reminders
export async function POST(request: NextRequest) {
  try {
    // Rate limiting per IP (more restrictive for processing)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`reminder_process:${ip}`, 2, 300_000)) { // 2 requests per 5 minutes
      const status = getRateLimitStatus(`reminder_process:${ip}`, 2, 300_000);
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

    // Only allow admin users to trigger reminder processing
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log(`Manual reminder processing triggered by admin user ${userId}`);

    // Process all pending reminders
    const result = await processInspectionReminders();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Reminder processing completed: ${result.successful} successful, ${result.failed} failed out of ${result.processed} total`
    });

  } catch (error) {
    console.error('Error in POST reminder processing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/inspections/reminders - Send immediate reminder for specific booking
export async function PUT(request: NextRequest) {
  try {
    // Rate limiting per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!allowRequest(`immediate_reminder:${ip}`, 5, 60_000)) {
      const status = getRateLimitStatus(`immediate_reminder:${ip}`, 5, 60_000);
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
    const raw = await request.json().catch(() => ({}));
    const parsed = ImmediateReminderSchema.safeParse(raw);
    
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

    const { booking_id } = parsed.data;

    // Only allow admin users or the booking owner to send immediate reminders
    if (userRole !== 'admin') {
      // For non-admin users, verify they own the booking
      const { supabaseServer } = await import('@/lib/supabaseServer');
      const { data: booking } = await supabaseServer
        .from('inspection_bookings')
        .select('user_id')
        .eq('id', booking_id)
        .single();

      if (!booking || booking.user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only send reminders for your own bookings' },
          { status: 403 }
        );
      }
    }

    console.log(`Immediate reminder requested for booking ${booking_id} by user ${userId}`);

    // Send immediate reminder
    const success = await sendImmediateReminder(booking_id);

    if (success) {
      return NextResponse.json({
        success: true,
        data: { booking_id },
        message: 'Immediate reminder sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send immediate reminder' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in PUT immediate reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
