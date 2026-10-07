/**
 * Admin panel roles. Single source: the CHECK on the `admin_users.role` column,
 * the Better Auth access control and the permission matrix all start here.
 */
export const ADMIN_ROLES = ["owner", "admin", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  viewer: "Leitor",
};

/** Roles that change data: require active 2FA to use the panel. */
export const ROLES_REQUIRING_2FA: readonly AdminRole[] = ["owner", "admin"];

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}
