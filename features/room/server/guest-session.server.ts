import { randomUUID } from "node:crypto";
import { createCookie, type Cookie } from "react-router";
import { getEnv } from "@/server/env.server";

const MAX_AGE_SECONDS = 12 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let cookie: Cookie | undefined;

/**
 * The guest cookie, signed by React Router with a key derived from AUTH_SECRET. Built on
 * first use, since the environment is read at runtime; more secrets can be listed later to
 * rotate the key without dropping guests.
 */
function guestCookie(): Cookie {
  cookie ??= createCookie("nelcota_convidado", {
    secrets: [`${getEnv().AUTH_SECRET}:guest`],
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
  });
  return cookie;
}

/**
 * Guest id from the signed cookie, or undefined when missing or tampered with. The id keeps
 * a guest's identity across reconnects and lets the server act for them (raising the hand).
 */
export async function readGuestId(request: Request): Promise<string | undefined> {
  const value: unknown = await guestCookie().parse(request.headers.get("cookie"));
  return typeof value === "string" && UUID.test(value) ? value : undefined;
}

/** A new guest id and the Set-Cookie header that stores it (HttpOnly, 12 hours). */
export async function newGuestSession(
  request: Request,
): Promise<{ guestId: string; setCookie: string }> {
  const guestId = randomUUID();
  const secure =
    new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
  return { guestId, setCookie: await guestCookie().serialize(guestId, { secure }) };
}
