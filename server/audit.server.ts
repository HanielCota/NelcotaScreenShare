import { isIP } from "node:net";
import { requestHeaders } from "@/server/request-context.server";
import { clientIpFrom } from "@/server/client-ip.server";
import type { DbExecutor } from "@/server/db/index.server";
import { auditLogs } from "@/server/db/schema";

export type AuditActor = { adminId: string } | { userId: string } | "system";

export interface AuditEntry {
  /** "resource.verb" in snake_case, e.g. "room.close", "settings.update". */
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: Record<string, { antes: unknown; depois: unknown }> | null;
  metadata?: Record<string, unknown>;
}

const SECRET_KEY = /pass(word)?|senha|token|secret|segredo|totp|backup|cookie|authorization/i;
const HIDDEN = "[oculto]";

function mask(key: string, value: unknown): unknown {
  return SECRET_KEY.test(key) && value !== null && value !== undefined ? HIDDEN : value;
}

/**
 * Field-by-field diff between two shallow objects (only what changed), with
 * sensitive fields masked. `null` when nothing changed.
 */
export function diffChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { antes: unknown; depois: unknown }> | null {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: Record<string, { antes: unknown; depois: unknown }> = {};
  for (const key of keys) {
    const previous = before?.[key] ?? null;
    const next = after?.[key] ?? null;
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changes[key] = { antes: mask(key, previous), depois: mask(key, next) };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/** IP, browser and request_id of the current request (empty outside a request). */
function requestInfo() {
  try {
    const headers = requestHeaders();
    const ip = clientIpFrom(headers);
    return {
      ip: ip && isIP(ip) ? ip : null,
      userAgent: headers.get("user-agent")?.slice(0, 500) ?? null,
      requestId: headers.get("x-request-id"),
    };
  } catch {
    return { ip: null, userAgent: null, requestId: null };
  }
}

/** Rows per insert statement, well below Postgres's bind parameter limit. */
export const AUDIT_INSERT_BATCH = 1000;

/** Several rows at once (bulk actions: one row per affected item). */
async function recordAuditMany(executor: DbExecutor, actor: AuditActor, entries: AuditEntry[]) {
  if (entries.length === 0) return;
  const info = requestInfo();
  const rows = entries.map((entry) => ({
    actorAdminId: typeof actor === "object" && "adminId" in actor ? actor.adminId : null,
    actorUserId: typeof actor === "object" && "userId" in actor ? actor.userId : null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    changes: entry.changes ?? null,
    metadata: entry.metadata ?? {},
    ...info,
  }));
  for (let i = 0; i < rows.length; i += AUDIT_INSERT_BATCH) {
    await executor.insert(auditLogs).values(rows.slice(i, i + AUDIT_INSERT_BATCH));
  }
}

/** Writes an audit row (use the change's transaction as `executor`). */
export async function recordAudit(executor: DbExecutor, actor: AuditActor, entry: AuditEntry) {
  await recordAuditMany(executor, actor, [entry]);
}

/**
 * Recorder bound to an actor, handed to actions in `ctx`. Tracks whether it was
 * used: an action declared as audited that finishes without recording is a bug.
 */
export function createAuditRecorder(actor: AuditActor) {
  let used = 0;
  return {
    /** `as`: a different actor for this record only (e.g. the admin just created by an invitation). */
    async record(executor: DbExecutor, entry: AuditEntry, as?: AuditActor) {
      used += 1;
      await recordAudit(executor, as ?? actor, entry);
    },
    async recordMany(executor: DbExecutor, entries: AuditEntry[]) {
      used += entries.length;
      await recordAuditMany(executor, actor, entries);
    },
    get count() {
      return used;
    },
  };
}

export type AuditRecorder = ReturnType<typeof createAuditRecorder>;
