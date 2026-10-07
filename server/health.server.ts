import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/index.server";
import { getEnv } from "@/server/env.server";
import { logger } from "@/server/logger.server";

/** Liveness: only the process answers (container HEALTHCHECK). */
export function liveness() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Readiness: can the app talk to the database? Used by the deploy smoke test
 * and by the uptime monitor. The container HEALTHCHECK uses /api/health (process
 * only), so a database outage does not knock the app into a restart loop.
 */
export async function readiness() {
  const headers = { "Cache-Control": "no-store" };
  const version = getEnv().APP_VERSION ?? "dev";
  const db = getDb();
  if (!db) return Response.json({ status: "ok", version, database: "disabled" }, { headers });

  const started = performance.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2_000)),
    ]);
  } catch (error) {
    logger.warn({ err: error }, "readiness: banco indisponível");
    return Response.json(
      { status: "unavailable", version, database: "down" },
      { status: 503, headers },
    );
  }
  const latencyMs = Math.round(performance.now() - started);
  return Response.json({ status: "ok", version, database: "up", latencyMs }, { headers });
}
