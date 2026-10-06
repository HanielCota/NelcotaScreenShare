import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getEnv } from "@/server/env";
import { logger } from "@/server/logger";
import { getUserAuth } from "./participant-auth";

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
  await getDb()
    .update(users)
    .set({ lastSeenAt: sql`now()` })
    .where(
      sql`${users.id} = ${user.id} and (${users.lastSeenAt} is null or ${users.lastSeenAt} < now() - interval '1 hour')`,
    )
    // Só uma estatística: falhar aqui não pode impedir a página de abrir.
    .catch((error: unknown) => logger.warn({ err: error }, "falha ao gravar último acesso"));
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

/**
 * Exige login (e e-mail verificado, quando REQUIRE_EMAIL_VERIFICATION está
 * ligada); senão manda para /entrar ou /verificar-email e volta depois.
 */
export async function requireUser(
  returnTo: string,
  { requireVerified = true }: { requireVerified?: boolean } = {},
): Promise<UserSession> {
  const current = await getUserSession();
  if (!current) redirect(`/entrar?voltar=${encodeURIComponent(safeReturnPath(returnTo))}`);
  if (requireVerified && getEnv().REQUIRE_EMAIL_VERIFICATION && !current.user.emailVerified) {
    redirect(`/verificar-email?voltar=${encodeURIComponent(safeReturnPath(returnTo))}`);
  }
  return current;
}
