"use server";

import { z } from "zod";
import { ActionError, publicAction } from "@/server/actions/client";
import { getAdminAuth } from "@/server/auth/admin";
import { acceptAdminInvitation } from "@/server/auth/invitations";
import { PASSWORD_LIMITS } from "@/server/auth/password";
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
  .metadata({ name: "adminInvitation.accept" })
  .inputSchema(acceptInput)
  .action(async ({ parsedInput }) => {
    const db = getDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new ActionError("O painel admin está desligado neste servidor.");
    const result = await acceptAdminInvitation(db, auth, parsedInput);
    if (!result.ok) throw new ActionError(REASONS[result.reason]);
    logger.info({ event: "admin.invitation_accepted", adminId: result.userId }, "convite aceito");
    return { email: result.email };
  });
