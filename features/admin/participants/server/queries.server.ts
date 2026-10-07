import { and, desc, eq, gt, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import {
  auditLogs,
  adminUsers,
  roomParticipations,
  rooms,
  shareSessions,
  users,
  userSessions,
} from "@/server/db/schema";
import {
  approximateCount,
  decodeCursor,
  keysetClauses,
  keysetPage,
  sortableColumn,
  type KeysetQuery,
} from "@/server/table/keyset.server";
import { iterateAll } from "@/server/table/iterate.server";
import { periodFilters } from "@/server/table/period-filter.server";
import { unaccentLike } from "@/server/table/search.server";
import {
  loadParticipantParams,
  type ParticipantParams,
  type ParticipantStatus,
} from "../domain/search-params";

export interface ParticipantRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: ParticipantStatus;
  createdAt: string;
  lastSeenAt: string | null;
  participations: number;
}

const statusExpression = sql<ParticipantStatus>`case
  when ${users.deletedAt} is not null then 'excluido'
  when ${users.blockedAt} is not null then 'bloqueado'
  when not ${users.emailVerified} then 'nao_verificado'
  else 'ativo' end`;

function filtersFrom(params: ParticipantParams): SQL[] {
  const filters: SQL[] = [];
  switch (params.status) {
    case "excluido":
      filters.push(isNotNull(users.deletedAt));
      break;
    case "bloqueado":
      filters.push(isNull(users.deletedAt), isNotNull(users.blockedAt));
      break;
    case "nao_verificado":
      filters.push(
        isNull(users.deletedAt),
        isNull(users.blockedAt),
        eq(users.emailVerified, false),
      );
      break;
    case "ativo":
      filters.push(isNull(users.deletedAt), isNull(users.blockedAt), eq(users.emailVerified, true));
      break;
    default:
      // No status filter: deleted accounts are left out.
      filters.push(isNull(users.deletedAt));
  }
  filters.push(...periodFilters(users.createdAt, params));
  const q = params.q.trim().slice(0, 100);
  if (q) filters.push(unaccentLike(sql`${users.name} || ' ' || ${users.email}`, q));
  return filters;
}

type Raw = Omit<ParticipantRow, "createdAt" | "lastSeenAt"> & {
  createdAt: Date;
  lastSeenAt: Date | null;
  sortKey: string | null;
};

const SORTS = {
  cadastro: sortableColumn<Raw>(users.createdAt, "timestamptz"),
  acesso: sortableColumn<Raw>(users.lastSeenAt, "timestamptz"),
  participacoes: sortableColumn<Raw>(users.participationsCount, "int"),
};

export async function listParticipants(
  db: DbExecutor,
  params: ParticipantParams,
  limit: number,
  { count = true }: { count?: boolean } = {},
) {
  const where = filtersFrom(params);
  const sort = SORTS[params.por];
  const query: KeysetQuery<Raw> = {
    sort,
    idColumn: users.id,
    direction: params.ordem,
    cursor: decodeCursor(params.cursor),
    page: params.dir,
    limit,
  };
  const clauses = keysetClauses(query);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      status: statusExpression,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      participations: users.participationsCount,
      sortKey: sort.key,
    })
    .from(users)
    .where(and(...where, clauses.where))
    .orderBy(...clauses.orderBy)
    .limit(clauses.limit);
  const page = keysetPage(rows, query);
  const total = count
    ? await approximateCount(db, sql`select 1 from ${users} where ${and(...where)}`)
    : { total: 0, capped: false };
  return {
    items: page.items.map(({ sortKey: _, ...row }): ParticipantRow => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    })),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
    ...total,
  };
}

/** Every row of the filter in batches (CSV). */
export function iterateParticipants(db: DbExecutor, params: ParticipantParams) {
  return iterateAll((cursor) =>
    listParticipants(db, { ...params, cursor, dir: "next" }, 1000, { count: false }),
  );
}

/** IDs matching the filter ("all results" bulk actions). */
export async function participantIdsForFilter(
  db: DbExecutor,
  search: URLSearchParams,
  limit: number,
): Promise<string[]> {
  const params = loadParticipantParams(search);
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...filtersFrom(params)))
    .limit(limit);
  return rows.map((row) => row.id);
}

/** Account, active sessions, room history and what the admin panel did to it. */
export async function getParticipantDetail(db: DbExecutor, id: string) {
  const [account] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      status: statusExpression,
      blockedAt: users.blockedAt,
      blockReason: users.blockReason,
      anonymizedAt: users.anonymizedAt,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      participations: users.participationsCount,
    })
    .from(users)
    .where(eq(users.id, id));
  if (!account) return null;

  const [sessions, timeline, history] = await Promise.all([
    db
      .select({
        id: userSessions.id,
        createdAt: userSessions.createdAt,
        updatedAt: userSessions.updatedAt,
        ipAddress: userSessions.ipAddress,
        userAgent: userSessions.userAgent,
      })
      .from(userSessions)
      .where(and(eq(userSessions.userId, id), gt(userSessions.expiresAt, sql`now()`)))
      .orderBy(desc(userSessions.updatedAt))
      .limit(50),
    db
      .select({
        id: roomParticipations.id,
        roomId: rooms.id,
        roomCode: rooms.code,
        displayName: roomParticipations.displayName,
        joinedAt: roomParticipations.joinedAt,
        leftAt: roomParticipations.leftAt,
        leaveReason: roomParticipations.leaveReason,
        ip: sql<string | null>`host(${roomParticipations.ip})`,
        shares: sql<number>`(select count(*)::int from ${shareSessions}
          where ${shareSessions.participationId} = ${roomParticipations.id})`,
      })
      .from(roomParticipations)
      .innerJoin(rooms, eq(rooms.id, roomParticipations.roomId))
      .where(eq(roomParticipations.userId, id))
      .orderBy(desc(roomParticipations.joinedAt))
      .limit(100),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        createdAt: auditLogs.createdAt,
        adminName: adminUsers.name,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(adminUsers.id, auditLogs.actorAdminId))
      .where(and(eq(auditLogs.resourceType, "user"), eq(auditLogs.resourceId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
  ]);
  return { account, sessions, timeline, history };
}
