"use server";

import { z } from "zod";
import { publicAction } from "@/features/auth/server/action-clients";
import { ActionError } from "@/server/actions/errors";
import { getAdminAuth } from "@/features/auth/server/admin-auth";
import { acceptAdminInvitation } from "@/features/auth/server/admin-invitations";
import { PASSWORD_LIMITS } from "@/features/auth/server/password";
import { getDb } from "@/server/db";
import { logger } from "@/server/logger";

const acceptInput = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().min(1, "Digite seu nome.").max(80),
  password: z.string().min(PASSWORD_LIMITS.admin.min).max(PASSWORD_LIMITS.admin.max),
});

const REASONS = {
  invalid: "Este convite expirou ou já foi usado. Peça um novo a quem convidou você.",
  already_admin: "Este e-mail já tem acesso ao painel. Entre com sua senha.",
  weak_password: `Use uma senha com ${PASSWORD_LIMITS.admin.min} a ${PASSWORD_LIMITS.admin.max} caracteres.`,
} as const;

/** Aceita o convite de admin e cria a conta (sem sessão: action pública com rate limit). */
export const acceptInvitation = publicAction
  .metadata({ name: "adminInvitation.accept", audit: "required" })
  .inputSchema(acceptInput)
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const auth = getAdminAuth();
    if (!auth) throw new ActionError("O painel admin está desligado neste servidor.");
    const result = await acceptAdminInvitation(db, auth, parsedInput);
    if (!result.ok) throw new ActionError(REASONS[result.reason]);
    // Autor: o admin que acabou de nascer deste convite.
    await ctx.audit.record(
      db,
      {
        action: "admin_invitation.accept",
        resourceType: "admin_invitation",
        resourceId: result.invitationId,
        metadata: { papel: result.role },
      },
      { adminId: result.userId },
    );
    logger.info({ event: "admin.invitation_accepted", adminId: result.userId }, "convite aceito");
    return { email: result.email };
  });
