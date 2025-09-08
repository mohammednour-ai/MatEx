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
    const user_id = searchParams.get('user_id');
    const auction_id = searchParams.get('auction_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const min_amount = searchParams.get('min_amount');
    const max_amount = searchParams.get('max_amount');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseServer
      .from('deposits')
      .select(`
        *,
        user:profiles!deposits_user_id_fkey(id, email, full_name),
        auction:auctions(id, title, listing_id),
        refund_transaction:transactions!deposits_refund_transaction_id_fkey(id, status, amount)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (auction_id) {
      query = query.eq('auction_id', auction_id);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    if (min_amount) {
      query = query.gte('amount', parseFloat(min_amount));
    }
    if (max_amount) {
      query = query.lte('amount', parseFloat(max_amount));
    }

    // Get total count for pagination
    const { count } = await supabaseServer
      .from('deposits')
      .select('*', { count: 'exact', head: true });

    // Get paginated results
    const { data: deposits, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching deposits:', error);
      return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
    }

    // Calculate summary statistics
    const { data: stats } = await supabaseServer
      .rpc('get_deposits_summary', {
        p_status: status,
        p_user_id: user_id,
        p_auction_id: auction_id,
        p_date_from: date_from,
        p_date_to: date_to,
        p_min_amount: min_amount ? parseFloat(min_amount) : null,
        p_max_amount: max_amount ? parseFloat(max_amount) : null
      });

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      deposits,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: count || 0
      },
      summary: stats || {
        total_deposits: 0,
        total_amount: 0,
        held_amount: 0,
        refunded_amount: 0,
        forfeited_amount: 0
      }
    });

  } catch (error) {
    console.error('Error in deposits API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    const body = await request.json();
    const { action, deposit_id, reason } = body;

    if (!action || !deposit_id) {
      return NextResponse.json({
        error: 'Missing required fields: action, deposit_id'
      }, { status: 400 });
    }

    // Validate action
    const validActions = ['refund', 'forfeit', 'hold', 'release'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    // Get deposit details
    const { data: deposit, error: depositError } = await supabaseServer
      .from('deposits')
      .select(`
        *,
        user:profiles!deposits_user_id_fkey(id, email, full_name),
        auction:auctions(id, title, status, listing_id)
      `)
      .eq('id', deposit_id)
      .single();

    if (depositError || !deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // Check if action is valid for current deposit status
    const validTransitions: Record<string, string[]> = {
      'held': ['refund', 'forfeit', 'release'],
      'refunded': [],
      'forfeited': [],
      'released': []
    };

    if (!validTransitions[deposit.status]?.includes(action)) {
      return NextResponse.json({
        error: `Cannot ${action} deposit with status ${deposit.status}`
      }, { status: 400 });
    }

    let updatedDeposit;
    let auditDetails: any = { action, deposit_id, reason };

    switch (action) {
      case 'refund':
        // Process refund
        const { data: refundResult, error: refundError } = await supabaseServer
          .rpc('process_deposit_refund', {
            p_deposit_id: deposit_id,
            p_reason: reason || 'Admin refund'
          });

        if (refundError) {
          console.error('Error processing refund:', refundError);
          return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
        }

        auditDetails.refund_transaction_id = refundResult?.transaction_id;
        break;

      case 'forfeit':
        // Forfeit deposit
        const { data: forfeitResult, error: forfeitError } = await supabaseServer
          .from('deposits')
          .update({
            status: 'forfeited',
            forfeited_at: new Date().toISOString(),
            forfeit_reason: reason || 'Admin forfeit',
            updated_at: new Date().toISOString()
          })
          .eq('id', deposit_id)
          .select()
          .single();

        if (forfeitError) {
          console.error('Error forfeiting deposit:', forfeitError);
          return NextResponse.json({ error: 'Failed to forfeit deposit' }, { status: 500 });
        }

        updatedDeposit = forfeitResult;
        break;

      case 'hold':
        // Put deposit on hold
        const { data: holdResult, error: holdError } = await supabaseServer
          .from('deposits')
          .update({
            status: 'held',
            hold_reason: reason || 'Admin hold',
            updated_at: new Date().toISOString()
          })
          .eq('id', deposit_id)
          .select()
          .single();

        if (holdError) {
          console.error('Error holding deposit:', holdError);
          return NextResponse.json({ error: 'Failed to hold deposit' }, { status: 500 });
        }

        updatedDeposit = holdResult;
        break;

      case 'release':
        // Release deposit
        const { data: releaseResult, error: releaseError } = await supabaseServer
          .from('deposits')
          .update({
            status: 'released',
            released_at: new Date().toISOString(),
            release_reason: reason || 'Admin release',
            updated_at: new Date().toISOString()
          })
          .eq('id', deposit_id)
          .select()
          .single();

        if (releaseError) {
          console.error('Error releasing deposit:', releaseError);
          return NextResponse.json({ error: 'Failed to release deposit' }, { status: 500 });
        }

        updatedDeposit = releaseResult;
        break;
    }

    // Log audit trail
    await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: 'admin', // TODO: Get actual admin user ID from auth
        action: `deposit_${action}`,
        resource_type: 'deposit',
        resource_id: deposit_id,
        details: auditDetails,
        severity: action === 'forfeit' ? 'high' : 'medium'
      });

    // Get updated deposit with relations
    const { data: finalDeposit } = await supabaseServer
      .from('deposits')
      .select(`
        *,
        user:profiles!deposits_user_id_fkey(id, email, full_name),
        auction:auctions(id, title, listing_id),
        refund_transaction:transactions!deposits_refund_transaction_id_fkey(id, status, amount)
      `)
      .eq('id', deposit_id)
      .single();

    return NextResponse.json({
      success: true,
      message: `Deposit ${action} completed successfully`,
      deposit: finalDeposit || updatedDeposit
    });

  } catch (error) {
    console.error('Error in deposits POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk operations endpoint
export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add proper authentication middleware for admin routes
    // For now, using server client with service role key

    const body = await request.json();
    const { action, deposit_ids, reason } = body;

    if (!action || !deposit_ids || !Array.isArray(deposit_ids) || deposit_ids.length === 0) {
      return NextResponse.json({
        error: 'Missing required fields: action, deposit_ids (array)'
      }, { status: 400 });
    }

    const validActions = ['refund', 'forfeit', 'hold', 'release'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each deposit
    for (const deposit_id of deposit_ids) {
      try {
        // Call the single deposit endpoint logic
        const response = await fetch(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, deposit_id, reason })
        });

        const result = await response.json();

        if (response.ok) {
          results.push({ deposit_id, success: true, data: result });
        } else {
          errors.push({ deposit_id, error: result.error });
        }
      } catch (error) {
        errors.push({ deposit_id, error: 'Processing failed' });
      }
    }

    // Log bulk operation audit trail
    await supabaseServer
      .from('audit_logs')
      .insert({
        user_id: 'admin', // TODO: Get actual admin user ID from auth
        action: `bulk_deposit_${action}`,
        resource_type: 'deposit',
        resource_id: null,
        details: {
          action,
          deposit_ids,
          reason,
          successful_count: results.length,
          error_count: errors.length
        },
        severity: 'high'
      });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        successful: results,
        errors: errors,
        total_processed: deposit_ids.length,
        successful_count: results.length,
        error_count: errors.length
      }
    });

  } catch (error) {
    console.error('Error in deposits PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
