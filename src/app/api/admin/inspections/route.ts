import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const inspector_id = searchParams.get('inspector_id');
    const listing_id = searchParams.get('listing_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseServer
      .from('inspections')
      .select(`
        *,
        listing:listings(id, title, seller_id),
        inspector:profiles!inspections_inspector_id_fkey(id, email, full_name),
        seller:profiles!inspections_seller_id_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (inspector_id) {
      query = query.eq('inspector_id', inspector_id);
    }
    if (listing_id) {
      query = query.eq('listing_id', listing_id);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Get total count for pagination
    const { count } = await supabaseServer
      .from('inspections')
      .select('*', { count: 'exact', head: true });

    // Get paginated results
    const { data: inspections, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching inspections:', error);
      return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      inspections,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: count || 0
      }
    });

  } catch (error) {
    console.error('Error in inspections API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    const body = await request.json();
    const { listing_id, inspector_id, scheduled_date, notes } = body;

    // Validate required fields
    if (!listing_id || !inspector_id || !scheduled_date) {
      return NextResponse.json({
        error: 'Missing required fields: listing_id, inspector_id, scheduled_date'
      }, { status: 400 });
    }

    // Verify listing exists
    const { data: listing } = await supabaseServer
      .from('listings')
      .select('id, seller_id')
      .eq('id', listing_id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Verify inspector exists and has inspector role
    const { data: inspector } = await supabaseServer
      .from('profiles')
      .select('id, role')
      .eq('id', inspector_id)
      .single();

    if (!inspector || inspector.role !== 'inspector') {
      return NextResponse.json({ error: 'Invalid inspector' }, { status: 400 });
    }

    // Create inspection
    const { data: inspection, error } = await supabaseServer
      .from('inspections')
      .insert({
        listing_id,
        seller_id: listing.seller_id,
        inspector_id,
        scheduled_date,
        notes: notes || null,
        status: 'scheduled',
        created_by: 'admin' // TODO: Get actual admin user ID from auth
      })
      .select(`
        *,
        listing:listings(id, title, seller_id),
        inspector:profiles!inspections_inspector_id_fkey(id, email, full_name),
        seller:profiles!inspections_seller_id_fkey(id, email, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating inspection:', error);
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
    }

    // Log audit trail
    await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: 'admin', // TODO: Get actual admin user ID from auth
        action: 'create_inspection',
        resource_type: 'inspection',
        resource_id: inspection.id,
        details: {
          listing_id,
          inspector_id,
          scheduled_date
        },
        severity: 'medium'
      });

    return NextResponse.json(inspection, { status: 201 });

  } catch (error) {
    console.error('Error in inspections POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
