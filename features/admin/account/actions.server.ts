import { and, eq, ne } from "drizzle-orm";
import { requestHeaders } from "@/server/request-context.server";
import { z } from "zod";
import { defineAdminOperation } from "@/features/auth/server/operations.server";
import { ActionError } from "@/server/actions/errors";
import { getAdminAuth } from "@/features/auth/server/admin-auth.server";
import { getDb } from "@/server/db/index.server";
import { adminSessions } from "@/server/db/schema";

/**
 * Encerra uma sessão da PRÓPRIA conta. O navegador só conhece o ID; o token
 * (que vale como credencial) é buscado aqui, restrito ao admin logado.
 */
export const revokeOwnSession = defineAdminOperation(
  { name: "account.revokeSession", allowWithoutTwoFactor: true, audit: "required" },
  z.object({ sessionId: z.uuid() }),
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    const auth = getAdminAuth();
    if (!auth) throw new ActionError("O painel admin está desligado.");
    if (parsedInput.sessionId === ctx.admin.session.id) {
      throw new ActionError("Para sair deste dispositivo, use o botão Sair.");
    }
    const [target] = await db
      .select({ token: adminSessions.token })
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.id, parsedInput.sessionId),
          eq(adminSessions.userId, ctx.admin.user.id),
        ),
      );
    if (!target) throw new ActionError("Sessão não encontrada. Atualize a página.");
    await auth.api.revokeSession({ headers: requestHeaders(), body: { token: target.token } });
    await ctx.audit.record(db, {
      action: "admin_session.revoke",
      resourceType: "admin_session",
      resourceId: parsedInput.sessionId,
    });
    return { revoked: 1 };
  },
);

/** Encerra todas as sessões da própria conta, menos a atual. */
export const revokeOtherOwnSessions = defineAdminOperation(
  {
    name: "account.revokeOtherSessions",
    allowWithoutTwoFactor: true,
    audit: "required",
  },
  z.undefined(),
  async ({ ctx }) => {
    const db = getDb();
    const deleted = await db.transaction(async (tx) => {
      const rows = await tx
        .delete(adminSessions)
        .where(
          and(
            eq(adminSessions.userId, ctx.admin.user.id),
            ne(adminSessions.id, ctx.admin.session.id),
          ),
        )
        .returning({ id: adminSessions.id });
      await ctx.audit.record(tx, {
        action: "admin_session.revoke_others",
        resourceType: "admin_user",
        resourceId: ctx.admin.user.id,
        metadata: { encerradas: rows.length },
      });
      return rows;
    });
    return { revoked: deleted.length };
  },
);
