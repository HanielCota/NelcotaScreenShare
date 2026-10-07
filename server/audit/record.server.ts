import { isIP } from "node:net";
import { requestHeaders } from "@/server/request-context.server";
import { clientIpFrom } from "@/server/client-ip";
import type { DbExecutor } from "@/server/db/index.server";
import { auditLogs } from "@/server/db/schema";

export type AuditActor = { adminId: string } | { userId: string } | "system";

export interface AuditEntry {
  /** "recurso.verbo" em snake_case, ex.: "room.close", "settings.update". */
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
 * Diferença campo a campo entre dois objetos rasos (só o que mudou), com
 * campos sensíveis mascarados. `null` quando nada mudou.
 */
export function diffChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { antes: unknown; depois: unknown }> | null {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: Record<string, { antes: unknown; depois: unknown }> = {};
  for (const key of keys) {
    const a = before?.[key] ?? null;
    const b = after?.[key] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes[key] = { antes: mask(key, a), depois: mask(key, b) };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/** IP, navegador e request_id da requisição atual (vazios fora de uma requisição). */
async function requestInfo() {
  try {
    const h = requestHeaders();
    const ip = clientIpFrom(h);
    return {
      ip: ip && isIP(ip) ? ip : null,
      userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      requestId: h.get("x-request-id"),
    };
  } catch {
    return { ip: null, userAgent: null, requestId: null };
  }
}

/** Grava uma linha de auditoria (use a transação da mudança como `executor`). */
export async function recordAudit(executor: DbExecutor, actor: AuditActor, entry: AuditEntry) {
  const info = await requestInfo();
  await executor.insert(auditLogs).values({
    actorAdminId: typeof actor === "object" && "adminId" in actor ? actor.adminId : null,
    actorUserId: typeof actor === "object" && "userId" in actor ? actor.userId : null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    changes: entry.changes ?? null,
    metadata: entry.metadata ?? {},
    ...info,
  });
}

/** Várias linhas de uma vez (ações em massa: uma linha por item afetado). */
async function recordAuditMany(executor: DbExecutor, actor: AuditActor, entries: AuditEntry[]) {
  if (entries.length === 0) return;
  const info = await requestInfo();
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
  for (let i = 0; i < rows.length; i += 1000) {
    await executor.insert(auditLogs).values(rows.slice(i, i + 1000));
  }
}

/**
 * Gravador amarrado a um autor, entregue às actions no `ctx`. Marca quando foi
 * usado: action declarada como auditada que termina sem registrar é um bug.
 */
export function createAuditRecorder(actor: AuditActor) {
  let used = 0;
  return {
    /** `as`: outro autor só para este registro (ex.: o admin recém-criado num convite). */
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
