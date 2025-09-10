import { NextResponse } from 'next/server';

// Enhanced in-memory rate limiter with configurable limits per endpoint
// For production, consider using Redis/Upstash for distributed rate limiting

interface RateLimitBucket {
  tokens: number;
  last: number;
  requests: number[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

// Default rate limit configurations for different endpoint types
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
} as const;

const buckets = new Map<string, RateLimitBucket>();

// Cleanup old buckets periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const cutoff = now - (5 * 60 * 1000); // 5 minutes ago

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.last < cutoff) {
      buckets.delete(key);
    }
  }
}, 60_000); // Run cleanup every minute

/**
 * Check if a request should be allowed based on rate limiting
 * @param key - Unique identifier for the rate limit bucket (e.g., "bid:192.168.1.1" or "bid:user123")
 * @param maxRequests - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns true if request should be allowed, false if rate limited
 */
export function allowRequest(
  key: string,
  maxRequests = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    // First request for this key
    buckets.set(key, {
      tokens: maxRequests - 1,
      last: now,
      requests: [now]
    });
    return true;
  }

  const elapsed = now - bucket.last;

  if (elapsed > windowMs) {
    // Window has expired, reset the bucket
    bucket.tokens = maxRequests - 1;
    bucket.last = now;
    bucket.requests = [now];
    buckets.set(key, bucket);
    return true;
  }

  // Clean up old requests outside the window
  bucket.requests = bucket.requests.filter(timestamp => now - timestamp < windowMs);

  if (bucket.requests.length < maxRequests) {
    // Allow the request
    bucket.requests.push(now);
    bucket.tokens = maxRequests - bucket.requests.length;
    bucket.last = now;
    buckets.set(key, bucket);
    return true;
  }

  // Rate limit exceeded
  return false;
}

/**
 * Get current rate limit status for a key
 * @param key - Rate limit bucket key
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with remaining requests and reset time
 */
export function getRateLimitStatus(
  key: string,
  maxRequests = 10,
  windowMs = 60_000
) {
  const bucket = buckets.get(key);
  const now = Date.now();

  if (!bucket) {
    return {
      remaining: maxRequests,
      reset: now + windowMs,
      total: maxRequests,
      used: 0
    };
  }

  const elapsed = now - bucket.last;

  if (elapsed > windowMs) {
    return {
      remaining: maxRequests,
      reset: now + windowMs,
      total: maxRequests,
      used: 0
    };
  }

  // Clean up old requests
  const validRequests = bucket.requests.filter(timestamp => now - timestamp < windowMs);
  const remaining = Math.max(0, maxRequests - validRequests.length);
  const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;

  return {
    remaining,
    reset: oldestRequest + windowMs,
    total: maxRequests,
    used: validRequests.length
  };
}

/**
 * Enhanced rate limiting with predefined configurations
 * @param endpointType - Type of endpoint (BID, DEPOSIT, etc.)
 * @param identifier - IP address, user ID, or other identifier
 * @param customConfig - Optional custom configuration
 * @returns true if request should be allowed
 */
export function checkRateLimit(
  endpointType: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string,
  customConfig?: Partial<RateLimitConfig>
): boolean {
  const config = { ...RATE_LIMIT_CONFIGS[endpointType], ...customConfig };
  const key = `${config.keyPrefix}:${identifier}`;

  return allowRequest(key, config.maxRequests, config.windowMs);
}

/**
 * Get rate limit status with predefined configurations
 * @param endpointType - Type of endpoint
 * @param identifier - IP address, user ID, or other identifier
 * @param customConfig - Optional custom configuration
 * @returns Rate limit status object
 */
export function getRateLimitStatusForEndpoint(
  endpointType: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string,
  customConfig?: Partial<RateLimitConfig>
) {
  const config = { ...RATE_LIMIT_CONFIGS[endpointType], ...customConfig };
  const key = `${config.keyPrefix}:${identifier}`;

  return getRateLimitStatus(key, config.maxRequests, config.windowMs);
}

/**
 * Create rate limit response headers
 * @param status - Rate limit status object
 * @returns Headers object for HTTP response
 */
export function createRateLimitHeaders(status: ReturnType<typeof getRateLimitStatus>) {
  return {
    'X-RateLimit-Limit': status.total.toString(),
    'X-RateLimit-Remaining': status.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(status.reset / 1000).toString(),
    'X-RateLimit-Used': status.used.toString(),
  };
}

/**
 * Apply rate limiting to a request with automatic response generation
 * @param request - Next.js request object
 * @param endpointType - Type of endpoint
 * @param customConfig - Optional custom configuration
 * @returns null if allowed, NextResponse if rate limited
 */
export function applyRateLimit(
  request: Request,
  endpointType: keyof typeof RATE_LIMIT_CONFIGS,
  customConfig?: Partial<RateLimitConfig>
): NextResponse | null {
  // Get IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

  const allowed = checkRateLimit(endpointType, ip, customConfig);
  const status = getRateLimitStatusForEndpoint(endpointType, ip, customConfig);

  if (!allowed) {
    const headers = createRateLimitHeaders(status);
    const retryAfter = Math.ceil((status.reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${retryAfter} seconds.`,
        retry_after: retryAfter,
        limit: status.total,
        remaining: status.remaining,
        reset: status.reset
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          ...headers
        }
      }
    );
  }

  return null; // Request allowed
}

/**
 * Get statistics about current rate limiting state
 * @returns Object with rate limiting statistics
 */
export function getRateLimitStats() {
  const now = Date.now();
  const stats = {
    totalBuckets: buckets.size,
    activeBuckets: 0,
    expiredBuckets: 0,
    bucketsByPrefix: {} as Record<string, number>,
    oldestBucket: now,
    newestBucket: 0
  };

  for (const [key, bucket] of buckets.entries()) {
    const age = now - bucket.last;
    const prefix = key.split(':')[0];

    if (age < 5 * 60 * 1000) { // Active in last 5 minutes
      stats.activeBuckets++;
    } else {
      stats.expiredBuckets++;
    }

    stats.bucketsByPrefix[prefix] = (stats.bucketsByPrefix[prefix] || 0) + 1;
    stats.oldestBucket = Math.min(stats.oldestBucket, bucket.last);
    stats.newestBucket = Math.max(stats.newestBucket, bucket.last);
  }

  return stats;
}

/**
 * Clear all rate limiting buckets (useful for testing)
 */
export function clearAllRateLimits() {
  buckets.clear();
}

/**
 * Clear rate limiting buckets for a specific prefix
 * @param prefix - Prefix to clear (e.g., 'bid', 'deposit')
 */
export function clearRateLimitsForPrefix(prefix: string) {
  for (const [key] of buckets.entries()) {
    if (key.startsWith(`${prefix}:`)) {
      buckets.delete(key);
    }
  }
}
