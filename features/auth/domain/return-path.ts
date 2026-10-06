const BASE = "http://nelcota.local";

/**
 * Só aceita destinos internos (evita open redirect em `?voltar=`).
 * A checagem é feita pelo parser de URL do navegador, e não por prefixo: ele
 * descarta tab e quebra de linha e troca "\" por "/", então "/\t/evil.com"
 * viraria "//evil.com" (outro site) depois de passar por um teste de texto.
 */
export function safeReturnPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return fallback;
  return value;
}
