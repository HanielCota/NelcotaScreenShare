import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { getEnv } from "@/lib/env";

let cachedCsp: string | undefined;

function csp(): string {
  cachedCsp ??= buildCsp({
    livekitUrl: getEnv().NEXT_PUBLIC_LIVEKIT_URL,
    dev: process.env.NODE_ENV === "development",
  });
  return cachedCsp;
}

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp());
  return response;
}

export const config = {
  matcher: [
    // Só páginas: APIs (JSON) e arquivos estáticos não precisam de CSP.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|mascot|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
