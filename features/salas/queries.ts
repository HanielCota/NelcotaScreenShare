import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import { endOfDayInSaoPaulo, startOfDayInSaoPaulo } from "@/lib/format";
import type { DbExecutor } from "@/server/db";
import {
  adminUsers,
  auditLogs,
  roomInvites,
  roomParticipations,
  rooms,
  shareSessions,
  users,
} from "@/server/db/schema";
import {
  approximateCount,
  decodeCursor,
  keysetClauses,
  keysetPage,
  sortableColumn,
  type KeysetQuery,
} from "@/server/table/keyset";
import { likeEscape } from "@/server/table/search";
import { loadRoomParams, type RoomParams } from "./search-params";

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

function filtersFrom(params: RoomParams): SQL[] {
  const filters: SQL[] = [];
  if (params.status === "excluida") filters.push(isNotNull(rooms.deletedAt));
  else {
    filters.push(isNull(rooms.deletedAt));
    if (params.status === "ativa") filters.push(eq(rooms.status, "active"));
    if (params.status === "encerrada") filters.push(eq(rooms.status, "finished"));
  }
  const from = params.de ? startOfDayInSaoPaulo(params.de) : undefined;
  if (from) filters.push(gte(rooms.startedAt, from));
  const until = params.ate ? endOfDayInSaoPaulo(params.ate) : undefined;
  if (until) filters.push(lt(rooms.startedAt, until));
  const q = params.q.trim().toLowerCase().slice(0, 40);
  if (q) filters.push(sql`${rooms.code} like ${`%${likeEscape(q)}%`}`);
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

export async function listRooms(
  db: DbExecutor,
  params: RoomParams,
  limit: number,
  { count = true }: { count?: boolean } = {},
) {
  const where = filtersFrom(params);
  const sort = SORTS[params.por];
  const query: KeysetQuery<Raw> = {
    sort,
    idColumn: rooms.id,
    direction: params.ordem,
    cursor: decodeCursor(params.cursor),
    page: params.dir,
    limit,
  };
  const clauses = keysetClauses(query);
  const rows = await db
    .select({
      id: rooms.id,
      code: rooms.code,
      status: rooms.status,
      deletedAt: rooms.deletedAt,
      startedAt: rooms.startedAt,
      finishedAt: rooms.finishedAt,
      lastActivityAt: rooms.lastActivityAt,
      peak: rooms.peakParticipants,
      // Só para as linhas da página (índice share_sessions_room_idx).
      shares: sql<number>`(select count(*)::int from ${shareSessions}
        where ${shareSessions.roomId} = ${rooms.id})`,
      sortKey: sort.key,
    })
    .from(rooms)
    .where(and(...where, clauses.where))
    .orderBy(...clauses.orderBy)
    .limit(clauses.limit);
  const page = keysetPage(rows, query);
  const total = count
    ? await approximateCount(db, sql`select 1 from ${rooms} where ${and(...where)}`)
    : { total: 0, capped: false };
  return {
    items: page.items.map(({ sortKey: _, deletedAt, ...row }): RoomRow => ({
      ...row,
      deleted: deletedAt !== null,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
      lastActivityAt: row.lastActivityAt.toISOString(),
    })),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
    ...total,
  };
}

export async function* iterateRooms(db: DbExecutor, params: RoomParams) {
  let cursor: string | null = null;
  for (;;) {
    const page = await listRooms(db, { ...params, cursor, dir: "next" }, 1000, { count: false });
    yield* page.items;
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
  }
}

export async function roomIdsForFilter(db: DbExecutor, search: URLSearchParams, limit: number) {
  const rows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(...filtersFrom(loadRoomParams(search))))
    .limit(limit);
  return rows.map((row) => row.id);
}

/** Sala com participantes, compartilhamentos, convites e histórico do painel. */
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
export type RoomDetail = NonNullable<Awaited<ReturnType<typeof getRoomDetail>>>;
