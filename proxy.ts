import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/server/csp";
import { CLIENT_IP_HEADER } from "@/server/client-ip";
import { getEnv } from "@/server/env";
import { getClientIp } from "@/server/rate-limit";

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Toda requisição ganha um `x-request-id` (reaproveita o do proxy reverso se
 * vier válido), que liga logs, erros e audit. Páginas recebem também uma CSP
 * com nonce novo: o Next aplica o nonce nos próprios scripts ao ler o
 * cabeçalho da requisição, e o layout aplica no script do tema.
 */
export function proxy(request: NextRequest) {
  const incoming = request.headers.get("x-request-id");
  const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  // Caminho atual para layouts (ex.: liberar a tela de configurar o 2FA).
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  // IP real do cliente (atrás de TRUSTED_PROXY_HOPS proxies), SEMPRE sobrescrito:
  // um valor mandado pelo próprio cliente nunca chega ao app.
  requestHeaders.set(CLIENT_IP_HEADER, getClientIp(request.headers, getEnv().TRUSTED_PROXY_HOPS));

  const isPage = !request.nextUrl.pathname.startsWith("/api/");
  let csp: string | undefined;
  if (isPage) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    csp = buildCsp({
      livekitUrl: getEnv().NEXT_PUBLIC_LIVEKIT_URL,
      dev: process.env.NODE_ENV === "development",
      nonce,
      sentryDsn: getEnv().SENTRY_DSN,
    });
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  if (csp) response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Tudo menos arquivos estáticos. Sem exceção para prefetch: o x-client-ip
    // precisa ser sobrescrito em toda requisição que chega ao app.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|mascot/|robots.txt).*)",
  ],
};
