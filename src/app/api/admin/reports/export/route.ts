import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { z } from 'zod';

// Rate limiting - 5 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (userLimit.count >= 5) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Validation schema for export parameters
const ExportParamsSchema = z.object({
  report_type: z.enum(['price_trends', 'trading_volume', 'seller_performance', 'auction_summary']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  material: z.string().optional(),
  format: z.enum(['csv']).default('csv'),
  include_details: z.boolean().default(false)
});

type ExportParams = z.infer<typeof ExportParamsSchema>;

// CSV formatting utilities
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCSVRow(row: any[]): string {
  return row.map(escapeCSVField).join(',') + '\n';
}

// Report generation functions
async function generatePriceTrendsReport(supabase: any, params: ExportParams): Promise<string> {
  let query = supabase
    .from('price_trends')
    .select(`
      material,
      week_start,
      avg_price_cad,
      median_price_cad,
      min_price_cad,
      max_price_cad,
      total_volume,
      auction_count,
      updated_at
    `)
    .order('week_start', { ascending: false });

  if (params.start_date) {
    query = query.gte('week_start', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('week_start', params.end_date);
  }
  if (params.material) {
    query = query.eq('material', params.material);
  }

  const { data, error } = await query;
  if (error) throw error;

  let csv = formatCSVRow([
    'Material',
    'Week Start',
    'Average Price (CAD)',
    'Median Price (CAD)',
    'Min Price (CAD)',
    'Max Price (CAD)',
    'Total Volume',
    'Auction Count',
    'Last Updated'
  ]);

  for (const row of data || []) {
    csv += formatCSVRow([
      row.material,
      row.week_start,
      row.avg_price_cad,
      row.median_price_cad,
      row.min_price_cad,
      row.max_price_cad,
      row.total_volume,
      row.auction_count,
      row.updated_at
    ]);
  }

  return csv;
}

async function generateTradingVolumeReport(supabase: any, params: ExportParams): Promise<string> {
  // Get trading volume data from orders and auctions
  let query = supabase
    .from('orders')
    .select(`
      id,
      type,
      total_cad,
      status,
      created_at,
      listings!inner(
        title,
        material,
        quantity,
        unit,
        location_city,
        location_province
      ),
      profiles!buyer_id(
        full_name,
        company_name
      )
    `)
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: false });

  if (params.start_date) {
    query = query.gte('created_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('created_at', params.end_date);
  }

  const { data, error } = await query;
  if (error) throw error;

  let csv = formatCSVRow([
    'Order ID',
    'Type',
    'Material',
    'Listing Title',
    'Quantity',
    'Unit',
    'Total (CAD)',
    'Location',
    'Buyer',
    'Date'
  ]);

  for (const order of data || []) {
    csv += formatCSVRow([
      order.id,
      order.type,
      order.listings?.material || '',
      order.listings?.title || '',
      order.listings?.quantity || '',
      order.listings?.unit || '',
      order.total_cad,
      `${order.listings?.location_city || ''}, ${order.listings?.location_province || ''}`,
      order.profiles?.company_name || order.profiles?.full_name || '',
      order.created_at
    ]);
  }

  return csv;
}

async function generateSellerPerformanceReport(supabase: any, params: ExportParams): Promise<string> {
  // Get seller performance data
  let query = supabase
    .from('seller_reputation_scores')
    .select(`
      seller_id,
      reputation_score,
      total_orders,
      fulfilled_orders,
      fulfillment_rate,
      avg_fulfillment_days,
      dispute_count,
      cancellation_count,
      last_calculated_at,
      profiles!seller_id(
        full_name,
        company_name,
        created_at
      )
    `)
    .order('reputation_score', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let csv = formatCSVRow([
    'Seller ID',
    'Seller Name',
    'Company',
    'Reputation Score',
    'Total Orders',
    'Fulfilled Orders',
    'Fulfillment Rate (%)',
    'Avg Fulfillment Days',
    'Disputes',
    'Cancellations',
    'Member Since',
    'Last Updated'
  ]);

  for (const seller of data || []) {
    csv += formatCSVRow([
      seller.seller_id,
      seller.profiles?.full_name || '',
      seller.profiles?.company_name || '',
      seller.reputation_score,
      seller.total_orders,
      seller.fulfilled_orders,
      (seller.fulfillment_rate * 100).toFixed(2),
      seller.avg_fulfillment_days,
      seller.dispute_count,
      seller.cancellation_count,
      seller.profiles?.created_at || '',
      seller.last_calculated_at
    ]);
  }

  return csv;
}

async function generateAuctionSummaryReport(supabase: any, params: ExportParams): Promise<string> {
  // Get auction summary data
  let query = supabase
    .from('auctions')
    .select(`
      id,
      start_at,
      end_at,
      min_increment_cad,
      soft_close_seconds,
      listings!inner(
        title,
        material,
        condition,
        quantity,
        unit,
        location_city,
        location_province,
        profiles!seller_id(
          full_name,
          company_name
        )
      ),
      bids(
        amount_cad,
        created_at,
        profiles!bidder_id(
          full_name,
          company_name
        )
      )
    `)
    .order('end_at', { ascending: false });

  if (params.start_date) {
    query = query.gte('end_at', params.start_date);
  }
  if (params.end_date) {
    query = query.lte('end_at', params.end_date);
  }
  if (params.material) {
    query = query.eq('listings.material', params.material);
  }

  const { data, error } = await query;
  if (error) throw error;

  let csv = formatCSVRow([
    'Auction ID',
    'Material',
    'Listing Title',
    'Condition',
    'Quantity',
    'Unit',
    'Seller',
    'Start Date',
    'End Date',
    'Min Increment (CAD)',
    'Total Bids',
    'Winning Bid (CAD)',
    'Winner',
    'Location'
  ]);

  for (const auction of data || []) {
    const bids = auction.bids || [];
    const winningBid = bids.length > 0 ? Math.max(...bids.map((b: any) => b.amount_cad)) : 0;
    const winner = bids.find((b: any) => b.amount_cad === winningBid);

    csv += formatCSVRow([
      auction.id,
      auction.listings?.material || '',
      auction.listings?.title || '',
      auction.listings?.condition || '',
      auction.listings?.quantity || '',
      auction.listings?.unit || '',
      auction.listings?.profiles?.company_name || auction.listings?.profiles?.full_name || '',
      auction.start_at,
      auction.end_at,
      auction.min_increment_cad,
      bids.length,
      winningBid || '',
      winner ? (winner.profiles?.company_name || winner.profiles?.full_name || '') : '',
      `${auction.listings?.location_city || ''}, ${auction.listings?.location_province || ''}`
    ]);
  }

  return csv;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const userContext = request.headers.get('x-user-context');
    if (!userContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = JSON.parse(userContext);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const params = {
      report_type: url.searchParams.get('report_type'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
      material: url.searchParams.get('material'),
      format: url.searchParams.get('format') || 'csv',
      include_details: url.searchParams.get('include_details') === 'true'
    };

    const validatedParams = ExportParamsSchema.parse(params);

    // Create Supabase client
    const supabase = createServerClient();

    // Generate report based on type
    let csvData: string;
    let filename: string;

    switch (validatedParams.report_type) {
      case 'price_trends':
        csvData = await generatePriceTrendsReport(supabase, validatedParams);
        filename = `price_trends_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'trading_volume':
        csvData = await generateTradingVolumeReport(supabase, validatedParams);
        filename = `trading_volume_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'seller_performance':
        csvData = await generateSellerPerformanceReport(supabase, validatedParams);
        filename = `seller_performance_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'auction_summary':
        csvData = await generateAuctionSummaryReport(supabase, validatedParams);
        filename = `auction_summary_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Return streamed CSV response
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Export error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid parameters',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to generate report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get available report types and parameters
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const userContext = request.headers.get('x-user-context');
    if (!userContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = JSON.parse(userContext);
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const supabase = createServerClient();

    // Get available materials for filtering
    const { data: materials } = await supabase
      .from('listings')
      .select('material')
      .not('material', 'is', null);

    const uniqueMaterials = [...new Set(materials?.map(m => m.material) || [])].sort();

    // Get date ranges for reports
    const { data: dateRanges } = await supabase
      .from('orders')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const earliestDate = dateRanges?.[0]?.created_at || new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: {
        report_types: [
          {
            id: 'price_trends',
            name: 'Price Trends',
            description: 'Weekly price trends by material type'
          },
          {
            id: 'trading_volume',
            name: 'Trading Volume',
            description: 'Completed transactions and volumes'
          },
          {
            id: 'seller_performance',
            name: 'Seller Performance',
            description: 'Seller reputation and performance metrics'
          },
          {
            id: 'auction_summary',
            name: 'Auction Summary',
            description: 'Auction results and bidding activity'
          }
        ],
        filters: {
          materials: uniqueMaterials,
          date_range: {
            earliest: earliestDate,
            latest: new Date().toISOString()
          }
        }
      }
    });

  } catch (error) {
    console.error('Report info error:', error);
    return NextResponse.json({
      error: 'Failed to get report information',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
