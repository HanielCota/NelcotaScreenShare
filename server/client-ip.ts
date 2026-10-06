/**
 * Header com o IP real do cliente, calculado no proxy.ts a partir do
 * X-Forwarded-For e de TRUSTED_PROXY_HOPS. É sempre sobrescrito no proxy, então
 * o que o cliente mandar nesse header nunca chega ao app.
 */
export const CLIENT_IP_HEADER = "x-client-ip";

export function clientIpFrom(headers: Headers): string | undefined {
  const ip = headers.get(CLIENT_IP_HEADER);
  return ip && ip !== "unknown" ? ip : undefined;
}
