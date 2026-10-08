import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/server/env.server";

const COOKIE = "nelcota_convidado";
const MAX_AGE_SECONDS = 12 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function sign(guestId: string): string {
  return createHmac("sha256", `${getEnv().AUTH_SECRET}:guest`).update(guestId).digest("base64url");
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

/**
 * Guest id from the signed cookie, or undefined when missing or tampered with. The id keeps
 * a guest's identity across reconnects and lets the server act for them (raising the hand).
 */
export function readGuestId(request: Request): string | undefined {
  const raw = readCookie(request.headers.get("cookie"), COOKIE);
  if (!raw) return undefined;
  const [guestId = "", signature = ""] = raw.split(".");
  if (!UUID.test(guestId)) return undefined;
  const expected = Buffer.from(sign(guestId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  return guestId;
}

/** A new guest id and the Set-Cookie header that stores it (HttpOnly, 12 hours). */
export function newGuestSession(request: Request): { guestId: string; setCookie: string } {
  const guestId = randomUUID();
  const secure =
    new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
  const attributes = [
    `${COOKIE}=${guestId}.${sign(guestId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    ...(secure ? ["Secure"] : []),
  ];
  return { guestId, setCookie: attributes.join("; ") };
}
