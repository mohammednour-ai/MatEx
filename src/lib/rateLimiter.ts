// In-memory rate limiter for API endpoints
// In production, consider using Redis or Upstash for distributed rate limiting

interface RateLimitEntry {
  count: number;
  reset: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.reset <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be allowed based on rate limiting
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request should be allowed, false if rate limited
 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.reset <= now) {
    // First request or window has expired
    rateLimitStore.set(key, {
      count: 1,
      reset: now + windowMs
    });
    return true;
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * Get current rate limit status for a key
 * @param key - Unique identifier for the rate limit
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit status information
 */
export function getRateLimitStatus(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.reset <= now) {
    return {
      count: 0,
      limit,
      remaining: limit,
      reset: now + windowMs
    };
  }

  return {
    count: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset
  };
}

/**
 * Reset rate limit for a specific key
 * @param key - Unique identifier for the rate limit
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get all active rate limit entries (for debugging)
 */
export function getActiveRateLimits(): Array<{ key: string; entry: RateLimitEntry }> {
  const now = Date.now();
  const active: Array<{ key: string; entry: RateLimitEntry }> = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.reset > now) {
      active.push({ key, entry });
    }
  }
  
  return active;
}
