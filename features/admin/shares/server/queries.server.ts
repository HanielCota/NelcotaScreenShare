import { and, eq, gte, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { roomParticipations, rooms, shareSessions, users } from "@/server/db/schema";
import { keysetList, sortableColumn } from "@/server/table/keyset.server";
import { exportRows } from "@/server/table/iterate.server";
import { periodFilters } from "@/server/table/period-filter.server";
import { likeEscape } from "@/server/table/search.server";
import type { ShareParams } from "../domain/search-params";

export interface ShareRow {
  id: string;
  roomId: string;
  roomCode: string;
  userId: string | null;
  person: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  withAudio: boolean;
}

function filtersFrom(params: ShareParams): SQL[] {
  const filters: SQL[] = [];
  filters.push(...periodFilters(shareSessions.startedAt, params));
  if (params.audio) filters.push(eq(shareSessions.withAudio, params.audio === "com"));
  if (params.situacao === "andamento") filters.push(isNull(shareSessions.endedAt));
  if (params.situacao === "finalizados") filters.push(isNotNull(shareSessions.endedAt));
  if (params.min !== null && params.min > 0) {
    filters.push(gte(shareSessions.durationSeconds, Math.min(params.min, 100_000) * 60));
  }
  const room = params.sala.trim().toLowerCase().slice(0, 40);
  if (room) filters.push(sql`${rooms.code} like ${`%${likeEscape(room)}%`}`);
  return filters;
}

type Raw = Omit<ShareRow, "startedAt" | "endedAt"> & {
  startedAt: Date;
  endedAt: Date | null;
  sortKey: string | null;
};

const SORT = sortableColumn<Raw>(shareSessions.startedAt, "timestamptz");

function baseQuery(db: DbExecutor) {
  return db
    .select({
      id: shareSessions.id,
      roomId: rooms.id,
      roomCode: rooms.code,
      userId: roomParticipations.userId,
      person: sql<string>`coalesce(${roomParticipations.displayName}, ${users.name}, ${roomParticipations.livekitIdentity})`,
      startedAt: shareSessions.startedAt,
      endedAt: shareSessions.endedAt,
      durationSeconds: shareSessions.durationSeconds,
      withAudio: shareSessions.withAudio,
      sortKey: SORT.key,
    })
    .from(shareSessions)
    .innerJoin(rooms, eq(rooms.id, shareSessions.roomId))
    .innerJoin(roomParticipations, eq(roomParticipations.id, shareSessions.participationId))
    .leftJoin(users, eq(users.id, roomParticipations.userId));
}

export function listShares(
  db: DbExecutor,
  params: ShareParams,
  limit: number,
  { count = true }: { count?: boolean } = {},
) {
  const where = filtersFrom(params);
  return keysetList(db, {
    sort: SORT,
    idColumn: shareSessions.id,
    params,
    limit,
    count,
    rows: (clauses) =>
      baseQuery(db)
        .where(and(...where, clauses.where))
        .orderBy(...clauses.orderBy)
        .limit(clauses.limit),
    countQuery: sql`select 1 from ${shareSessions}
      inner join ${rooms} on ${rooms.id} = ${shareSessions.roomId}
      ${where.length > 0 ? sql`where ${and(...where)}` : sql``}`,
    toItem: ({ sortKey: _, ...row }): ShareRow => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
    }),
  });
}

export const iterateShares = exportRows(listShares);
