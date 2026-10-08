import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, test } from "vitest";
import * as schema from "@/server/db/schema";
import {
  clearSettingsCache,
  getSetting,
  mascotSettings,
  saveSetting,
} from "@/features/admin/settings/server/settings.server";
import { runMigrations } from "../../scripts/migrate";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());
beforeEach(() => clearSettingsCache());

async function appliedMigrations() {
  const { rows } = await pool.query<{ count: string }>(
    "select count(*) from drizzle.__drizzle_migrations",
  );
  return Number(rows[0]?.count);
}

test("migrations already applied: running again does nothing", async () => {
  const before = await appliedMigrations();
  assert.ok(before > 0);
  await runMigrations(process.env.DATABASE_URL ?? "");
  assert.equal(await appliedMigrations(), before);
});

describe("mascot in Postgres", () => {
  beforeEach(async () => {
    await db.delete(schema.appSettings);
  });

  test("no row: defaults", async () => {
    assert.deepEqual(await getSetting(mascotSettings, db), mascotSettings.defaults);
  });

  test("saves, rounds, reads back and updates the same row", async () => {
    const saved = await saveSetting(
      mascotSettings,
      { saturationDark: 1.234, saturationLight: 0.5 },
      db,
    );
    assert.deepEqual(saved, { saturationDark: 1.23, saturationLight: 0.5 });
    assert.deepEqual(await getSetting(mascotSettings, db), saved);

    await saveSetting(mascotSettings, { saturationDark: 2, saturationLight: 0 }, db);
    assert.deepEqual(await getSetting(mascotSettings, db), {
      saturationDark: 2,
      saturationLight: 0,
    });
    assert.equal((await db.select().from(schema.appSettings)).length, 1);
  });

  test("out of range is rejected and nothing changes", async () => {
    await saveSetting(mascotSettings, { saturationDark: 2, saturationLight: 0 }, db);
    await assert.rejects(
      saveSetting(mascotSettings, { saturationDark: 2.5, saturationLight: 1 }, db),
    );
    await assert.rejects(saveSetting(mascotSettings, { saturationDark: 1 }, db));
    assert.deepEqual(await getSetting(mascotSettings, db), {
      saturationDark: 2,
      saturationLight: 0,
    });
  });

  test("invalid JSON written from outside: defaults", async () => {
    await saveSetting(mascotSettings, { saturationDark: 2, saturationLight: 0 }, db);
    await pool.query(
      `update app_settings set value = '{"saturationDark":"muito"}' where key = 'mascot'`,
    );
    clearSettingsCache();
    assert.deepEqual(await getSetting(mascotSettings, db), mascotSettings.defaults);
  });
});
