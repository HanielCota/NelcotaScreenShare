import { appUrl } from "@/server/env.server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF for the authentication routes. Better Auth only validates the origin when
 * a cookie already exists; without a cookie (first sign-in) a site could force the
 * browser into an attacker's account ("login CSRF"). Here every
 * state-changing request must come from the app's origin.
 */
export function isCrossSiteMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (origin) return origin !== new URL(appUrl()).origin;
  // No Origin: modern browsers send Sec-Fetch-Site on every request.
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

export function forbiddenCrossSite(): Response {
  return Response.json(
    { code: "CROSS_SITE_REQUEST", message: "Requisição de outra origem recusada." },
    { status: 403 },
  );
}
