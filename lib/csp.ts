/**
 * Content-Security-Policy do app. A origem do LiveKit só é conhecida em runtime
 * (NEXT_PUBLIC_LIVEKIT_URL), por isso o cabeçalho é montado no `proxy.ts`.
 *
 * Sem nonce: as páginas continuam estáticas e o Next ainda injeta scripts
 * inline, então `script-src` precisa de 'unsafe-inline'. O ganho está no resto:
 * conexões só para o próprio app e o LiveKit, nada de plugins, frames ou
 * formulários para fora.
 */
export function buildCsp({ livekitUrl, dev }: { livekitUrl: string; dev: boolean }): string {
  const livekit = new URL(livekitUrl);
  const secure = livekit.protocol === "wss:";
  // O SDK fala WebSocket com o servidor e, em falhas, consulta /rtc/validate via HTTP(S).
  const livekitWs = `${livekit.protocol}//${livekit.host}`;
  const livekitHttp = `${secure ? "https" : "http"}://${livekit.host}`;

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React usa eval só em desenvolvimento, para reconstruir stacks de erro.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:"],
    "font-src": ["'self'"],
    "media-src": ["'self'", "blob:", "mediastream:"],
    "connect-src": ["'self'", livekitWs, livekitHttp],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Só com LiveKit em wss: com ws:// (dev local) o navegador "subiria" a conexão para wss e quebraria.
  if (secure && !dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
