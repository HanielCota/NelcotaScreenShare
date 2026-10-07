/** Minimal HTTP client for the Better Auth handler, as the browser would do it. */
const ORIGIN = "http://localhost:3000";

export interface AuthCallResult {
  status: number;
  body: unknown;
  cookies: Map<string, string>;
}

export class CookieJar {
  private readonly jar = new Map<string, string>();

  store(response: Response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair = ""] = line.split(";");
      const index = pair.indexOf("=");
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (!value || /max-age=0/i.test(line)) {
        this.jar.delete(name);
        continue;
      }
      this.jar.set(name, value);
    }
  }

  header(): string {
    return [...this.jar].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  has(prefix: string): boolean {
    return [...this.jar.keys()].some((name) => name.includes(prefix));
  }
}

export function makeCaller(
  handler: (request: Request) => Promise<Response>,
  basePath: string,
  ip = "203.0.113.10",
) {
  return async function call(
    path: string,
    { body, jar, method = "POST" }: { body?: unknown; jar?: CookieJar; method?: string } = {},
  ): Promise<AuthCallResult> {
    const headers = new Headers({ origin: ORIGIN, "x-client-ip": ip });
    if (body !== undefined) headers.set("content-type", "application/json");
    const cookie = jar?.header();
    if (cookie) headers.set("cookie", cookie);
    const response = await handler(
      new Request(`${ORIGIN}${basePath}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    jar?.store(response);
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response (e.g. redirect)
    }
    return { status: response.status, body: parsed, cookies: new Map() };
  };
}
