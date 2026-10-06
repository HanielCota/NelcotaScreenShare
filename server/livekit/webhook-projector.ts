import "server-only";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type { DbExecutor, Database } from "@/server/db";
import {
  livekitEvents,
  roomParticipations,
  rooms,
  ROOM_CODE_PATTERN,
  shareSessions,
  tokenRequests,
} from "@/server/db/schema";

/**
 * Webhook do LiveKit → tabelas de negócio (docs/PLANO-ADMIN.md §4.4).
 *
 * Cada evento é gravado bruto em `livekit_events` (o id do LiveKit garante que
 * reenvios não dupliquem) e projetado em seguida. A projeção não depende da
 * ordem de chegada: participações são achadas pela chave natural (sala,
 * identidade, joined_at do próprio participante), compartilhamentos pelo sid
 * da faixa, e horários só avançam (greatest/least). Um evento que falhou fica
 * com `error` e `processed_at` nulo, para reprocessar.
 */

/** Formato JSON do protobuf (`WebhookEvent.toJson()`): bigint vira string, enum vira nome. */
const timestampSchema = z.coerce.number().nonnegative().optional();
export const webhookPayloadSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
  createdAt: timestampSchema,
  room: z
    .object({
      sid: z.string().optional(),
      name: z.string().optional(),
      creationTime: timestampSchema,
    })
    .optional(),
  participant: z
    .object({
      sid: z.string().min(1),
      identity: z.string(),
      name: z.string().optional(),
      joinedAt: timestampSchema,
      joinedAtMs: timestampSchema,
      disconnectReason: z.string().optional(),
    })
    .optional(),
  track: z.object({ sid: z.string(), source: z.string().optional() }).optional(),
});
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

const ROOM_CODE = new RegExp(ROOM_CODE_PATTERN);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Janela para ligar um evento ao pedido de token que o originou. */
const TOKEN_WINDOW = sql`interval '15 minutes'`;

type LeaveReason = "left" | "disconnected" | "removed_by_admin" | "room_closed" | "unknown";

function leaveReasonFrom(reason: string | undefined): LeaveReason {
  switch (reason) {
    case "CLIENT_INITIATED":
      return "left";
    case "PARTICIPANT_REMOVED":
      return "removed_by_admin";
    case "ROOM_DELETED":
    case "ROOM_CLOSED":
      return "room_closed";
    case undefined:
    case "UNKNOWN_REASON":
      return "unknown";
    default:
      return "disconnected";
  }
}

export function occurredAt(payload: WebhookPayload): Date {
  return payload.createdAt ? new Date(payload.createdAt * 1000) : new Date();
}

/** Sala pelo código; atividade nova reabre uma sala encerrada antes dela. */
async function ensureRoom(
  tx: DbExecutor,
  code: string,
  at: Date,
  { reopen, sid }: { reopen: boolean; sid?: string },
): Promise<string> {
  const reopens = reopen
    ? sql`${rooms.status} = 'finished' and excluded.last_activity_at > ${rooms.finishedAt}`
    : sql`false`;
  const [room] = await tx
    .insert(rooms)
    .values({
      code,
      livekitSid: sid,
      startedAt: at,
      lastActivityAt: at,
      // Quem pediu o primeiro token para este código "criou" a sala.
      createdByUserId: sql`(
        select ${tokenRequests.userId} from ${tokenRequests}
        where ${tokenRequests.roomCode} = ${code} and ${tokenRequests.result} = 'granted'
          and ${tokenRequests.createdAt} between ${at}::timestamptz - ${TOKEN_WINDOW}
          and ${at}::timestamptz + interval '1 minute'
        order by ${tokenRequests.createdAt} limit 1)`,
    })
    .onConflictDoUpdate({
      target: rooms.code,
      targetWhere: sql`${rooms.deletedAt} is null`,
      set: {
        lastActivityAt: sql`greatest(${rooms.lastActivityAt}, excluded.last_activity_at)`,
        livekitSid: sid ? sql`excluded.livekit_sid` : sql`${rooms.livekitSid}`,
        status: sql`case when ${reopens} then 'active'::room_status else ${rooms.status} end`,
        finishedAt: sql`case when ${reopens} then null else ${rooms.finishedAt} end`,
      },
    })
    .returning({ id: rooms.id });
  if (!room) throw new Error(`sala ${code} não foi gravada`);
  return room.id;
}

type Participant = NonNullable<WebhookPayload["participant"]>;

/** Eventos de faixa não trazem joined_at: aí vale o horário do evento, corrigido quando a entrada chegar. */
function joinedAtOf(participant: Participant, fallback: Date): Date {
  if (participant.joinedAtMs) return new Date(participant.joinedAtMs);
  if (participant.joinedAt) return new Date(participant.joinedAt * 1000);
  return fallback;
}

/** Participação pelo sid da conexão (entrada, faixas e saída caem na mesma linha). */
async function ensureParticipation(
  tx: DbExecutor,
  roomId: string,
  roomCode: string,
  participant: Participant,
  at: Date,
): Promise<{ id: string; joinedAt: Date }> {
  const joinedAt = joinedAtOf(participant, at);
  const userId = UUID.test(participant.identity) ? participant.identity : null;
  const [row] = await tx
    .insert(roomParticipations)
    .values({
      roomId,
      livekitIdentity: participant.identity,
      livekitSid: participant.sid,
      // A identidade é o id da conta (ver /api/token); conta apagada fica nula.
      userId: userId ? sql`(select id from users where id = ${userId}::uuid)` : null,
      displayName: participant.name ? participant.name.slice(0, 32) : null,
      // IP do pedido de token que deu esta entrada (registro de acesso).
      ip: userId
        ? sql`(
            select ${tokenRequests.ip} from ${tokenRequests}
            where ${tokenRequests.userId} = ${userId}::uuid and ${tokenRequests.roomCode} = ${roomCode}
              and ${tokenRequests.result} = 'granted'
              and ${tokenRequests.createdAt} between ${joinedAt}::timestamptz - ${TOKEN_WINDOW}
              and ${joinedAt}::timestamptz + interval '1 minute'
            order by ${tokenRequests.createdAt} desc limit 1)`
        : null,
      joinedAt,
    })
    .onConflictDoUpdate({
      target: roomParticipations.livekitSid,
      set: {
        displayName: sql`coalesce(excluded.display_name, ${roomParticipations.displayName})`,
        joinedAt: sql`least(${roomParticipations.joinedAt}, excluded.joined_at)`,
        ip: sql`coalesce(${roomParticipations.ip}, excluded.ip)`,
      },
    })
    .returning({ id: roomParticipations.id, joinedAt: roomParticipations.joinedAt });
  if (!row) throw new Error("participação não foi gravada");
  return row;
}

async function updatePeak(tx: DbExecutor, roomId: string) {
  await tx
    .update(rooms)
    .set({
      peakParticipants: sql`greatest(${rooms.peakParticipants}, (
        select count(*) from ${roomParticipations}
        where ${roomParticipations.roomId} = ${roomId} and ${roomParticipations.leftAt} is null))`,
    })
    .where(eq(rooms.id, roomId));
}

async function closeShares(tx: DbExecutor, where: ReturnType<typeof and>, at: Date) {
  await tx
    .update(shareSessions)
    .set({ endedAt: sql`greatest(${shareSessions.startedAt}, ${at}::timestamptz)` })
    .where(and(where, isNull(shareSessions.endedAt), lte(shareSessions.startedAt, at)));
}

export type ProjectionResult = "projected" | "ignored";

/** Aplica um evento às tabelas. Idempotente: aplicar de novo não muda nada. */
export async function projectEvent(
  tx: DbExecutor,
  payload: WebhookPayload,
): Promise<ProjectionResult> {
  const code = payload.room?.name;
  if (!code || !ROOM_CODE.test(code)) return "ignored";
  const at = occurredAt(payload);
  const { participant, track } = payload;

  switch (payload.event) {
    case "room_started": {
      const startedAt = payload.room?.creationTime
        ? new Date(payload.room.creationTime * 1000)
        : at;
      await ensureRoom(tx, code, startedAt, { reopen: true, sid: payload.room?.sid });
      return "projected";
    }
    case "room_finished": {
      const roomId = await ensureRoom(tx, code, at, { reopen: false });
      // Atividade depois deste horário (evento atrasado de uma sala já reaberta) mantém a sala ativa.
      await tx
        .update(rooms)
        .set({
          status: "finished",
          finishedAt: sql`greatest(${rooms.startedAt}, ${at}::timestamptz)`,
        })
        .where(
          and(eq(rooms.id, roomId), eq(rooms.status, "active"), lte(rooms.lastActivityAt, at)),
        );
      await tx
        .update(roomParticipations)
        .set({
          leftAt: sql`greatest(${roomParticipations.joinedAt}, ${at}::timestamptz)`,
          leaveReason: "room_closed",
        })
        .where(
          and(
            eq(roomParticipations.roomId, roomId),
            isNull(roomParticipations.leftAt),
            lte(roomParticipations.joinedAt, at),
          ),
        );
      await closeShares(tx, eq(shareSessions.roomId, roomId), at);
      return "projected";
    }
    case "participant_joined": {
      if (!participant) return "ignored";
      const roomId = await ensureRoom(tx, code, at, { reopen: true });
      await ensureParticipation(tx, roomId, code, participant, at);
      await updatePeak(tx, roomId);
      return "projected";
    }
    case "participant_left":
    case "participant_connection_aborted": {
      if (!participant) return "ignored";
      const roomId = await ensureRoom(tx, code, at, { reopen: false });
      const participation = await ensureParticipation(tx, roomId, code, participant, at);
      const reason =
        payload.event === "participant_connection_aborted"
          ? "disconnected"
          : leaveReasonFrom(participant.disconnectReason);
      await tx
        .update(roomParticipations)
        .set({
          leftAt: sql`greatest(${roomParticipations.joinedAt}, ${at}::timestamptz)`,
          leaveReason: reason,
        })
        .where(and(eq(roomParticipations.id, participation.id), isNull(roomParticipations.leftAt)));
      await closeShares(tx, eq(shareSessions.participationId, participation.id), at);
      return "projected";
    }
    case "track_published":
    case "track_unpublished": {
      if (!participant || !track) return "ignored";
      const published = payload.event === "track_published";
      if (track.source === "SCREEN_SHARE_AUDIO") {
        if (!published) return "ignored";
        const roomId = await ensureRoom(tx, code, at, { reopen: true });
        const participation = await ensureParticipation(tx, roomId, code, participant, at);
        await tx
          .update(shareSessions)
          .set({ withAudio: true })
          .where(
            and(eq(shareSessions.participationId, participation.id), isNull(shareSessions.endedAt)),
          );
        return "projected";
      }
      if (track.source !== "SCREEN_SHARE") return "ignored";
      const roomId = await ensureRoom(tx, code, at, { reopen: published });
      const participation = await ensureParticipation(tx, roomId, code, participant, at);
      await tx
        .insert(shareSessions)
        .values({
          roomId,
          participationId: participation.id,
          trackSid: track.sid,
          startedAt: at,
          endedAt: published ? null : at,
          // O áudio da tela costuma ser publicado antes do vídeo: procura no log bruto.
          withAudio: sql`exists (
            select 1 from ${livekitEvents}
            where ${livekitEvents.event} = 'track_published'
              and ${livekitEvents.payload}->'track'->>'source' = 'SCREEN_SHARE_AUDIO'
              and ${livekitEvents.payload}->'participant'->>'sid' = ${participant.sid}
              and ${livekitEvents.occurredAt} between ${at}::timestamptz - interval '30 seconds'
              and ${at}::timestamptz + interval '30 seconds')`,
        })
        .onConflictDoUpdate({
          target: shareSessions.trackSid,
          // Chegou a saída antes da entrada: a entrada só antecipa o início.
          set: published
            ? { startedAt: sql`least(${shareSessions.startedAt}, excluded.started_at)` }
            : { endedAt: sql`greatest(${shareSessions.startedAt}, excluded.ended_at)` },
        });
      return "projected";
    }
    default:
      return "ignored";
  }
}

export type IngestResult = "duplicate" | ProjectionResult | "failed";

/** Projeta um evento já gravado; o erro fica registrado no próprio evento. */
export async function processStoredEvent(
  db: Database,
  id: string,
  payload: unknown,
): Promise<IngestResult> {
  try {
    const parsed = webhookPayloadSchema.parse(payload);
    const result = await db.transaction(async (tx) => {
      const projected = await projectEvent(tx, parsed);
      await tx
        .update(livekitEvents)
        .set({ processedAt: sql`now()`, error: null })
        .where(eq(livekitEvents.id, id));
      return projected;
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(livekitEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(livekitEvents.id, id));
    return "failed";
  }
}

/** Grava o evento bruto (reenvio do mesmo id é ignorado) e projeta. */
export async function ingestEvent(
  db: Database,
  id: string,
  payload: Record<string, unknown>,
): Promise<IngestResult> {
  const parsed = webhookPayloadSchema.safeParse(payload);
  const [stored] = await db
    .insert(livekitEvents)
    .values({
      id,
      event: parsed.success ? parsed.data.event : String(payload.event ?? "desconhecido"),
      roomName: parsed.success ? (parsed.data.room?.name ?? null) : null,
      payload,
      occurredAt: parsed.success ? occurredAt(parsed.data) : new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: livekitEvents.id });
  if (!stored) return "duplicate";
  return processStoredEvent(db, id, payload);
}

/**
 * Reprocessa eventos pendentes (falhas), do mais antigo ao mais novo.
 * `receivedBefore` deixa de fora os que acabaram de chegar e ainda estão
 * sendo projetados pelo próprio webhook.
 */
export async function reprocessPendingEvents(
  db: Database,
  { limit = 500, receivedBefore }: { limit?: number; receivedBefore?: Date } = {},
) {
  const pending = await db
    .select({ id: livekitEvents.id, payload: livekitEvents.payload })
    .from(livekitEvents)
    .where(
      and(
        isNull(livekitEvents.processedAt),
        receivedBefore ? lte(livekitEvents.receivedAt, receivedBefore) : undefined,
      ),
    )
    .orderBy(asc(livekitEvents.occurredAt))
    .limit(limit);
  const results: Record<IngestResult, number> = {
    duplicate: 0,
    projected: 0,
    ignored: 0,
    failed: 0,
  };
  for (const event of pending) {
    results[await processStoredEvent(db, event.id, event.payload)]++;
  }
  return results;
}
