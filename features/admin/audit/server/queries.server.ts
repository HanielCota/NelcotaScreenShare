import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { DbExecutor } from "@/server/db/index.server";
import { adminUsers, auditLogs, users } from "@/server/db/schema";
import {
  approximateCount,
  decodeCursor,
  keysetClauses,
  keysetPage,
  timestampCursor,
  timestampKey,
  type KeysetQuery,
} from "@/server/table/keyset.server";
import { iterateAll } from "@/server/table/iterate.server";
import { periodFilters } from "@/server/table/period-filter.server";
import type { AuditParams } from "../domain/search-params";

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actor:
    | { kind: "admin"; id: string; name: string; email: string }
    | { kind: "user"; id: string; name: string }
    | { kind: "system" };
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  changes: Record<string, { antes: unknown; depois: unknown }> | null;
  metadata: Record<string, unknown>;
}

// Filters coming from the URL: validated before becoming SQL.
const actionFilter = z.string().regex(/^[a-z][a-z_]*\.[a-z][a-z_]*$/);
const resourceFilter = z.string().regex(/^[a-z_]{1,40}$/);

function filtersFrom(params: AuditParams): SQL[] {
  const filters: SQL[] = [];
  const action = actionFilter.safeParse(params.acao);
  if (action.success) filters.push(eq(auditLogs.action, action.data));
  const resource = resourceFilter.safeParse(params.recurso);
  if (resource.success) filters.push(eq(auditLogs.resourceType, resource.data));
  const actor = z.uuid().safeParse(params.autor);
  if (actor.success) filters.push(eq(auditLogs.actorAdminId, actor.data));
  filters.push(...periodFilters(auditLogs.createdAt, params));
  const q = params.q.trim().slice(0, 100);
  if (q) {
    const search = or(eq(auditLogs.requestId, q), eq(auditLogs.resourceId, q));
    if (search) filters.push(search);
  }
  return filters;
}

interface RawRow {
  id: string;
  createdAt: Date;
  /** Exact created_at, for the cursor. */
  sortKey: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorAdminId: string | null;
  actorUserId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  userName: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  changes: Record<string, { antes: unknown; depois: unknown }> | null;
  metadata: Record<string, unknown>;
}

function toRow(raw: RawRow): AuditRow {
  return {
    id: raw.id,
    createdAt: raw.createdAt.toISOString(),
    action: raw.action,
    resourceType: raw.resourceType,
    resourceId: raw.resourceId,
    actor: raw.actorAdminId
      ? {
          kind: "admin",
          id: raw.actorAdminId,
          name: raw.adminName ?? "Admin",
          email: raw.adminEmail ?? "",
        }
      : raw.actorUserId
        ? { kind: "user", id: raw.actorUserId, name: raw.userName ?? "Participante" }
        : { kind: "system" },
    ip: raw.ip,
    userAgent: raw.userAgent,
    requestId: raw.requestId,
    changes: raw.changes,
    metadata: raw.metadata,
  };
}

const selection = {
  id: auditLogs.id,
  createdAt: auditLogs.createdAt,
  sortKey: timestampKey(auditLogs.createdAt),
  action: auditLogs.action,
  resourceType: auditLogs.resourceType,
  resourceId: auditLogs.resourceId,
  actorAdminId: auditLogs.actorAdminId,
  actorUserId: auditLogs.actorUserId,
  adminName: adminUsers.name,
  adminEmail: adminUsers.email,
  userName: users.name,
  ip: sql<string | null>`host(${auditLogs.ip})`,
  userAgent: auditLogs.userAgent,
  requestId: auditLogs.requestId,
  changes: auditLogs.changes,
  metadata: auditLogs.metadata,
};

/** One page of the audit log (keyset on created_at, id) with the actor names. */
export async function listAuditLogs(
  db: DbExecutor,
  params: AuditParams,
  limit: number,
  { count = true }: { count?: boolean } = {},
) {
  const where = filtersFrom(params);
  const query: KeysetQuery<RawRow> = {
    sort: {
      column: auditLogs.createdAt,
      valueOf: (row) => row.sortKey,
      parse: timestampCursor.parse,
    },
    idColumn: auditLogs.id,
    direction: params.ordem,
    cursor: decodeCursor(params.cursor),
    page: params.dir,
    limit,
  };
  const clauses = keysetClauses(query);
  const rowsQuery = db
    .select(selection)
    .from(auditLogs)
    .leftJoin(adminUsers, eq(adminUsers.id, auditLogs.actorAdminId))
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(and(...where, clauses.where))
    .orderBy(...clauses.orderBy)
    .limit(clauses.limit);

  // The export iterates in batches and does not need the total for each batch.
  const totalQuery = count
    ? approximateCount(
        db,
        sql`select 1 from ${auditLogs} ${where.length ? sql`where ${and(...where)}` : sql``}`,
      )
    : { total: 0, capped: false };
  const [rows, total] = await Promise.all([rowsQuery, totalQuery]);
  const page = keysetPage(rows, query);
  return {
    items: page.items.map(toRow),
    nextCursor: page.nextCursor,
    prevCursor: page.prevCursor,
    ...total,
  };
}

/** Every row of the filter, in keyset batches (streamed CSV export). */
export function iterateAuditLogs(db: DbExecutor, params: AuditParams, batch = 1000) {
  return iterateAll((cursor) =>
    listAuditLogs(db, { ...params, cursor, dir: "next" }, batch, { count: false }),
  );
}

/** Filter options: the existing actions and resource types, and the admins. */
export async function auditFilterOptions(db: DbExecutor) {
  const [actions, resources, admins] = await Promise.all([
    db
      .selectDistinct({ value: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action)
      .limit(200),
    db
      .selectDistinct({ value: auditLogs.resourceType })
      .from(auditLogs)
      .orderBy(auditLogs.resourceType)
      .limit(100),
    db
      .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt))
      .limit(200),
  ]);
  return {
    actions: actions.map((row) => row.value),
    resources: resources.map((row) => row.value),
    admins,
  };
}
