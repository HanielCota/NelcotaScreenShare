import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseUrl } from "@/server/env";
import { logger } from "@/server/logger";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** Transação do Drizzle (o mesmo que `db`, mas dentro de `db.transaction`). */
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Quem executa a consulta: a conexão normal ou uma transação. */
export type DbExecutor = Database | Transaction;

// No `next dev` os módulos recarregam a cada edição: guardar o pool no globalThis
// evita abrir uma conexão nova por recarga.
const globalForDb = globalThis as typeof globalThis & { nelcotaDb?: Database };

/** Conexão com o Postgres (DATABASE_URL é obrigatória; ver server/env.ts). */
export function getDb(): Database {
  if (globalForDb.nelcotaDb) return globalForDb.nelcotaDb;

  const pool = new Pool({
    connectionString: databaseUrl(),
    // Poucas pessoas por vez: um pool pequeno basta e não esgota o Postgres.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  // Conexão ociosa que cai (restart do Postgres) não pode derrubar o processo.
  pool.on("error", (error) => logger.error({ err: error }, "conexão ociosa do Postgres falhou"));

  globalForDb.nelcotaDb = drizzle(pool, { schema });
  return globalForDb.nelcotaDb;
}
