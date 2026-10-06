"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, userAction } from "@/server/actions/client";
import { verifyPassword } from "@/server/auth/password";
import { getDb } from "@/server/db";
import {
  roomParticipations,
  userAccounts,
  users,
  userSessions,
  userTwoFactors,
  userVerifications,
} from "@/server/db/schema";
import { logger } from "@/server/logger";

function database() {
  const db = getDb();
  if (!db) throw new ActionError("Serviço indisponível. Tente de novo em instantes.");
  return db;
}

/** Encerra uma sessão da própria conta (o token nunca vai ao navegador). */
export const revokeMySession = userAction
  .metadata({ name: "account.revokeSession", audit: "none" })
  .inputSchema(z.object({ sessionId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.sessionId === ctx.current.session.id) {
      throw new ActionError("Para sair deste dispositivo, use o botão Sair.");
    }
    const deleted = await database()
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
    const deleted = await database()
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
    const db = database();
    const userId = ctx.current.user.id;
    const [credential] = await db
      .select({ password: userAccounts.password })
      .from(userAccounts)
      .where(and(eq(userAccounts.userId, userId), eq(userAccounts.providerId, "credential")));
    if (
      !credential?.password ||
      !(await verifyPassword({ hash: credential.password, password: parsedInput.password }))
    ) {
      throw new ActionError("Senha incorreta.");
    }
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: "Pessoa removida",
          email: `removido+${userId}@invalid.nelcota`,
          emailVerified: false,
          image: null,
          twoFactorEnabled: false,
          anonymizedAt: new Date(),
          deletedAt: new Date(),
        })
        .where(eq(users.id, userId));
      // Nome mostrado nas salas sai do histórico. O IP fica até a retenção de
      // 6 meses (registro de acesso exigido pelo Marco Civil, art. 15).
      await tx
        .update(roomParticipations)
        .set({ displayName: null })
        .where(eq(roomParticipations.userId, userId));
      await tx.delete(userAccounts).where(eq(userAccounts.userId, userId));
      await tx.delete(userTwoFactors).where(eq(userTwoFactors.userId, userId));
      await tx.delete(userSessions).where(eq(userSessions.userId, userId));
      await tx
        .delete(userVerifications)
        .where(eq(userVerifications.identifier, ctx.current.user.email));
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
