import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { z } from 'zod';

// In-memory cache for price trends data
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Validation schemas
const GetPriceTrendsSchema = z.object({
  material: z.string().min(1).max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(104).default(52), // Max 2 years of weekly data
});

const MaterialsSchema = z.object({
  materials: z.literal('true').optional(),
});

// Cache management functions
function getCacheKey(params: any): string {
  return JSON.stringify(params);
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.timestamp + entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });

  // Cleanup expired entries periodically
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, entry] of cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        cache.delete(k);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // Check if requesting materials list
    if (params.materials === 'true') {
      const materialsValidation = MaterialsSchema.safeParse(params);
      if (!materialsValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid parameters',
            details: materialsValidation.error.errors
          },
          { status: 400 }
        );
      }

      const cacheKey = getCacheKey({ type: 'materials' });
      const cached = getFromCache(cacheKey);

      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Get materials with price data
      const { data: materials, error } = await supabaseServer
        .rpc('get_materials_with_price_data');

      if (error) {
        console.error('Error fetching materials with price data:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch materials data',
            message: error.message
          },
          { status: 500 }
        );
      }

      const result = {
        materials: materials || [],
        total_materials: materials?.length || 0,
      };

      setCache(cacheKey, result);

      return NextResponse.json({
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate price trends request
    const validation = GetPriceTrendsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { material, start_date, end_date, limit } = validation.data;

    // Material is required for price trends
    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: 'Material parameter is required for price trends'
        },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = getCacheKey({ material, start_date, end_date, limit });
    const cached = getFromCache(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Get price trends from database
    const { data: trends, error } = await supabaseServer
      .rpc('get_price_trends', {
        p_material: material,
        p_start_date: start_date || null,
        p_end_date: end_date || null,
        p_limit: limit,
      });

    if (error) {
      console.error('Error fetching price trends:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch price trends',
          message: error.message
        },
        { status: 500 }
      );
    }

    // Calculate additional statistics
    const trendData = trends || [];
    const prices = trendData.map((t: any) => parseFloat(t.avg_price || 0)).filter((p: number) => p > 0);
    const volumes = trendData.map((t: any) => parseFloat(t.volume_kg || 0)).filter((v: number) => v > 0);

    const statistics = {
      total_weeks: trendData.length,
      avg_price: prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0,
      min_price: prices.length > 0 ? Math.min(...prices) : 0,
      max_price: prices.length > 0 ? Math.max(...prices) : 0,
      total_volume: volumes.reduce((a: number, b: number) => a + b, 0),
      avg_weekly_volume: volumes.length > 0 ? volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length : 0,
      total_auctions: trendData.reduce((sum: number, t: any) => sum + (parseInt(t.auction_count) || 0), 0),
    };

    const result = {
      material,
      date_range: {
        start: start_date,
        end: end_date,
        limit,
      },
      trends: trendData,
      statistics,
    };

    // Cache the result
    setCache(cacheKey, result);

    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Price trends API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Admin endpoint to trigger price data aggregation
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin (this would be handled by middleware in production)
    const body = await request.json();
    const { week_start, material } = body;

    if (material && week_start) {
      // Aggregate specific material and week
      const { data, error } = await supabaseServer
        .rpc('aggregate_price_data_for_week', {
          p_material: material,
          p_week_start: week_start,
        });

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to aggregate price data',
            message: error.message
          },
          { status: 500 }
        );
      }

      // Clear related cache entries
      const keysToDelete = Array.from(cache.keys()).filter(key =>
        key.includes(material) || key.includes('materials')
      );
      keysToDelete.forEach(key => cache.delete(key));

      return NextResponse.json({
        success: true,
        message: `Aggregated price data for ${material} week starting ${week_start}`,
        data: { material, week_start },
      });
    } else {
      // Aggregate all materials for specified week or last week
      const { data, error } = await supabaseServer
        .rpc('aggregate_price_data_for_all_materials', {
          p_week_start: week_start || null,
        });

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to aggregate price data',
            message: error.message
          },
          { status: 500 }
        );
      }

      // Clear all cache entries
      cache.clear();

      return NextResponse.json({
        success: true,
        message: `Aggregated price data for ${data} materials`,
        data: { processed_materials: data, week_start: week_start || 'last_week' },
      });
    }

  } catch (error) {
    console.error('Price trends aggregation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export cache management functions for testing
export function clearPriceTrendsCache() {
  cache.clear();
}

export function getPriceTrendsCacheStats() {
  const now = Date.now();
  const entries = Array.from(cache.entries());

  return {
    total_entries: entries.length,
    active_entries: entries.filter(([_, entry]) => now <= entry.timestamp + entry.ttl).length,
    expired_entries: entries.filter(([_, entry]) => now > entry.timestamp + entry.ttl).length,
    cache_size_mb: JSON.stringify(Object.fromEntries(cache)).length / (1024 * 1024),
  };
}
