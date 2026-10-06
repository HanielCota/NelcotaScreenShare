import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { getUserAuth } from "./user";

export interface UserSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  session: { id: string; createdAt: Date };
}

/** Só aceita destinos internos (evita open redirect em `?voltar=`). */
export function safeReturnPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/") || value.startsWith("/admin")) return fallback;
  return value;
}

/**
 * Sessão do participante (DAL), uma vez por render. Conta bloqueada ou
 * excluída = sem sessão (o bloqueio também encerra as sessões no painel).
 */
export const getUserSession = cache(async (): Promise<UserSession | null> => {
  const result = await getUserAuth().api.getSession({ headers: await headers() });
  if (!result) return null;
  const { user, session } = result;
  if (user.blockedAt || user.deletedAt) return null;
  // Último acesso (no máximo uma escrita por hora por pessoa).
  const db = getDb();
  if (db) {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(
        sql`${users.id} = ${user.id} and (${users.lastSeenAt} is null or ${users.lastSeenAt} < now() - interval '1 hour')`,
      )
      .catch(() => {});
  }
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    },
    session: { id: session.id, createdAt: new Date(session.createdAt) },
  };
});

/** Exige login (e, por padrão, e-mail verificado); senão manda para /entrar e volta depois. */
export async function requireUser(
  returnTo: string,
  { requireVerified = true }: { requireVerified?: boolean } = {},
): Promise<UserSession> {
  const current = await getUserSession();
  if (!current) redirect(`/entrar?voltar=${encodeURIComponent(safeReturnPath(returnTo))}`);
  if (requireVerified && !current.user.emailVerified) {
    redirect(`/verificar-email?voltar=${encodeURIComponent(safeReturnPath(returnTo))}`);
  }
  return current;
}
