"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userAction } from "@/features/auth/server/action-clients";
import { ActionError } from "@/server/actions/errors";
import { verifyPassword } from "@/features/auth/server/password";
import { getDb } from "@/server/db";
import { userAccounts, userSessions } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { anonymizeParticipant } from "@/features/participants/server/operations";
import { createRateLimiter } from "@/server/rate-limit";

/** Senha errada ao excluir a conta: poucas chances por conta, contra adivinhação. */
const deletePasswordFailures = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/** Encerra uma sessão da própria conta (o token nunca vai ao navegador). */
export const revokeMySession = userAction
  .metadata({ name: "account.revokeSession", audit: "none" })
  .inputSchema(z.object({ sessionId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
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
    revalidatePath("/conta");
    return { revoked: 1 };
  });

export const revokeMyOtherSessions = userAction
  .metadata({ name: "account.revokeOtherSessions", audit: "none" })
  .action(async ({ ctx }) => {
    const deleted = await getDb()
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, ctx.current.user.id),
          ne(userSessions.id, ctx.current.session.id),
        ),
      )
      .returning({ id: userSessions.id });
    revalidatePath("/conta");
    return { revoked: deleted.length };
  });

/**
 * Exclusão da conta (LGPD): anonimiza em vez de apagar a linha, para manter só
 * os registros de acesso exigidos por lei pelo prazo legal. E-mail, nome,
 * senha, 2FA e sessões somem na hora. Exige a senha atual.
 */
export const deleteMyAccount = userAction
  .metadata({ name: "account.delete", audit: "required" })
  .inputSchema(z.object({ password: z.string().min(1).max(128) }))
  .action(async ({ parsedInput, ctx }) => {
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
  });
