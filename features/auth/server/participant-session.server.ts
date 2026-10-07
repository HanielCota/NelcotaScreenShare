import { sql } from "drizzle-orm";
import { requestHeaders, requestMemo as cache } from "@/server/request-context.server";
import { redirect } from "@/server/http.server";
import { getDb } from "@/server/db/index.server";
import { users } from "@/server/db/schema";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getEnv } from "@/server/env.server";
import { logger } from "@/server/logger.server";
import { getUserAuth } from "./participant-auth.server";

export interface UserSession {
  user: {
    id: string;
    name: string;
    image: string | null;
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
  const result = await getUserAuth().api.getSession({ headers: requestHeaders() });
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
      image: user.image ?? null,
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
