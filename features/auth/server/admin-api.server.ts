import { getAdminSession, needsTwoFactorSetup, type AdminSession } from "./admin-session.server";
import { can, type PermissionRequest } from "./permissions.server";

/**
 * Authorization for the panel's Route Handlers (CSV etc.): the same rule as the
 * actions. Returns the session or the ready error response.
 */
export async function requireAdminApi(
  permission: PermissionRequest,
): Promise<{ admin: AdminSession } | { response: Response }> {
  const admin = await getAdminSession();
  if (!admin || needsTwoFactorSetup(admin)) {
    return { response: new Response("Sessão inválida.", { status: 401 }) };
  }
  if (!can(admin.user.role, permission)) {
    return { response: new Response("Sem permissão.", { status: 403 }) };
  }
  return { admin };
}
