import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { getEnv } from "@/lib/env";

/** Senha e segredo do admin, ou `undefined` com o painel desligado. */
export function adminCredentials(): { password: string; secret: string } | undefined {
  const { ADMIN_PASSWORD, ADMIN_SESSION_SECRET } = getEnv();
  if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) return undefined;
  return { password: ADMIN_PASSWORD, secret: ADMIN_SESSION_SECRET };
}

/** Sessão válida no cookie. A página e cada server action chamam por conta própria. */
export async function hasAdminSession(): Promise<boolean> {
  const credentials = adminCredentials();
  if (!credentials) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token, credentials.secret);
}
