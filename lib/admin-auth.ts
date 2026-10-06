import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createRateLimiter } from "@/lib/rate-limit";

export const ADMIN_COOKIE = "nelcota_admin";
/** Sessão curta: o painel é usado de vez em quando, não fica aberto o dia todo. */
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

/** Tentativas erradas de senha do admin por IP: 5 a cada 15 minutos. */
export const adminLoginLimit = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

/** Compara em tempo constante (o hash iguala os tamanhos sem vazar o da senha). */
export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-session:${payload}`).digest("base64url");
}

/** Valor do cookie: `<expira em ms>.<assinatura>`. Não guarda nada além da validade. */
export function createSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = String(now + ADMIN_SESSION_MS);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const [expiresAt, signature, ...rest] = token.split(".");
  if (!expiresAt || !signature || rest.length > 0 || !/^\d{1,16}$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= now) return false;
  const expected = Buffer.from(sign(expiresAt, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
