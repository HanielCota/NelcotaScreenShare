import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import type { adminSessions, userSessions } from "@/server/db/schema";

/** Sessões ainda válidas de uma conta, da usada mais recentemente para trás. */
export async function listActiveSessions(
  db: DbExecutor,
  table: typeof userSessions | typeof adminSessions,
  ownerId: string,
) {
  return db
    .select({
      id: table.id,
      ipAddress: table.ipAddress,
      userAgent: table.userAgent,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    })
    .from(table)
    .where(and(eq(table.userId, ownerId), gt(table.expiresAt, sql`now()`)))
    .orderBy(desc(table.updatedAt));
}
