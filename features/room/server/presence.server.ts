import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { roomParticipations, rooms } from "@/server/db/schema";

/**
 * Who is in the room now (from the open participations the LiveKit
 * webhook records). So the pre-join screen can say "2 pessoas já estão na sala".
 */
export async function roomPresence(db: DbExecutor, code: string): Promise<{ online: number }> {
  const [row] = await db
    .select({
      // Explicit "rooms"."id": without a join, Drizzle writes just "id" and the subquery
      // would compare against its own table (count always zero).
      online: sql<number>`(select count(*)::int from ${roomParticipations} as here
        where here.room_id = ${sql.identifier("rooms")}.${sql.identifier("id")} and here.left_at is null)`,
    })
    .from(rooms)
    .where(and(eq(rooms.code, code), eq(rooms.status, "active"), isNull(rooms.deletedAt)));
  return { online: row?.online ?? 0 };
}
