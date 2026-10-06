import "server-only";
import { and, isNotNull, lt } from "drizzle-orm";
import { purgeOldFailures } from "@/server/auth/lockout";
import type { Database } from "@/server/db";
import {
  adminSessions,
  livekitEvents,
  roomParticipations,
  tokenRequests,
  userSessions,
} from "@/server/db/schema";
import { reprocessPendingEvents } from "@/server/livekit/webhook-projector";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prazos de retenção (docs/PLANO-ADMIN.md, LGPD). Registros de acesso ficam
 * 6 meses (Marco Civil, art. 15); o resto só o tempo de servir à segurança.
 */
const RETENTION_DAYS = {
  tokenRequests: 183,
  participationIp: 183,
  participationName: 365,
  livekitEvents: 30,
  loginFailures: 30,
  expiredSessions: 7,
} as const;

/** Evento recém-chegado ainda pode estar sendo projetado pelo próprio webhook. */
const REPROCESS_AFTER_MS = 60_000;

export interface MaintenanceReport {
  reprocessed: Awaited<ReturnType<typeof reprocessPendingEvents>>;
  tokenRequests: number;
  participationIps: number;
  participationNames: number;
  livekitEvents: number;
  loginFailures: number;
  sessions: number;
}

/**
 * Tarefas periódicas: reprojeta eventos do LiveKit que falharam e aplica a
 * retenção. Idempotente: rodar duas vezes (ex.: duas réplicas durante o
 * deploy) não causa nada além de consultas a mais.
 */
export async function runMaintenance(db: Database, now = new Date()): Promise<MaintenanceReport> {
  const before = (days: number) => new Date(now.getTime() - days * DAY_MS);

  const reprocessed = await reprocessPendingEvents(db, {
    receivedBefore: new Date(now.getTime() - REPROCESS_AFTER_MS),
  });

  const tokens = await db
    .delete(tokenRequests)
    .where(lt(tokenRequests.createdAt, before(RETENTION_DAYS.tokenRequests)))
    .returning({ id: tokenRequests.id });

  const ips = await db
    .update(roomParticipations)
    .set({ ip: null })
    .where(
      and(
        isNotNull(roomParticipations.ip),
        lt(roomParticipations.joinedAt, before(RETENTION_DAYS.participationIp)),
      ),
    )
    .returning({ id: roomParticipations.id });

  const names = await db
    .update(roomParticipations)
    .set({ displayName: null })
    .where(
      and(
        isNotNull(roomParticipations.displayName),
        lt(roomParticipations.joinedAt, before(RETENTION_DAYS.participationName)),
      ),
    )
    .returning({ id: roomParticipations.id });

  const events = await db
    .delete(livekitEvents)
    .where(lt(livekitEvents.receivedAt, before(RETENTION_DAYS.livekitEvents)))
    .returning({ id: livekitEvents.id });

  const failures = await purgeOldFailures(db, now);

  const expired = before(RETENTION_DAYS.expiredSessions);
  const users = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, expired))
    .returning({ id: userSessions.id });
  const admins = await db
    .delete(adminSessions)
    .where(lt(adminSessions.expiresAt, expired))
    .returning({ id: adminSessions.id });

  return {
    reprocessed,
    tokenRequests: tokens.length,
    participationIps: ips.length,
    participationNames: names.length,
    livekitEvents: events.length,
    loginFailures: failures,
    sessions: users.length + admins.length,
  };
}

const FIRST_RUN_DELAY_MS = 60_000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;
let scheduled = false;

/** Agenda a manutenção no processo do servidor (uma réplica; ver README). */
export function scheduleMaintenance(getDatabase: () => Database | undefined, log: MaintenanceLog) {
  if (scheduled) return;
  scheduled = true;
  const run = async () => {
    const db = getDatabase();
    if (!db) return;
    try {
      log.info({ maintenance: await runMaintenance(db) }, "manutenção concluída");
    } catch (error) {
      log.error({ err: error }, "falha na manutenção");
    }
  };
  setTimeout(() => void run(), FIRST_RUN_DELAY_MS).unref();
  setInterval(() => void run(), INTERVAL_MS).unref();
}

interface MaintenanceLog {
  info(details: object, message: string): void;
  error(details: object, message: string): void;
}
