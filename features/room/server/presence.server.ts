import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { roomParticipations, rooms, users } from "@/server/db/schema";
import type { RoomPresence } from "@/features/room/domain/presence";

/**
 * Who is in the room now (from the open participations the LiveKit
 * webhook records). So the pre-join screen can say "2 pessoas já estão na sala".
 */
export async function roomPresence(db: DbExecutor, code: string): Promise<RoomPresence> {
  const participants = await db
    .select({
      id: roomParticipations.id,
      name: sql<string>`coalesce(${roomParticipations.displayName}, ${users.name}, 'Participante')`,
      image: users.image,
    })
    .from(roomParticipations)
    .innerJoin(rooms, eq(roomParticipations.roomId, rooms.id))
    .leftJoin(
      users,
      and(
        eq(roomParticipations.userId, users.id),
        isNull(users.deletedAt),
        isNull(users.anonymizedAt),
      ),
    )
    .where(
      and(
        eq(rooms.code, code),
        eq(rooms.status, "active"),
        isNull(rooms.deletedAt),
        isNull(roomParticipations.leftAt),
      ),
    )
    .orderBy(asc(roomParticipations.joinedAt), asc(roomParticipations.id));
  return { online: participants.length, participants };
}
