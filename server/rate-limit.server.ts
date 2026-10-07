interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Counts an attempt and says whether it still fits within the limit. */
  hit(key: string): RateLimitResult;
  /** Says whether one more attempt would fit, without counting anything. */
  peek(key: string): RateLimitResult;
  /** Forgets the key (e.g. a correct password clears the wrong attempts). */
  reset(key: string): void;
}

/**
 * Fixed-window, in-memory rate limit. Enough for a single instance
 * (this app's case on Coolify). For multiple replicas, switch to Redis.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const time = now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= time) buckets.delete(key);
    }
  }, windowMs);
  sweep.unref();

  function current(key: string, time: number): Bucket | undefined {
    const bucket = buckets.get(key);
    return bucket && bucket.resetAt > time ? bucket : undefined;
  }

  return {
    hit(key) {
      const time = now();
      const bucket = current(key, time);
      if (!bucket) {
        buckets.set(key, { count: 1, resetAt: time + windowMs });
        return { ok: limit >= 1, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      return {
        ok: bucket.count <= limit,
        retryAfterSeconds: Math.ceil((bucket.resetAt - time) / 1000),
      };
    },
    peek(key) {
      const time = now();
      const bucket = current(key, time);
      if (!bucket) return { ok: true, retryAfterSeconds: 0 };
      return {
        ok: bucket.count < limit,
        retryAfterSeconds: Math.ceil((bucket.resetAt - time) / 1000),
      };
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}
