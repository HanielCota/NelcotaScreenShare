/**
 * The app's Content-Security-Policy. The LiveKit origin is only known at runtime
 * (LIVEKIT_URL), so the header is built in the server middleware.
 *
 * Scripts only with the request nonce + 'strict-dynamic' (whatever they
 * load inherits the trust): a script injected via XSS does not run. Styles
 * keep 'unsafe-inline' because a nonce does not cover `style` attributes (React,
 * Radix and GSAP use them). Connections only to the app itself and LiveKit.
 */
export function buildCsp({
  livekitUrl,
  dev,
  nonce,
  sentryDsn,
  devWebSocketOrigin,
}: {
  livekitUrl: string;
  dev: boolean;
  nonce: string;
  /** With Sentry enabled, the browser sends errors to the DSN's origin. */
  sentryDsn?: string | undefined;
  devWebSocketOrigin?: string;
}): string {
  const livekit = new URL(livekitUrl);
  const secure = livekit.protocol === "wss:";
  // The SDK talks WebSocket to the server and, on failures, queries /rtc/validate over HTTP(S).
  const livekitWs = `${livekit.protocol}//${livekit.host}`;
  const livekitHttp = `${secure ? "https" : "http"}://${livekit.host}`;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React uses eval only in development, to rebuild error stacks.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    "font-src": ["'self'"],
    "media-src": ["'self'", "blob:", "mediastream:"],
    "connect-src": [
      "'self'",
      livekitWs,
      livekitHttp,
      ...(sentryDsn ? [new URL(sentryDsn).origin] : []),
      ...(dev && devWebSocketOrigin ? [devWebSocketOrigin] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Only with LiveKit on wss: with ws:// (local dev) the browser would "upgrade" the connection to wss and break it.
  if (secure && !dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
