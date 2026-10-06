/**
 * Papéis do painel admin. Fonte única: o CHECK da coluna `admin_users.role`,
 * o controle de acesso do Better Auth e a matriz de permissões partem daqui.
 */
export const ADMIN_ROLES = ["owner", "admin", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  viewer: "Leitor",
};

/** Papéis que alteram dados: exigem 2FA ativo para usar o painel. */
export const ROLES_REQUIRING_2FA: readonly AdminRole[] = ["owner", "admin"];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}
