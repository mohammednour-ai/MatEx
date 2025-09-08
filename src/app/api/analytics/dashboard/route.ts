import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

interface DashboardMetrics {
  active_auctions: number;
  weekly_trading_volume: number;
  new_sellers_count: number;
  returning_buyers_count: number;
  total_materials: number;
  avg_auction_value: number;
  completion_rate: number;
  last_updated: string;
}

interface TradingVolumeData {
  week_start: string;
  total_volume: number;
  auction_count: number;
  avg_value: number;
  unique_sellers: number;
  unique_buyers: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '4'; // Default 4 weeks
    const includeHistory = searchParams.get('history') === 'true';

    // Validate period parameter
    const periodNum = parseInt(period);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 52) {
      return NextResponse.json(
        { error: 'Period must be between 1 and 52 weeks' },
        { status: 400 }
      );
    }

    // Get dashboard metrics with caching
    const { data: metricsData, error: metricsError } = await supabaseServer
      .rpc('get_dashboard_metrics');

    if (metricsError) {
      console.error('Error fetching dashboard metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard metrics' },
        { status: 500 }
      );
    }

    const metrics: DashboardMetrics = metricsData || {
      active_auctions: 0,
      weekly_trading_volume: 0,
      new_sellers_count: 0,
      returning_buyers_count: 0,
      total_materials: 0,
      avg_auction_value: 0,
      completion_rate: 0,
      last_updated: new Date().toISOString()
    };

    let response: any = {
      metrics,
      period: periodNum,
      generated_at: new Date().toISOString()
    };

    // Include historical data if requested
    if (includeHistory) {
      const { data: historyData, error: historyError } = await supabaseServer
        .rpc('get_trading_volume_history', { weeks_back: periodNum });

      if (historyError) {
        console.error('Error fetching trading volume history:', historyError);
        // Don't fail the entire request, just exclude history
        response.history = [];
        response.history_error = 'Failed to fetch historical data';
      } else {
        response.history = historyData || [];
      }
    }

    // Set cache headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${CACHE_DURATION / 1000}, stale-while-revalidate=60`
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For now, we'll allow cache refresh without authentication
    // In production, this should be protected by API keys or admin middleware
    const body = await request.json();
    const { action } = body;

    if (action === 'refresh_cache') {
      // Clear analytics cache to force refresh
      const { error: clearError } = await supabaseServer
        .rpc('clear_analytics_cache');

      if (clearError) {
        console.error('Error clearing analytics cache:', clearError);
        return NextResponse.json(
          { error: 'Failed to clear cache' },
          { status: 500 }
        );
      }

      // Trigger fresh metrics calculation
      const { data: freshMetrics, error: metricsError } = await supabaseServer
        .rpc('get_dashboard_metrics');

      if (metricsError) {
        console.error('Error fetching fresh metrics:', metricsError);
        return NextResponse.json(
          { error: 'Failed to fetch fresh metrics' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Analytics cache refreshed',
        metrics: freshMetrics,
        refreshed_at: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Dashboard POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
