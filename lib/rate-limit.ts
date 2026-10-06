import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Rate limit de janela fixa, em memória. Suficiente para uma única instância
 * (o caso deste app no Coolify). Para várias réplicas, troque por Redis.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }

    bucket.count += 1;
    return {
      ok: bucket.count <= limit,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  };
}

/**
 * IP do cliente atrás do proxy do Coolify (Traefik). O primeiro valor do
 * X-Forwarded-For vem do próprio cliente e pode ser forjado; o último foi
 * acrescentado pelo proxy e é o único confiável.
 */
export function getClientIp(headers: Headers): string {
  const lastHop = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (lastHop) return lastHop;
  return headers.get("x-real-ip")?.trim() ?? "unknown";
}
