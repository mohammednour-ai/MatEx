import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getUserContext, createServerSupabaseClient } from '@/lib/auth';

// Types for search results
interface SearchResult {
  id: string;
  title: string;
  description: string;
  material_type: string;
  category: string;
  condition: string;
  quantity: number;
  unit: string;
  pricing_type: string;
  price_cad: number;
  buy_now_cad: number;
  location_city: string;
  location_province: string;
  status: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  search_rank: number;
  search_headline_title: string;
  search_headline_description: string;
}

interface SearchSuggestion {
  suggestion: string;
  category: string;
  frequency: number;
}

interface SearchResponse {
  success: boolean;
  data?: {
    results: SearchResult[];
    total_count: number;
    query: string;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  suggestions?: SearchSuggestion[];
  error?: string;
  timestamp: string;
}

// GET /api/search - Full-text search for listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20'), 100); // Max 100 results per page
    const suggestions = searchParams.get('suggestions') === 'true';
    
    const supabase = createServerClient();
    const user = await getUserContext(supabase);
    
    // If requesting suggestions for autocomplete
    if (suggestions && query.length >= 2) {
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .rpc('get_search_suggestions', {
          partial_query: query,
          limit_count: 10
        });

      if (suggestionsError) {
        console.error('Search suggestions error:', suggestionsError);
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch search suggestions',
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        suggestions: suggestionsData || [],
        timestamp: new Date().toISOString()
      });
    }

    // If no query provided, return empty results
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          total_count: 0,
          query: '',
          page: 1,
          per_page: perPage,
          has_more: false
        },
        timestamp: new Date().toISOString()
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * perPage;

    // Perform full-text search using the database function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_listings', {
        search_query: query.trim(),
        limit_count: perPage,
        offset_count: offset
      });

    if (searchError) {
      console.error('Search error:', searchError);
      return NextResponse.json({
        success: false,
        error: 'Search failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Get total count for pagination (approximate)
    const { count: totalCount, error: countError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .textSearch('search_vector', query.trim())
      .eq('status', 'active');

    if (countError) {
      console.error('Count error:', countError);
    }

    const results = searchResults || [];
    const total = totalCount || results.length;
    const hasMore = offset + results.length < total;

    // Log search query for analytics (async, don't wait)
    if (query.trim()) {
      supabase
        .rpc('log_search_query', {
          query_text: query.trim(),
          user_id: user?.id || null,
          results_count: results.length
        })
        .then(() => {
          // Search logged successfully
        })
        .catch((error) => {
          console.error('Failed to log search query:', error);
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        total_count: total,
        query: query.trim(),
        page,
        per_page: perPage,
        has_more: hasMore
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/search - Advanced search with filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query = '',
      filters = {},
      sort = 'relevance',
      page = 1,
      per_page = 20
    } = body;

    const supabase = createServerClient();
    const user = await getUserContext(supabase);
    
    const perPage = Math.min(per_page, 100); // Max 100 results per page
    const offset = (page - 1) * perPage;

    // Start with base query
    let searchQuery = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        material_type,
        category,
        condition,
        quantity,
        unit,
        pricing_type,
        price_cad,
        buy_now_cad,
        location_city,
        location_province,
        status,
        seller_id,
        created_at,
        updated_at
      `)
      .eq('status', 'active');

    // Apply full-text search if query provided
    if (query.trim()) {
      searchQuery = searchQuery.textSearch('search_vector', query.trim());
    }

    // Apply filters
    if (filters.material_type) {
      searchQuery = searchQuery.eq('material_type', filters.material_type);
    }
    
    if (filters.category) {
      searchQuery = searchQuery.eq('category', filters.category);
    }
    
    if (filters.condition) {
      searchQuery = searchQuery.eq('condition', filters.condition);
    }
    
    if (filters.pricing_type) {
      searchQuery = searchQuery.eq('pricing_type', filters.pricing_type);
    }
    
    if (filters.location_city) {
      searchQuery = searchQuery.eq('location_city', filters.location_city);
    }
    
    if (filters.location_province) {
      searchQuery = searchQuery.eq('location_province', filters.location_province);
    }

    // Apply price range filters
    if (filters.min_price) {
      searchQuery = searchQuery.gte('price_cad', filters.min_price);
    }
    
    if (filters.max_price) {
      searchQuery = searchQuery.lte('price_cad', filters.max_price);
    }

    // Apply quantity range filters
    if (filters.min_quantity) {
      searchQuery = searchQuery.gte('quantity', filters.min_quantity);
    }
    
    if (filters.max_quantity) {
      searchQuery = searchQuery.lte('quantity', filters.max_quantity);
    }

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        searchQuery = searchQuery.order('price_cad', { ascending: true });
        break;
      case 'price_desc':
        searchQuery = searchQuery.order('price_cad', { ascending: false });
        break;
      case 'date_desc':
        searchQuery = searchQuery.order('created_at', { ascending: false });
        break;
      case 'date_asc':
        searchQuery = searchQuery.order('created_at', { ascending: true });
        break;
      case 'title_asc':
        searchQuery = searchQuery.order('title', { ascending: true });
        break;
      case 'title_desc':
        searchQuery = searchQuery.order('title', { ascending: false });
        break;
      case 'relevance':
      default:
        // For relevance, we'll use created_at as fallback since we can't easily get ts_rank here
        searchQuery = searchQuery.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    searchQuery = searchQuery.range(offset, offset + perPage - 1);

    const { data: results, error: searchError, count } = await searchQuery;

    if (searchError) {
      console.error('Advanced search error:', searchError);
      return NextResponse.json({
        success: false,
        error: 'Search failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const total = count || 0;
    const hasMore = offset + (results?.length || 0) < total;

    // Log search query for analytics (async, don't wait)
    if (query.trim()) {
      supabase
        .rpc('log_search_query', {
          query_text: `${query.trim()} [filtered]`,
          user_id: user?.id || null,
          results_count: results?.length || 0
        })
        .then(() => {
          // Search logged successfully
        })
        .catch((error) => {
          console.error('Failed to log search query:', error);
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        results: results || [],
        total_count: total,
        query: query.trim(),
        filters,
        sort,
        page,
        per_page: perPage,
        has_more: hasMore
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
