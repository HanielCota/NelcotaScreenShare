import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, test, vi } from "vitest";
import * as schema from "@/server/db/schema";
import { CookieJar, makeCaller } from "./support/http-auth";

/**
 * Operações do painel chamadas com uma sessão de admin real (cookie no
 * `requestHeaders()` simulado): permissão, 2FA e auditoria na mesma transação.
 */
const requestHeaders = { current: new Headers() };
vi.mock("@/server/request-context.server", () => ({
  requestMemo: (load: () => unknown) => load,
  requestHeaders: () => requestHeaders.current,
}));
process.env.ADMIN_AUTH_SECRET = "segredo-admin-de-teste-0123456789abcdef0123456789";
const { getAdminAuth, ADMIN_AUTH_BASE_PATH } =
  await import("@/features/auth/server/admin-auth.server");
const { acceptAdminInvitation, createAdminInvitation } =
  await import("@/features/auth/server/admin-invitations.server");
const { saveMascotSettings } = await import("@/features/admin/settings/actions.server");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());
const PASSWORD = "senha-forte-do-admin-123";

async function adminSession(email: string, role: "owner" | "admin" | "viewer") {
  const auth = getAdminAuth();
  assert.ok(auth);
  const { token } = await createAdminInvitation(db, { email, role, invitedBy: null });
  const accepted = await acceptAdminInvitation(db, auth, {
    token,
    name: "Teste",
    password: PASSWORD,
  });
  assert.ok(accepted.ok);
  const jar = new CookieJar();
  const call = makeCaller(auth.handler, ADMIN_AUTH_BASE_PATH, `192.0.2.${role.length * 10}`);
  const res = await call("/sign-in/email", { body: { email, password: PASSWORD }, jar });
  assert.equal(res.status, 200);
  // Depois do login (antes, o Better Auth pediria o 2FA). O DAL só confere a flag;
  // o fluxo real do 2FA é testado em admin-auth.
  await db
    .update(schema.adminUsers)
    .set({ twoFactorEnabled: true })
    .where(eq(schema.adminUsers.email, email));
  return {
    id: accepted.userId,
    headers: new Headers({
      cookie: jar.header(),
      "x-client-ip": "192.0.2.50",
      "x-request-id": "req-teste-123",
    }),
  };
}

describe("configurações (settings.update)", () => {
  let owner: { id: string; headers: Headers };
  let viewer: { id: string; headers: Headers };
  beforeAll(async () => {
    owner = await adminSession("dono@exemplo.com", "owner");
    viewer = await adminSession("leitor@exemplo.com", "viewer");
  });

  test("dono salva: 1 registro de auditoria com diff, autor, IP e request_id", async () => {
    requestHeaders.current = owner.headers;
    const result = await saveMascotSettings({ saturationDark: 1.5, saturationLight: 0.8 });
    assert.deepEqual(result.data, { saved: true });

    const rows = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row?.actorAdminId, owner.id);
    assert.equal(row?.resourceId, "mascot");
    assert.deepEqual(row?.changes, {
      saturationDark: { antes: 1, depois: 1.5 },
      saturationLight: { antes: 1, depois: 0.8 },
    });
    assert.equal(row?.ip, "192.0.2.50");
    assert.equal(row?.requestId, "req-teste-123");
    const [setting] = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, "mascot"));
    assert.equal(setting?.updatedBy, owner.id);
  });

  test("leitor não tem permissão e nada é gravado", async () => {
    requestHeaders.current = viewer.headers;
    const before = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    const result = await saveMascotSettings({ saturationDark: 0.1, saturationLight: 0.1 });
    assert.equal(result.serverError, "Você não tem permissão para fazer isso.");
    const after = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    assert.equal(after.length, before.length);
  });

  test("valor inválido não grava nem audita", async () => {
    requestHeaders.current = owner.headers;
    const result = await saveMascotSettings({ saturationDark: 9, saturationLight: 1 });
    assert.equal(result.serverError, "A saturação precisa ficar entre 0% e 200%.");
    const rows = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    assert.equal(rows.length, 1);
  });
});
