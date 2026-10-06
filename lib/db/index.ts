import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// No `next dev` os módulos recarregam a cada edição: guardar o pool no globalThis
// evita abrir uma conexão nova por recarga.
const globalForDb = globalThis as typeof globalThis & { nelcotaDb?: Database };

/** Conexão com o Postgres, ou `undefined` sem DATABASE_URL (o app usa os padrões). */
export function getDb(): Database | undefined {
  if (globalForDb.nelcotaDb) return globalForDb.nelcotaDb;
  const url = getEnv().DATABASE_URL;
  if (!url) return undefined;

  const pool = new Pool({
    connectionString: url,
    // Poucas pessoas por vez: um pool pequeno basta e não esgota o Postgres.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  // Conexão ociosa que cai (restart do Postgres) não pode derrubar o processo.
  pool.on("error", (error) => console.error("[db] conexão ociosa falhou", error.message));

  globalForDb.nelcotaDb = drizzle(pool, { schema });
  return globalForDb.nelcotaDb;
}
