/**
 * Header with the client's real IP, computed in the middleware from
 * X-Forwarded-For and TRUSTED_PROXY_HOPS. It is always overwritten in the middleware, so
 * whatever the client sends in this header never reaches the app.
 */
export const CLIENT_IP_HEADER = "x-client-ip";

export function clientIpFrom(headers: Headers): string | undefined {
  const ip = headers.get(CLIENT_IP_HEADER);
  return ip && ip !== "unknown" ? ip : undefined;
}

/**
 * Client IP behind trusted proxies. Each proxy appends to the end of
 * X-Forwarded-For the IP of whoever talked to it; the values on the left come from the
 * client and can be forged. With `trustedHops` proxies in front of the app
 * (Traefik = 1; Cloudflare + Traefik = 2), the real IP is the `trustedHops`-th
 * from the end.
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
  return headers.get("x-real-ip")?.trim() || headers.get("x-nelcota-peer-ip") || "unknown";
}
