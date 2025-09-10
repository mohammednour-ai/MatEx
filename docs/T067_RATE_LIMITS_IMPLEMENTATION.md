# T067 - Rate Limits for APIs Implementation

## Overview
This document describes the implementation of rate limiting for MatEx API endpoints, specifically targeting write operations (bid, deposit, checkout, settings) as requested in T067.

## Implementation Details

### Core Rate Limiter (`matex/src/lib/rateLimiter.ts`)
- **Algorithm**: Token bucket with sliding window
- **Storage**: In-memory Map with automatic cleanup
- **IP Detection**: Supports `x-forwarded-for` and `x-real-ip` headers
- **Cleanup**: Automatic removal of expired buckets every 60 seconds

### Rate Limit Configurations
```typescript
export const RATE_LIMIT_CONFIGS = {
  // Write endpoints (more restrictive)
  BID: { maxRequests: 10, windowMs: 60_000, keyPrefix: 'bid' },
  DEPOSIT: { maxRequests: 5, windowMs: 60_000, keyPrefix: 'deposit' },
  CHECKOUT: { maxRequests: 5, windowMs: 60_000, keyPrefix: 'checkout' },
  SETTINGS: { maxRequests: 5, windowMs: 60_000, keyPrefix: 'settings' },

  // Read endpoints (less restrictive)
  SEARCH: { maxRequests: 30, windowMs: 60_000, keyPrefix: 'search' },
  LISTINGS: { maxRequests: 50, windowMs: 60_000, keyPrefix: 'listings' },

  // Admin endpoints
  ADMIN: { maxRequests: 20, windowMs: 60_000, keyPrefix: 'admin' },

  // Default fallback
  DEFAULT: { maxRequests: 15, windowMs: 60_000, keyPrefix: 'default' }
}
```

### Key Functions

#### `applyRateLimit(request, endpointType, customConfig?)`
- **Purpose**: Main function for applying rate limits to API routes
- **Returns**: `null` if allowed, `NextResponse` with 429 status if rate limited
- **Headers**: Includes standard rate limit headers (`X-RateLimit-*`)

#### `checkRateLimit(endpointType, identifier, customConfig?)`
- **Purpose**: Check if a request should be allowed
- **Returns**: `boolean` - true if allowed, false if rate limited

#### `getRateLimitStatusForEndpoint(endpointType, identifier, customConfig?)`
- **Purpose**: Get current rate limit status for monitoring
- **Returns**: Object with `remaining`, `reset`, `total`, `used` properties

### Implemented Endpoints

#### 1. Auction Bidding (`/api/auctions/[id]/bid`)
- **Rate Limit**: 10 requests per minute per IP
- **Implementation**: Already existed, uses `allowRequest` function
- **Status**: ✅ Complete

#### 2. Deposit Authorization (`/api/deposits/authorize`)
- **Rate Limit**: 5 requests per minute for POST, 20 for GET
- **Implementation**: Already existed, uses `allowRequest` function
- **Status**: ✅ Complete

#### 3. Settings Updates (`/api/settings`)
- **Rate Limit**: 5 requests per minute for POST
- **Implementation**: Already existed, uses `allowRequest` function
- **Status**: ✅ Complete

#### 4. Checkout Fixed Price (`/api/checkout/fixed`)
- **Rate Limit**: 5 requests per minute per IP
- **Implementation**: Created during T067, uses `applyRateLimit` function
- **Features**:
  - Stripe Checkout Session creation
  - Order management
  - Terms acceptance validation
  - KYC and email verification checks
- **Status**: ✅ Complete

### Response Format for Rate Limited Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 45 seconds.",
  "retry_after": 45,
  "limit": 5,
  "remaining": 0,
  "reset": 1694307600000
}
```

### HTTP Headers
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `X-RateLimit-Used`: Requests used in current window
- `Retry-After`: Seconds to wait before retrying

### Monitoring and Management

#### Statistics Function
```typescript
getRateLimitStats() // Returns bucket statistics
```

#### Management Functions
```typescript
clearAllRateLimits() // Clear all buckets (testing)
clearRateLimitsForPrefix(prefix) // Clear specific endpoint buckets
```

### Production Considerations

#### Current Implementation
- **Storage**: In-memory Map (suitable for single-instance deployments)
- **Persistence**: No persistence across server restarts
- **Scalability**: Single-server only

#### Future Enhancements
- **Redis/Upstash**: For distributed rate limiting across multiple instances
- **Database Storage**: For persistent rate limiting across restarts
- **User-based Limits**: Rate limiting by authenticated user ID instead of IP
- **Dynamic Limits**: Configurable limits based on user tier/subscription

### Testing

#### Manual Testing
1. Make multiple rapid requests to any protected endpoint
2. Verify 429 responses after exceeding limits
3. Check rate limit headers in responses
4. Verify automatic reset after time window

#### Rate Limit Testing Script
```bash
# Test checkout endpoint rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/checkout/fixed \
    -H "Content-Type: application/json" \
    -d '{"listing_id":"test-id"}' \
    -w "Status: %{http_code}\n"
  sleep 1
done
```

### Security Benefits
1. **DDoS Protection**: Prevents overwhelming the server with requests
2. **Resource Conservation**: Limits expensive operations (Stripe API calls, database writes)
3. **Fair Usage**: Ensures equitable access to API resources
4. **Cost Control**: Reduces third-party API costs (Stripe, payment processing)

### Performance Impact
- **Memory Usage**: Minimal - buckets are cleaned up automatically
- **CPU Overhead**: Very low - simple Map operations
- **Response Time**: Negligible additional latency

## Completion Status

✅ **T067 - Rate Limits for APIs**: COMPLETE

### Requirements Met:
- [x] In-memory rate limiter implementation
- [x] Rate limits for bid endpoints (10/min)
- [x] Rate limits for deposit endpoints (5/min)
- [x] Rate limits for checkout endpoints (5/min)
- [x] Rate limits for settings endpoints (5/min)
- [x] Proper error responses with retry information
- [x] Standard rate limit headers
- [x] IP-based rate limiting
- [x] Automatic cleanup of expired buckets
- [x] Documentation completed

### Files Modified/Created:
- `matex/src/lib/rateLimiter.ts` - Enhanced with new configurations and functions
- `matex/src/app/api/checkout/fixed/route.ts` - Created new endpoint with rate limiting
- `matex/docs/T067_RATE_LIMITS_IMPLEMENTATION.md` - This documentation

The rate limiting system is now fully operational and protecting all specified write endpoints as requested in T067.
