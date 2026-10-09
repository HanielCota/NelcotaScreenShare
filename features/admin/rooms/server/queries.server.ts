import { and, desc, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import {
  adminUsers,
  auditLogs,
  roomInvites,
  roomParticipations,
  rooms,
  shareSessions,
  users,
} from "@/server/db/schema";
import { keysetList, sortableColumn } from "@/server/table/keyset.server";
import { exportRows } from "@/server/table/iterate.server";
import { periodFilters } from "@/server/table/period-filter.server";
import { likeEscape } from "@/server/table/search.server";
import { loadRoomParams, type RoomParams } from "../domain/search-params";

export interface RoomRow {
  id: string;
  code: string;
  status: "active" | "finished";
  deleted: boolean;
  startedAt: string;
  finishedAt: string | null;
  lastActivityAt: string;
  peak: number;
  shares: number;
}

function statusFilters(status: RoomParams["status"]): SQL[] {
  if (status === "excluida") return [isNotNull(rooms.deletedAt)];
  const filters: SQL[] = [isNull(rooms.deletedAt)];
  if (status === "ativa") filters.push(eq(rooms.status, "active"));
  if (status === "encerrada") filters.push(eq(rooms.status, "finished"));
  return filters;
}

function filtersFrom(params: RoomParams): SQL[] {
  const filters: SQL[] = statusFilters(params.status);
  filters.push(...periodFilters(rooms.startedAt, params));
  const term = params.q.trim().toLowerCase().slice(0, 40);
  if (term) filters.push(sql`${rooms.code} like ${`%${likeEscape(term)}%`}`);
  return filters;
}

type Raw = Omit<RoomRow, "startedAt" | "finishedAt" | "lastActivityAt" | "deleted"> & {
  startedAt: Date;
  finishedAt: Date | null;
  lastActivityAt: Date;
  deletedAt: Date | null;
  sortKey: string | null;
};

const SORTS = {
  atividade: sortableColumn<Raw>(rooms.lastActivityAt, "timestamptz"),
  inicio: sortableColumn<Raw>(rooms.startedAt, "timestamptz"),
  pico: sortableColumn<Raw>(rooms.peakParticipants, "int"),
};

export function listRooms(
  db: DbExecutor,
  params: RoomParams,
  limit: number,
  { count = true }: { count?: boolean } = {},
) {
  const where = filtersFrom(params);
  const sort = SORTS[params.por];
  return keysetList(db, {
    sort,
    idColumn: rooms.id,
    params,
    limit,
    count,
    rows: (clauses) =>
      db
        .select({
          id: rooms.id,
          code: rooms.code,
          status: rooms.status,
          deletedAt: rooms.deletedAt,
          startedAt: rooms.startedAt,
          finishedAt: rooms.finishedAt,
          lastActivityAt: rooms.lastActivityAt,
          peak: rooms.peakParticipants,
          // Only for the rows on the page (index share_sessions_room_idx).
          // Explicit "rooms"."id": without a join, Drizzle writes just "id" and the subquery
          // would compare its own table (count always zero).
          shares: sql<number>`(select count(*)::int from ${shareSessions}
            where ${shareSessions.roomId} = ${sql.identifier("rooms")}.${sql.identifier("id")})`,
          sortKey: sort.key,
        })
        .from(rooms)
        .where(and(...where, clauses.where))
        .orderBy(...clauses.orderBy)
        .limit(clauses.limit),
    countQuery: sql`select 1 from ${rooms} where ${and(...where)}`,
    toItem: ({ sortKey: _, deletedAt, ...row }): RoomRow => ({
      ...row,
      deleted: deletedAt !== null,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      lastActivityAt: row.lastActivityAt.toISOString(),
    }),
  });
}

export const iterateRooms = exportRows(listRooms);

export async function roomIdsForFilter(db: DbExecutor, search: URLSearchParams, limit: number) {
  const rows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(...filtersFrom(loadRoomParams(search))))
    .limit(limit);
  return rows.map((row) => row.id);
}

/** Room with participants, screen shares, invites and admin panel history. */
export async function getRoomDetail(db: DbExecutor, id: string) {
  const [room] = await db
    .select({
      id: rooms.id,
      code: rooms.code,
      status: rooms.status,
      startedAt: rooms.startedAt,
      finishedAt: rooms.finishedAt,
      lastActivityAt: rooms.lastActivityAt,
      peak: rooms.peakParticipants,
      note: rooms.note,
      deletedAt: rooms.deletedAt,
      createdById: rooms.createdByUserId,
      createdByName: users.name,
    })
    .from(rooms)
    .leftJoin(users, eq(users.id, rooms.createdByUserId))
    .where(eq(rooms.id, id));
  if (!room) return null;

  const [participants, shares, invites, history] = await Promise.all([
    db
      .select({
        id: roomParticipations.id,
        userId: roomParticipations.userId,
        name: sql<string>`coalesce(${roomParticipations.displayName}, ${users.name}, ${roomParticipations.livekitIdentity})`,
        joinedAt: roomParticipations.joinedAt,
        leftAt: roomParticipations.leftAt,
        leaveReason: roomParticipations.leaveReason,
      })
      .from(roomParticipations)
      .leftJoin(users, eq(users.id, roomParticipations.userId))
      .where(eq(roomParticipations.roomId, id))
      .orderBy(desc(roomParticipations.joinedAt))
      .limit(200),
    db
      .select({
        id: shareSessions.id,
        name: sql<string>`coalesce(${roomParticipations.displayName}, ${users.name}, ${roomParticipations.livekitIdentity})`,
        startedAt: shareSessions.startedAt,
        endedAt: shareSessions.endedAt,
        withAudio: shareSessions.withAudio,
      })
      .from(shareSessions)
      .innerJoin(roomParticipations, eq(roomParticipations.id, shareSessions.participationId))
      .leftJoin(users, eq(users.id, roomParticipations.userId))
      .where(eq(shareSessions.roomId, id))
      .orderBy(desc(shareSessions.startedAt))
      .limit(200),
    db
      .select({
        id: roomInvites.id,
        label: roomInvites.label,
        uses: roomInvites.uses,
        maxUses: roomInvites.maxUses,
        expiresAt: roomInvites.expiresAt,
        revokedAt: roomInvites.revokedAt,
        createdAt: roomInvites.createdAt,
        createdBy: adminUsers.name,
        state: sql<"active" | "revoked" | "expired" | "exhausted">`case
          when ${roomInvites.revokedAt} is not null then 'revoked'
          when ${roomInvites.expiresAt} <= now() then 'expired'
          when ${roomInvites.maxUses} is not null and ${roomInvites.uses} >= ${roomInvites.maxUses} then 'exhausted'
          else 'active' end`,
      })
      .from(roomInvites)
      .innerJoin(adminUsers, eq(adminUsers.id, roomInvites.createdBy))
      .where(and(eq(roomInvites.roomId, id), isNull(roomInvites.deletedAt)))
      .orderBy(desc(roomInvites.createdAt))
      .limit(100),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
        adminName: adminUsers.name,
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(adminUsers.id, auditLogs.actorAdminId))
      .where(
        sql`(${auditLogs.resourceType} = 'room' and ${auditLogs.resourceId} = ${id})
          or (${auditLogs.resourceType} = 'room_invite' and ${auditLogs.metadata}->>'sala' = ${id})`,
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
  ]);
  return { room, participants, shares, invites, history };
}
