import "server-only";
import { appUrl } from "@/server/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF para as rotas de autenticação. O Better Auth valida a origem só quando
 * já existe cookie; sem cookie (primeiro login) um site poderia forçar o
 * navegador a entrar numa conta do atacante ("login CSRF"). Aqui toda
 * requisição que muda estado precisa vir da origem do app.
 */
export function isCrossSiteMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (origin) return origin !== new URL(appUrl()).origin;
  // Sem Origin: navegadores modernos mandam Sec-Fetch-Site em toda requisição.
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin" && site !== "none";
}

export function forbiddenCrossSite(): Response {
  return Response.json(
    { code: "CROSS_SITE_REQUEST", message: "Requisição de outra origem recusada." },
    { status: 403 },
  );
}
