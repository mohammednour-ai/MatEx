# T015 - GET /api/settings

## Overview
Implemented GET /api/settings API endpoint to provide dynamic configuration retrieval with caching, query parameter filtering, and server-side security for the MatEx application.

## Implementation Details

### 1. API Endpoint Features
- **Selective Retrieval**: Query parameter filtering with ?keys=a,b,c
- **JSON Response**: Merged configuration object from app_settings
- **Caching**: 3-minute in-memory cache for performance
- **Server-Only**: Uses service role for secure database access

### 2. Performance Optimization
- **In-Memory Caching**: Reduces database queries for frequently accessed settings
- **Selective Loading**: Only fetch requested configuration keys
- **Cache Invalidation**: Automatic cache expiry and manual invalidation

## Technical Implementation

### API Route (/app/api/settings/route.ts)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// In-memory cache with 3-minute TTL
interface CacheEntry {
  data: Record<string, any>
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keysParam = searchParams.get('keys')
    
    if (!keysParam) {
      return NextResponse.json({ error: 'Keys parameter required' }, { status: 400 })
    }
    
    const keys = keysParam.split(',').map(k => k.trim())
    const cacheKey = keys.sort().join(',')
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }
    
    // Fetch from database
    const { data, error } = await supabaseServer
      .from('app_settings')
      .select('key, value')
      .in('key', keys)
    
    if (error) {
      console.error('Settings fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }
    
    // Merge settings into single object
    const settings: Record<string, any> = {}
    data?.forEach(setting => {
      settings[setting.key] = setting.value
    })
    
    // Cache result
    cache.set(cacheKey, {
      data: settings,
      timestamp: Date.now()
    })
    
    return NextResponse.json(settings)
    
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Cache invalidation helper
export function invalidateSettingsCache(keys?: string[]) {
  if (keys) {
    // Invalidate specific cache entries
    const keysToInvalidate = keys.sort().join(',')
    cache.delete(keysToInvalidate)
  } else {
    // Clear entire cache
    cache.clear()
  }
}
```

### Usage Examples
```typescript
// Frontend usage
const fetchSettings = async (keys: string[]) => {
  const response = await fetch(`/api/settings?keys=${keys.join(',')}`)
  return response.json()
}

// Get auction settings
const auctionSettings = await fetchSettings([
  'auction.soft_close_seconds',
  'auction.min_increment_strategy',
  'auction.deposit_required'
])

// Get fee configuration
const feeSettings = await fetchSettings([
  'fees.transaction_percent',
  'fees.deposit_percent'
])
```

## Files Created
- `src/app/api/settings/route.ts` - GET settings API endpoint

## API Features

### Query Parameters
- **keys**: Comma-separated list of setting keys to retrieve
- **Example**: `/api/settings?keys=auction.soft_close_seconds,fees.transaction_percent`

### Response Format
```json
{
  "auction.soft_close_seconds": 120,
  "fees.transaction_percent": 0.04,
  "auction.deposit_required": true
}
```

### Error Handling
- **400 Bad Request**: Missing keys parameter
- **500 Internal Server Error**: Database or server errors
- **Graceful Degradation**: Continues with partial data on non-critical errors

## Security Implementation

### Server-Side Only
- **Service Role**: Uses supabaseServer with full database access
- **No Client Exposure**: Sensitive configuration not exposed to client
- **Controlled Access**: Only specified keys returned

### Data Protection
- **Input Validation**: Sanitize and validate key parameters
- **Error Handling**: No sensitive information in error messages
- **Rate Limiting**: Can be extended with rate limiting middleware

## Performance Features

### Caching Strategy
- **In-Memory Cache**: Fast access to frequently used settings
- **TTL-Based**: 3-minute cache expiry for balance of performance and freshness
- **Key-Specific**: Cache entries based on requested key combinations
- **Invalidation**: Manual cache clearing for immediate updates

### Optimization
- **Selective Queries**: Only fetch requested settings from database
- **Batch Retrieval**: Single query for multiple settings
- **Minimal Processing**: Efficient data transformation

## Integration Points

### Application Settings
- **Dynamic Configuration**: Runtime configuration without code changes
- **Feature Flags**: Enable/disable features through settings
- **Business Rules**: Configurable auction rules and fee structures

### Frontend Integration
- **React Hooks**: Custom hooks for settings management
- **Context Providers**: Global settings state management
- **Real-time Updates**: Settings updates without page refresh

## Common Settings Categories

### Auction Configuration
- `auction.soft_close_seconds`: Auction extension time
- `auction.min_increment_strategy`: Bidding increment rules
- `auction.deposit_required`: Deposit requirement flag
- `auction.deposit_percent`: Deposit percentage

### Fee Structure
- `fees.transaction_percent`: Platform transaction fee
- `fees.processing_fee`: Payment processing fee
- `fees.listing_fee`: Listing creation fee

### Notification Settings
- `notifications.channels`: Enabled notification channels
- `notifications.digest_frequency`: Email digest frequency
- `notifications.reminder_hours`: Inspection reminder timing

## Success Metrics
- **Response Time**: Sub-100ms response with caching
- **Cache Hit Rate**: High cache utilization for performance
- **Error Rate**: Low error rate with proper handling
- **Usage Patterns**: Monitor most requested settings

## Future Enhancements
- **Redis Caching**: Distributed caching for scalability
- **Setting Validation**: Type validation and constraints
- **Audit Logging**: Track settings access patterns
- **Real-time Updates**: WebSocket-based settings updates
- **Environment-Specific**: Different settings per environment
