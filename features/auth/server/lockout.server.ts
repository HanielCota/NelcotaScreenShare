import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Database } from "@/server/db/index.server";
import { loginFailures } from "@/server/db/schema";

export type AuthScope = "admin" | "user";

/**
 * Bloqueio por senhas erradas (o Better Auth só bloqueia o 2FA):
 * - por conta (HMAC do e-mail): a cada 5 erros em 24 h o bloqueio dobra,
 *   começando em 15 min e indo até 24 h;
 * - por IP: 20 erros em 15 min bloqueiam o IP por 15 min.
 * A mensagem para quem tenta é sempre a mesma, exista a conta ou não.
 */
export const LOCKOUT = {
  perAccount: 5,
  baseLockMs: 15 * 60 * 1000,
  maxLockMs: 24 * 60 * 60 * 1000,
  accountWindowMs: 24 * 60 * 60 * 1000,
  perIp: 20,
  ipWindowMs: 15 * 60 * 1000,
} as const;

export interface LockoutStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

export function emailHash(secret: string, scope: AuthScope, email: string): string {
  return createHmac("sha256", secret)
    .update(`${scope}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

/** Só IPs válidos vão para a coluna `inet` (o resto vira NULL). */
function validIp(ip: string | undefined): string | null {
  return ip && isIP(ip) ? ip : null;
}

/** Duração do bloqueio depois de `failures` erros: 0, ou 15 min dobrando a cada 5. */
export function lockDurationMs(failures: number): number {
  const level = Math.floor(failures / LOCKOUT.perAccount);
  if (level < 1) return 0;
  return Math.min(LOCKOUT.baseLockMs * 2 ** (level - 1), LOCKOUT.maxLockMs);
}

export async function checkLockout(
  db: Database,
  {
    scope,
    hash,
    ip,
    now = new Date(),
  }: { scope: AuthScope; hash: string; ip?: string; now?: Date },
): Promise<LockoutStatus> {
  const since = new Date(now.getTime() - LOCKOUT.accountWindowMs);
  const [account] = await db
    .select({
      count: sql<number>`count(*)::int`,
      last: sql<Date | null>`max(${loginFailures.createdAt})`,
    })
    .from(loginFailures)
    .where(
      and(
        eq(loginFailures.scope, scope),
        eq(loginFailures.emailHash, hash),
        gte(loginFailures.createdAt, since),
      ),
    );
  const duration = lockDurationMs(account?.count ?? 0);
  if (duration > 0 && account?.last) {
    const until = new Date(account.last).getTime() + duration;
    if (until > now.getTime()) {
      return { locked: true, retryAfterSeconds: Math.ceil((until - now.getTime()) / 1000) };
    }
  }

  const address = validIp(ip);
  if (address) {
    const ipSince = new Date(now.getTime() - LOCKOUT.ipWindowMs);
    const [byIp] = await db
      .select({
        count: sql<number>`count(*)::int`,
        first: sql<Date | null>`min(${loginFailures.createdAt})`,
      })
      .from(loginFailures)
      .where(
        and(
          eq(loginFailures.scope, scope),
          eq(loginFailures.ip, address),
          gte(loginFailures.createdAt, ipSince),
        ),
      );
    if ((byIp?.count ?? 0) >= LOCKOUT.perIp && byIp?.first) {
      const until = new Date(byIp.first).getTime() + LOCKOUT.ipWindowMs;
      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((until - now.getTime()) / 1000)),
      };
    }
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export async function recordFailure(
  db: Database,
  {
    scope,
    hash,
    ip,
    now = new Date(),
  }: { scope: AuthScope; hash: string; ip?: string; now?: Date },
): Promise<void> {
  await db
    .insert(loginFailures)
    .values({ scope, emailHash: hash, ip: validIp(ip), createdAt: now });
}

/** Login certo zera os erros da conta (os do IP continuam contando). */
export async function clearFailures(
  db: Database,
  { scope, hash }: { scope: AuthScope; hash: string },
): Promise<void> {
  await db
    .delete(loginFailures)
    .where(and(eq(loginFailures.scope, scope), eq(loginFailures.emailHash, hash)));
}

/** Retenção: erros com mais de 30 dias saem (job diário). */
export async function purgeOldFailures(db: Database, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(loginFailures)
    .where(lt(loginFailures.createdAt, cutoff))
    .returning({ id: loginFailures.id });
  return deleted.length;
}
