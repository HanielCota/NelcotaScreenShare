import { and, desc, eq, isNull, max, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { roomParticipations, rooms } from "@/server/db/schema";
import type { RecentRoom } from "@/features/room/domain/recent-room";

/**
 * Rooms the person has been in, from most recent to oldest, to
 * return with one click from the home page (index room_participations_user_idx).
 */
export async function recentRoomsFor(
  db: DbExecutor,
  userId: string,
  limit = 6,
): Promise<RecentRoom[]> {
  const lastJoined = max(roomParticipations.joinedAt);
  const rows = await db
    .select({
      code: rooms.code,
      status: rooms.status,
      lastJoinedAt: lastJoined,
      // Explicit "rooms"."id": without a join, Drizzle writes just "id" and the subquery
      // would compare against its own table (count always zero).
      online: sql<number>`(select count(*)::int from ${roomParticipations} as here
        where here.room_id = ${sql.identifier("rooms")}.${sql.identifier("id")} and here.left_at is null)`,
    })
    .from(roomParticipations)
    .innerJoin(rooms, eq(rooms.id, roomParticipations.roomId))
    .where(and(eq(roomParticipations.userId, userId), isNull(rooms.deletedAt)))
    .groupBy(rooms.id)
    .orderBy(desc(lastJoined))
    .limit(limit);
  return rows.map((row) => ({
    code: row.code,
    live: row.status === "active",
    online: row.status === "active" ? row.online : 0,
    lastJoinedAt: (row.lastJoinedAt ?? new Date()).toISOString(),
  }));
}
