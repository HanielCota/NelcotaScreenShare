import "server-only";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import { roomParticipations, rooms, shareSessions, tokenRequests } from "@/server/db/schema";
import type { WebhookParticipant } from "./payload";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Janela para ligar um evento ao pedido de token que o originou. */
const TOKEN_WINDOW = sql`interval '15 minutes'`;

/** Sala pelo código; atividade nova reabre uma sala encerrada antes dela. */
export async function ensureRoom(
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

/** Eventos de faixa não trazem joined_at: aí vale o horário do evento, corrigido quando a entrada chegar. */
function joinedAtOf(participant: WebhookParticipant, fallback: Date): Date {
  if (participant.joinedAtMs) return new Date(participant.joinedAtMs);
  if (participant.joinedAt) return new Date(participant.joinedAt * 1000);
  return fallback;
}

/** Participação pelo sid da conexão (entrada, faixas e saída caem na mesma linha). */
export async function ensureParticipation(
  tx: DbExecutor,
  roomId: string,
  roomCode: string,
  participant: WebhookParticipant,
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

export async function updatePeak(tx: DbExecutor, roomId: string) {
  await tx
    .update(rooms)
    .set({
      peakParticipants: sql`greatest(${rooms.peakParticipants}, (
        select count(*) from ${roomParticipations}
        where ${roomParticipations.roomId} = ${roomId} and ${roomParticipations.leftAt} is null))`,
    })
    .where(eq(rooms.id, roomId));
}

export async function closeShares(tx: DbExecutor, where: ReturnType<typeof and>, at: Date) {
  await tx
    .update(shareSessions)
    .set({ endedAt: sql`greatest(${shareSessions.startedAt}, ${at}::timestamptz)` })
    .where(and(where, isNull(shareSessions.endedAt), lte(shareSessions.startedAt, at)));
}
