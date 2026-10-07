import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/server/db/schema";
import { CookieJar, makeCaller } from "./http-auth";

/**
 * Admin real (convite aceito + login pelo handler) para chamar operações
 * com `requestHeaders()` simulado. Defina ADMIN_AUTH_SECRET antes de importar.
 */
const PASSWORD = "senha-forte-do-admin-123";
let counter = 0;

export type AdminRoleName = "owner" | "admin" | "viewer";

export async function adminSession(
  db: NodePgDatabase<typeof schema>,
  role: AdminRoleName,
  { ip = "192.0.2.50" }: { ip?: string } = {},
) {
  const { getAdminAuth, ADMIN_AUTH_BASE_PATH } =
    await import("@/features/auth/server/admin-auth.server");
  const { acceptAdminInvitation, createAdminInvitation } =
    await import("@/features/auth/server/admin-invitations.server");
  const auth = getAdminAuth();
  assert.ok(auth);
  counter += 1;
  const email = `${role}-${counter}-${Date.now()}@exemplo.com`;
  const { token } = await createAdminInvitation(db, { email, role, invitedBy: null });
  const accepted = await acceptAdminInvitation(db, auth, {
    token,
    name: `Admin ${role}`,
    password: PASSWORD,
  });
  assert.ok(accepted.ok);
  const jar = new CookieJar();
  const call = makeCaller(auth.handler, ADMIN_AUTH_BASE_PATH, `198.18.0.${counter % 250}`);
  const res = await call("/sign-in/email", { body: { email, password: PASSWORD }, jar });
  assert.equal(res.status, 200);
  // Depois do login (antes, o Better Auth pediria o 2FA). O DAL só confere a flag.
  await db
    .update(schema.adminUsers)
    .set({ twoFactorEnabled: true })
    .where(eq(schema.adminUsers.email, email));
  return {
    id: accepted.userId,
    headers: new Headers({
      cookie: jar.header(),
      "x-client-ip": ip,
      "x-request-id": `req-${role}-${counter}`,
    }),
  };
}
