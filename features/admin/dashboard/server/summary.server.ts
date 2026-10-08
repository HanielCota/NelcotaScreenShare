import { and, count, eq, gte, isNull } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { proInterests, roomParticipations, rooms, shareSessions, users } from "@/server/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardSummary {
  activeRooms: number;
  peopleOnline: number;
  sharesToday: number;
  newParticipants: number;
  /** E-mails on the Pro launch list (landing page). */
  proInterests: number;
}

/**
 * What the panel opens with: what is live now and what moved recently.
 * "Today" is the last 24 hours and "new" the last 7 days, so the numbers do not
 * depend on the server's time zone.
 */
export async function getDashboardSummary(
  db: DbExecutor,
  now = new Date(),
): Promise<DashboardSummary> {
  const dayAgo = new Date(now.getTime() - DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [activeRooms, peopleOnline, sharesToday, newParticipants, proList] = await Promise.all([
    db
      .select({ value: count() })
      .from(rooms)
      .where(and(eq(rooms.status, "active"), isNull(rooms.deletedAt))),
    db
      .select({ value: count() })
      .from(roomParticipations)
      .innerJoin(rooms, eq(rooms.id, roomParticipations.roomId))
      .where(
        and(isNull(roomParticipations.leftAt), eq(rooms.status, "active"), isNull(rooms.deletedAt)),
      ),
    db.select({ value: count() }).from(shareSessions).where(gte(shareSessions.startedAt, dayAgo)),
    db
      .select({ value: count() })
      .from(users)
      .where(and(gte(users.createdAt, weekAgo), isNull(users.deletedAt))),
    db.select({ value: count() }).from(proInterests),
  ]);

  return {
    activeRooms: activeRooms[0]?.value ?? 0,
    peopleOnline: peopleOnline[0]?.value ?? 0,
    sharesToday: sharesToday[0]?.value ?? 0,
    newParticipants: newParticipants[0]?.value ?? 0,
    proInterests: proList[0]?.value ?? 0,
  };
}
