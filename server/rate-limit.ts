import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /** Conta uma tentativa e diz se ela ainda cabe no limite. */
  hit(key: string): RateLimitResult;
  /** Diz se mais uma tentativa caberia, sem contar nada. */
  peek(key: string): RateLimitResult;
  /** Esquece a chave (ex.: senha certa zera as tentativas erradas). */
  reset(key: string): void;
}

/**
 * Rate limit de janela fixa, em memória. Suficiente para uma única instância
 * (o caso deste app no Coolify). Para várias réplicas, troque por Redis.
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

/**
 * IP do cliente atrás de proxies confiáveis. Cada proxy acrescenta ao fim do
 * X-Forwarded-For o IP de quem falou com ele; os valores à esquerda vêm do
 * cliente e podem ser forjados. Com `trustedHops` proxies na frente do app
 * (Traefik = 1; Cloudflare + Traefik = 2), o IP real é o `trustedHops`-ésimo
 * a partir do fim.
 */
export function getClientIp(headers: Headers, trustedHops = 1): string {
  const hops =
    headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((ip) => ip.trim())
      .filter(Boolean) ?? [];
  const ip = hops.at(Math.max(0, hops.length - trustedHops));
  if (ip) return ip;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
