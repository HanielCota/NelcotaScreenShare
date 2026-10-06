"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { adminAction } from "@/features/auth/server/action-clients";
import { ActionError } from "@/server/actions/errors";
import { getAdminAuth } from "@/features/auth/server/admin-auth";
import { getDb } from "@/server/db";
import { adminSessions } from "@/server/db/schema";

/**
 * Encerra uma sessão da PRÓPRIA conta. O navegador só conhece o ID; o token
 * (que vale como credencial) é buscado aqui, restrito ao admin logado.
 */
export const revokeOwnSession = adminAction
  .metadata({ name: "account.revokeSession", allowWithoutTwoFactor: true, audit: "required" })
  .inputSchema(z.object({ sessionId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
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
    await auth.api.revokeSession({ headers: await headers(), body: { token: target.token } });
    await ctx.audit.record(db, {
      action: "admin_session.revoke",
      resourceType: "admin_session",
      resourceId: parsedInput.sessionId,
    });
    revalidatePath("/admin/conta/sessoes");
    return { revoked: 1 };
  });

/** Encerra todas as sessões da própria conta, menos a atual. */
export const revokeOtherOwnSessions = adminAction
  .metadata({
    name: "account.revokeOtherSessions",
    allowWithoutTwoFactor: true,
    audit: "required",
  })
  .action(async ({ ctx }) => {
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
    revalidatePath("/admin/conta/sessoes");
    return { revoked: deleted.length };
  });
