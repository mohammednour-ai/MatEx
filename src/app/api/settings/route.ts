import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// In-memory cache for settings with 3-minute TTL
interface CacheEntry {
  data: Record<string, any>;
  timestamp: number;
}

// Define setting type for better type safety
interface AppSetting {
  key: string;
  value: any;
  description: string;
  category: string;
  is_public: boolean;
}

// Define update setting type
interface UpdateSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
  is_public?: boolean;
}

const settingsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes in milliseconds

// Helper function to get cache key
function getCacheKey(keys?: string[]): string {
  if (!keys || keys.length === 0) {
    return 'all_settings';
  }
  return `settings_${keys.sort().join(',')}`;
}

// Helper function to check if cache entry is valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Helper function to get settings from database
async function getSettingsFromDB(keys?: string[]) {
  let query = supabaseServer
    .from('app_settings')
    .select('key, value, description, category, is_public');

  // Filter by keys if provided
  if (keys && keys.length > 0) {
    query = query.in('key', keys);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching settings:', error);
    throw new Error('Failed to fetch settings');
  }

  // Transform array to object for easier consumption
  const settings: Record<string, any> = {};
  data?.forEach((setting: AppSetting) => {
    settings[setting.key] = {
      value: setting.value,
      description: setting.description,
      category: setting.category,
      is_public: setting.is_public,
    };
  });

  return settings;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }

  return data?.role === 'admin';
}

// Helper function to get user from authorization header
async function getUserFromAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get('keys');
    
    // Parse keys parameter
    let keys: string[] | undefined;
    if (keysParam) {
      keys = keysParam.split(',').map(key => key.trim()).filter(key => key.length > 0);
    }

    // Generate cache key
    const cacheKey = getCacheKey(keys);

    // Check cache first
    const cachedEntry = settingsCache.get(cacheKey);
    if (cachedEntry && isCacheValid(cachedEntry)) {
      return NextResponse.json({
        success: true,
        data: cachedEntry.data,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch from database
    const settings = await getSettingsFromDB(keys);

    // Update cache
    settingsCache.set(cacheKey, {
      data: settings,
      timestamp: Date.now(),
    });

    // Clean up expired cache entries (simple cleanup)
    for (const [key, entry] of settingsCache.entries()) {
      if (!isCacheValid(entry)) {
        settingsCache.delete(key);
      }
    }

    return NextResponse.json({
      success: true,
      data: settings,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Settings API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userId = await getUserFromAuth(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Valid authentication token required',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Admin privileges required',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'Settings array is required and must not be empty',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate settings format
    for (const setting of settings) {
      if (!setting.key || typeof setting.key !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Bad Request',
            message: 'Each setting must have a valid key',
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      if (setting.value === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bad Request',
            message: `Setting ${setting.key} must have a value`,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    // Prepare upsert operations
    const upsertPromises = settings.map((setting: UpdateSetting) => {
      return supabaseServer
        .from('app_settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          is_public: setting.is_public ?? false,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });
    });

    // Execute all upserts atomically
    const results = await Promise.all(upsertPromises);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Settings upsert errors:', errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Database Error',
          message: 'Failed to update some settings',
          details: errors.map(e => e.error?.message),
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Clear all cache entries since settings were updated
    settingsCache.clear();

    // Get updated settings for response
    const updatedKeys = settings.map((s: UpdateSetting) => s.key);
    const updatedSettings = await getSettingsFromDB(updatedKeys);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${settings.length} setting(s)`,
      data: updatedSettings,
      updated_count: settings.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Settings POST API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Export cache management functions for testing/debugging
export function clearSettingsCache() {
  settingsCache.clear();
}

export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(settingsCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp,
    valid: isCacheValid(entry),
  }));

  return {
    totalEntries: settingsCache.size,
    validEntries: entries.filter(e => e.valid).length,
    expiredEntries: entries.filter(e => !e.valid).length,
    entries,
  };
}
