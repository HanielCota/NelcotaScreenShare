import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, test, vi } from "vitest";
import * as schema from "@/server/db/schema";

/**
 * Admin panel operations called with a real admin session (cookie in the
 * mocked `requestHeaders()`): permission, 2FA and audit in the same transaction.
 */
const requestHeaders = { current: new Headers() };
vi.mock("@/server/request-context.server", () => ({
  requestMemo: (load: () => unknown) => load,
  requestHeaders: () => requestHeaders.current,
}));
process.env.ADMIN_AUTH_SECRET = "segredo-admin-de-teste-0123456789abcdef0123456789";
const { adminSession } = await import("./support/admin-session");
const { saveMascotSettings } = await import("@/features/admin/settings/actions.server");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

describe("settings (settings.update)", () => {
  let owner: Awaited<ReturnType<typeof adminSession>>;
  let viewer: Awaited<ReturnType<typeof adminSession>>;
  beforeAll(async () => {
    owner = await adminSession(db, "owner");
    viewer = await adminSession(db, "viewer");
  });

  test("owner saves: 1 audit record with diff, author, IP and request_id", async () => {
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
    assert.equal(row?.requestId, owner.headers.get("x-request-id"));
    const [setting] = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, "mascot"));
    assert.equal(setting?.updatedBy, owner.id);
  });

  test("viewer has no permission and nothing is written", async () => {
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

  test("an invalid value is neither written nor audited", async () => {
    requestHeaders.current = owner.headers;
    const before = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    const result = await saveMascotSettings({ saturationDark: 9, saturationLight: 1 });
    assert.deepEqual(result.validationErrors?.fieldErrors, {
      saturationDark: ["A saturação precisa ficar entre 0% e 200%."],
    });
    const after = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.action, "settings.update"));
    assert.equal(after.length, before.length);
  });
});
