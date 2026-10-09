/** `value` resolved against `base`, or `undefined` when it is not a valid URL. */
export function parseUrl(value: string, base: string): URL | undefined {
  try {
    return new URL(value, base);
  } catch {
    // An unparseable address is just "not a URL" for the callers.
    return undefined;
  }
}

/** Decoded URI component, or `undefined` for a malformed escape such as "%E0%A4%A". */
export function decodeComponent(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    // A malformed escape is just "not decodable" for the callers.
    return undefined;
  }
}
