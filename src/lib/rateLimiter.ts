// Simple in-memory rate limiter (per-key). Replace with Redis/Upstash for production.
const buckets = new Map<string, { tokens: number; last: number }>();

export function allowRequest(key: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: maxRequests - 1, last: now });
    return true;
  }

  const elapsed = now - bucket.last;
  if (elapsed > windowMs) {
    // reset
    bucket.tokens = maxRequests - 1;
    bucket.last = now;
    buckets.set(key, bucket);
    return true;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    bucket.last = now;
    buckets.set(key, bucket);
    return true;
  }

  return false;
}

export function getRateLimitStatus(key: string, maxRequests = 10, windowMs = 60_000) {
  const b = buckets.get(key);
  const now = Date.now();
  if (!b) return { remaining: maxRequests, reset: now + windowMs };
  const elapsed = now - b.last;
  if (elapsed > windowMs) return { remaining: maxRequests, reset: now + windowMs };
  return { remaining: b.tokens, reset: b.last + windowMs };
}
