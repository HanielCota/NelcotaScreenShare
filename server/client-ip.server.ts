/**
 * Header com o IP real do cliente, calculado no middleware a partir do
 * X-Forwarded-For e de TRUSTED_PROXY_HOPS. É sempre sobrescrito no middleware, então
 * o que o cliente mandar nesse header nunca chega ao app.
 */
export const CLIENT_IP_HEADER = "x-client-ip";

export function clientIpFrom(headers: Headers): string | undefined {
  const ip = headers.get(CLIENT_IP_HEADER);
  return ip && ip !== "unknown" ? ip : undefined;
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
  return headers.get("x-real-ip")?.trim() || headers.get("x-nelcota-peer-ip") || "unknown";
}
