import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import type { adminSessions, userSessions } from "@/server/db/schema";

/** Still-valid sessions of an account, from the most recently used backwards. */
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
