import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseUrl } from "@/server/env.server";
import { logger } from "@/server/logger.server";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** Drizzle transaction (the same as `db`, but inside `db.transaction`). */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Whoever runs the query: the normal connection or a transaction. */
export type DbExecutor = Database | Transaction;

// In Vite modules reload on every edit: keeping the pool on globalThis
// avoids opening a new connection per reload.
const globalForDb = globalThis as typeof globalThis & { nelcotaDb?: Database; nelcotaPool?: Pool };

/** Postgres connection (DATABASE_URL is required; see server/env.server.ts). */
export function getDb(): Database {
  if (globalForDb.nelcotaDb) return globalForDb.nelcotaDb;

  const pool = new Pool({
    connectionString: databaseUrl(),
    // Few people at a time: a small pool is enough and does not exhaust Postgres.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  // An idle connection that drops (Postgres restart) must not bring the process down.
  pool.on("error", (error) => logger.error({ err: error }, "conexão ociosa do Postgres falhou"));

  globalForDb.nelcotaDb = drizzle(pool, { schema });
  globalForDb.nelcotaPool = pool;
  return globalForDb.nelcotaDb;
}

/** Closes the pool after in-flight requests and maintenance finish. */
export async function closeDb(): Promise<void> {
  const pool = globalForDb.nelcotaPool;
  globalForDb.nelcotaDb = undefined;
  globalForDb.nelcotaPool = undefined;
  await pool?.end();
}
