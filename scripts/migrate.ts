/**
 * Aplica as migrações pendentes de `drizzle/`. Roda como job separado do app:
 * no deploy (CI → `docker run … node dist/migrate.mjs`), em dev (`pnpm db:migrate`)
 * e na preparação dos testes de integração. O app nunca migra no boot.
 *
 * Uso: MIGRATOR_DATABASE_URL=postgres://… node scripts/migrate.ts
 *      (aceita DATABASE_URL quando é o próprio usuário de migração, como no job de deploy)
 *
 * Arquivo autossuficiente (sem `@/` nem `server-only`) para rodar com o Node
 * direto e para ser empacotado num único arquivo na imagem Docker.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/** Número fixo do app: identifica a trava de migração no Postgres. */
const MIGRATION_LOCK_ID = 7_340_118;

export async function runMigrations(
  url: string,
  migrationsFolder = join(process.cwd(), "drizzle"),
): Promise<void> {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 10_000,
    application_name: "nelcota-migrate",
  });
  await client.connect();
  try {
    // Uma migração esperando lock por muito tempo trava o app junto: desiste e falha o deploy.
    await client.query("set lock_timeout = '5s'");
    // Duas execuções ao mesmo tempo (deploys sobrepostos) esperam uma pela outra.
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    await client.end();
  }
}

const isEntryPoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  const url = process.env.MIGRATOR_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate] defina MIGRATOR_DATABASE_URL (usuário de migração, não o do app)");
    process.exit(1);
  }
  const started = Date.now();
  runMigrations(url, process.env.MIGRATIONS_DIR ?? join(process.cwd(), "drizzle")).then(
    () => console.info(`[migrate] migrações em dia (${Date.now() - started} ms)`),
    (error: unknown) => {
      console.error("[migrate] falhou", error);
      process.exit(1);
    },
  );
}
