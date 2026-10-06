import assert from "node:assert/strict";
import test from "node:test";
// oxlint-disable-next-line import/no-unassigned-import -- Só registra os hooks de resolução de módulos.
import "./support/register.mts";

/**
 * Configurações contra um Postgres de verdade. Precisa de TEST_DATABASE_URL
 * apontando para um banco descartável (as tabelas são apagadas no início).
 */
const url = process.env.TEST_DATABASE_URL;

const { drizzle } = await import("drizzle-orm/node-postgres");
const { Pool } = await import("pg");
const { runMigrations } = await import("../lib/db/migrate");
const schema = await import("../lib/db/schema");
const { appSettings } = schema;
const settings = await import("../lib/settings");
const { clearSettingsCache, getSetting, mascotSettings, saveSetting } = settings;

test("sem banco: valem os padrões e salvar avisa", async () => {
  clearSettingsCache();
  assert.deepEqual(await getSetting(mascotSettings, null), mascotSettings.defaults);
  await assert.rejects(
    saveSetting(mascotSettings, { saturationDark: 1.2, saturationLight: 1 }, null),
    settings.SettingsUnavailableError,
  );
});

test("com Postgres", { skip: url ? false : "defina TEST_DATABASE_URL" }, async (t) => {
  if (!url) return;
  const pool = new Pool({ connectionString: url });
  await pool.query("drop table if exists app_settings; drop schema if exists drizzle cascade");
  await runMigrations(url);
  // Rodar de novo não faz nada (migração já aplicada).
  await runMigrations(url);
  const db = drizzle(pool, { schema });
  t.after(() => pool.end());

  await t.test("sem linha: padrões", async () => {
    clearSettingsCache();
    assert.deepEqual(await getSetting(mascotSettings, db), mascotSettings.defaults);
  });

  await t.test("salva, arredonda e lê de volta", async () => {
    const saved = await saveSetting(
      mascotSettings,
      { saturationDark: 1.234, saturationLight: 0.5 },
      db,
    );
    assert.deepEqual(saved, { saturationDark: 1.23, saturationLight: 0.5 });
    assert.deepEqual(await getSetting(mascotSettings, db), saved);

    // Segundo save atualiza a mesma linha (upsert) e limpa o cache.
    await saveSetting(mascotSettings, { saturationDark: 2, saturationLight: 0 }, db);
    assert.deepEqual(await getSetting(mascotSettings, db), {
      saturationDark: 2,
      saturationLight: 0,
    });
    const rows = await db.select().from(appSettings);
    assert.equal(rows.length, 1);
  });

  await t.test("fora da faixa é recusado e nada muda", async () => {
    await assert.rejects(
      saveSetting(mascotSettings, { saturationDark: 2.5, saturationLight: 1 }, db),
    );
    await assert.rejects(saveSetting(mascotSettings, { saturationDark: 1 }, db));
    clearSettingsCache();
    assert.deepEqual(await getSetting(mascotSettings, db), {
      saturationDark: 2,
      saturationLight: 0,
    });
  });

  await t.test("JSON inválido gravado por fora: padrões", async () => {
    await pool.query(
      `update app_settings set value = '{"saturationDark":"muito"}' where key = 'mascot'`,
    );
    clearSettingsCache();
    assert.deepEqual(await getSetting(mascotSettings, db), mascotSettings.defaults);
  });
});
