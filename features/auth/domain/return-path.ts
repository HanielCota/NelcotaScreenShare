const BASE = "http://nelcota.local";

/**
 * Only accepts internal destinations (prevents open redirect in `?voltar=`).
 * The check uses the browser's URL parser, not a prefix: it drops tabs and
 * line breaks and turns "\" into "/", so "/\t/evil.com" would become
 * "//evil.com" (another site) after passing a text test.
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
