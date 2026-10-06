import "server-only";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/** Número arbitrário e fixo do app: identifica a trava de migração no Postgres. */
const MIGRATION_LOCK_ID = 7_340_118;

/**
 * Aplica as migrações pendentes de `drizzle/`. Uma conexão própria segura um
 * advisory lock, então duas instâncias subindo juntas não migram em paralelo.
 */
export async function runMigrations(url: string): Promise<void> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  await client.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await migrate(drizzle(client), { migrationsFolder: join(process.cwd(), "drizzle") });
  } finally {
    await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    await client.end();
  }
}
