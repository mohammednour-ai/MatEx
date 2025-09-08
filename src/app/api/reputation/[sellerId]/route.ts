import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET /api/reputation/[sellerId] - Get seller reputation score and details
export async function GET(
  request: NextRequest,
  { params }: { params: { sellerId: string } }
) {
  try {
    const { sellerId } = params;

    // Validate sellerId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sellerId)) {
      return NextResponse.json(
        { error: 'Invalid seller ID format' },
        { status: 400 }
      );
    }

    // Call the database function to get reputation with auto-refresh
    const { data, error } = await supabaseServer
      .rpc('get_seller_reputation', { seller_user_id: sellerId });

    if (error) {
      console.error('Error fetching seller reputation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch seller reputation' },
        { status: 500 }
      );
    }

    // If no data found, return default neutral reputation
    if (!data || data.length === 0) {
      return NextResponse.json({
        seller_id: sellerId,
        score: 3.0,
        total_orders: 0,
        fulfilled_orders: 0,
        fulfillment_rate: 0,
        avg_fulfillment_days: null,
        dispute_count: 0,
        cancellation_count: 0,
        badge_level: 'fair',
        last_calculated_at: new Date().toISOString()
      });
    }

    const reputation = data[0];

    return NextResponse.json({
      seller_id: reputation.seller_id,
      score: parseFloat(reputation.score),
      total_orders: reputation.total_orders,
      fulfilled_orders: reputation.fulfilled_orders,
      fulfillment_rate: parseFloat(reputation.fulfillment_rate || '0'),
      avg_fulfillment_days: reputation.avg_fulfillment_days ? parseFloat(reputation.avg_fulfillment_days) : null,
      dispute_count: reputation.dispute_count,
      cancellation_count: reputation.cancellation_count,
      badge_level: reputation.badge_level,
      last_calculated_at: reputation.last_calculated_at
    });

  } catch (error) {
    console.error('Unexpected error in reputation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reputation/[sellerId] - Force refresh seller reputation (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { sellerId: string } }
) {
  try {
    const { sellerId } = params;

    // Validate sellerId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sellerId)) {
      return NextResponse.json(
        { error: 'Invalid seller ID format' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile to check admin role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Force update the reputation score
    const { error: updateError } = await supabaseServer
      .rpc('update_seller_reputation_score', { seller_user_id: sellerId });

    if (updateError) {
      console.error('Error updating seller reputation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update seller reputation' },
        { status: 500 }
      );
    }

    // Get the updated reputation data
    const { data, error } = await supabaseServer
      .rpc('get_seller_reputation', { seller_user_id: sellerId });

    if (error) {
      console.error('Error fetching updated seller reputation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch updated seller reputation' },
        { status: 500 }
      );
    }

    const reputation = data[0];

    return NextResponse.json({
      message: 'Seller reputation updated successfully',
      reputation: {
        seller_id: reputation.seller_id,
        score: parseFloat(reputation.score),
        total_orders: reputation.total_orders,
        fulfilled_orders: reputation.fulfilled_orders,
        fulfillment_rate: parseFloat(reputation.fulfillment_rate || '0'),
        avg_fulfillment_days: reputation.avg_fulfillment_days ? parseFloat(reputation.avg_fulfillment_days) : null,
        dispute_count: reputation.dispute_count,
        cancellation_count: reputation.cancellation_count,
        badge_level: reputation.badge_level,
        last_calculated_at: reputation.last_calculated_at
      }
    });

  } catch (error) {
    console.error('Unexpected error in reputation refresh API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
