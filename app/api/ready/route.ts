import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { logger } from "@/server/logger";

/**
 * Prontidão: o app consegue falar com o banco? Usado pelo smoke test do deploy
 * e pelo monitor de uptime. O HEALTHCHECK do container usa /api/health (só o
 * processo), para uma queda do banco não derrubar o app em loop de reinício.
 */
export async function GET() {
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
