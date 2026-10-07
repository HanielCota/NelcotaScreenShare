import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { defineUserOperation } from "@/features/auth/server/operation-policies.server";
import { ActionError } from "@/server/operations/action-error";
import { verifyPassword } from "@/features/auth/server/password.server";
import { getDb } from "@/server/db/index.server";
import { userAccounts, userSessions } from "@/server/db/schema";
import { logger } from "@/server/logger.server";
import { anonymizeParticipant } from "@/features/account/server/participant-accounts.server";
import { createRateLimiter } from "@/server/rate-limit.server";

/** Senha errada ao excluir a conta: poucas chances por conta, contra adivinhação. */
const deletePasswordFailures = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/** Encerra uma sessão da própria conta (o token nunca vai ao navegador). */
export const revokeMySession = defineUserOperation(
  { name: "account.revokeSession", audit: "none" },
  z.object({ sessionId: z.uuid() }),
  async ({ parsedInput, ctx }) => {
    if (parsedInput.sessionId === ctx.current.session.id) {
      throw new ActionError("Para sair deste dispositivo, use o botão Sair.");
    }
    const deleted = await getDb()
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.id, parsedInput.sessionId),
          eq(userSessions.userId, ctx.current.user.id),
        ),
      )
      .returning({ id: userSessions.id });
    if (deleted.length === 0) throw new ActionError("Sessão não encontrada. Atualize a página.");
    return { revoked: 1 };
  },
);

export const revokeMyOtherSessions = defineUserOperation(
  { name: "account.revokeOtherSessions", audit: "none" },
  z.undefined(),
  async ({ ctx }) => {
    const deleted = await getDb()
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, ctx.current.user.id),
          ne(userSessions.id, ctx.current.session.id),
        ),
      )
      .returning({ id: userSessions.id });
    return { revoked: deleted.length };
  },
);

/**
 * Exclusão da conta (LGPD): anonimiza em vez de apagar a linha, para manter só
 * os registros de acesso exigidos por lei pelo prazo legal. E-mail, nome,
 * senha, 2FA e sessões somem na hora. Exige a senha atual.
 */
export const deleteMyAccount = defineUserOperation(
  { name: "account.delete", audit: "required" },
  z.object({ password: z.string().min(1).max(128) }),
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    const userId = ctx.current.user.id;
    if (!deletePasswordFailures.peek(userId).ok) {
      throw new ActionError("Muitas tentativas com a senha errada. Aguarde alguns minutos.");
    }
    const [credential] = await db
      .select({ password: userAccounts.password })
      .from(userAccounts)
      .where(and(eq(userAccounts.userId, userId), eq(userAccounts.providerId, "credential")));
    if (
      !credential?.password ||
      !(await verifyPassword({ hash: credential.password, password: parsedInput.password }))
    ) {
      deletePasswordFailures.hit(userId);
      throw new ActionError("Senha incorreta.");
    }
    deletePasswordFailures.reset(userId);
    await db.transaction(async (tx) => {
      await anonymizeParticipant(tx, userId);
      // LGPD: registro da exclusão pedida pelo próprio titular (sem dados pessoais).
      await ctx.audit.record(tx, {
        action: "user.self_delete",
        resourceType: "user",
        resourceId: userId,
      });
    });
    logger.info({ event: "user.account_deleted", userId }, "conta excluída pelo titular");
    return { deleted: true };
  },
);
