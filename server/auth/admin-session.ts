import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { logger } from "@/server/logger";
import { getAdminAuth } from "./admin";
import { can, type PermissionRequest } from "./permissions";
import { isAdminRole, ROLES_REQUIRING_2FA, type AdminRole } from "./roles";

/** Máximo absoluto de uma sessão, mesmo com uso contínuo. */
const ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: AdminRole;
    twoFactorEnabled: boolean;
  };
  session: { id: string; token: string; createdAt: Date; expiresAt: Date };
}

/**
 * Sessão de admin da requisição (DAL): validada no banco a cada requisição
 * (sem cache em cookie), uma vez por render graças ao `cache` do React.
 * Conta desativada, papel desconhecido ou sessão além do máximo absoluto = sem sessão.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const auth = getAdminAuth();
  if (!auth) return null;
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const { user, session } = result;
  if (user.banned || !isAdminRole(user.role)) return null;
  if (Date.now() - new Date(session.createdAt).getTime() > ADMIN_SESSION_MAX_AGE_MS) {
    await auth.api
      .revokeSession({ body: { token: session.token }, headers: await headers() })
      // A sessão já é recusada aqui; a revogação só limpa o banco mais cedo.
      .catch((error: unknown) => logger.warn({ err: error }, "falha ao revogar sessão vencida"));
    return null;
  }
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
    },
    session: {
      id: session.id,
      token: session.token,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
    },
  };
});

export function needsTwoFactorSetup(admin: AdminSession): boolean {
  return ROLES_REQUIRING_2FA.includes(admin.user.role) && !admin.user.twoFactorEnabled;
}

/**
 * Exige admin logado (e, por padrão, com 2FA quando o papel exige) e a
 * permissão pedida. Use no topo de páginas e layouts do painel. Server Actions
 * e Route Handlers usam o mesmo critério pelo `adminAction` (Fase 2).
 */
export async function requireAdmin(
  permission?: PermissionRequest,
  { allowWithoutTwoFactor = false }: { allowWithoutTwoFactor?: boolean } = {},
): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/entrar");
  if (!allowWithoutTwoFactor && needsTwoFactorSetup(admin)) redirect("/admin/conta/seguranca");
  if (permission && !can(admin.user.role, permission)) redirect("/admin/sem-permissao");
  return admin;
}
