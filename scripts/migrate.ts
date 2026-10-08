/**
 * Applies the pending migrations in `drizzle/`. Runs as a job separate from the app:
 * on deploy (CI → `docker run … node dist/migrate.mjs`), in dev (`pnpm db:migrate`)
 * and when preparing the integration tests. The app never migrates on boot.
 *
 * Usage: MIGRATOR_DATABASE_URL=postgres://… node scripts/migrate.ts
 *        (accepts DATABASE_URL when it is the migration user itself, as in the deploy job)
 *
 * Self-contained file (no aliases or framework dependency) so it runs with plain Node
 * and can be bundled into a single file in the Docker image.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/** Fixed app number: identifies the migration lock in Postgres. */
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
    // A migration waiting on a lock for too long blocks the app too: give up and fail the deploy.
    await client.query("set lock_timeout = '5s'");
    // Two concurrent runs (overlapping deploys) wait for each other.
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
    console.error("[migrate] set MIGRATOR_DATABASE_URL (the migration user, not the app's)");
    process.exit(1);
  }
  const started = Date.now();
  runMigrations(url, process.env.MIGRATIONS_DIR).then(
    () => console.info(`[migrate] migrations up to date (${Date.now() - started} ms)`),
    (error: unknown) => {
      console.error("[migrate] failed", error);
      process.exit(1);
    },
  );
}
