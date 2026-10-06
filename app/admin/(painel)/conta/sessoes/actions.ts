"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { ActionError, adminAction } from "@/server/actions/client";
import { getAdminAuth } from "@/server/auth/admin";
import { getDb } from "@/server/db";
import { adminSessions } from "@/server/db/schema";

/**
 * Encerra uma sessão da PRÓPRIA conta. O navegador só conhece o ID; o token
 * (que vale como credencial) é buscado aqui, restrito ao admin logado.
 */
export const revokeOwnSession = adminAction
  .metadata({ name: "account.revokeSession", allowWithoutTwoFactor: true })
  .inputSchema(z.object({ sessionId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new ActionError("O painel admin está desligado.");
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
    revalidatePath("/admin/conta/sessoes");
    return { revoked: 1 };
  });

/** Encerra todas as sessões da própria conta, menos a atual. */
export const revokeOtherOwnSessions = adminAction
  .metadata({ name: "account.revokeOtherSessions", allowWithoutTwoFactor: true })
  .action(async ({ ctx }) => {
    const db = getDb();
    if (!db) throw new ActionError("O painel admin está desligado.");
    const deleted = await db
      .delete(adminSessions)
      .where(
        and(
          eq(adminSessions.userId, ctx.admin.user.id),
          ne(adminSessions.id, ctx.admin.session.id),
        ),
      )
      .returning({ id: adminSessions.id });
    revalidatePath("/admin/conta/sessoes");
    return { revoked: deleted.length };
  });
