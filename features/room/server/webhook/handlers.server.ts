import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { ROOM_CODE_PATTERN } from "@/features/room/domain/room-code";
import type { DbExecutor } from "@/server/db/index.server";
import { livekitEvents, roomParticipations, rooms, shareSessions } from "@/server/db/schema";
import { leaveReasonFrom, occurredAt, type WebhookPayload } from "./payload";
import { closeShares, ensureParticipation, ensureRoom, updatePeak } from "./records.server";

export type ProjectionResult = "projected" | "ignored";

const ROOM_CODE = new RegExp(ROOM_CODE_PATTERN);

/** What every handler receives: the already validated event, the room and the time. */
interface EventContext {
  tx: DbExecutor;
  payload: WebhookPayload;
  code: string;
  at: Date;
}

type Handler = (ctx: EventContext) => Promise<ProjectionResult>;

const roomStarted: Handler = async ({ tx, payload, code, at }) => {
  const startedAt = payload.room?.creationTime ? new Date(payload.room.creationTime * 1000) : at;
  await ensureRoom(tx, code, startedAt, { reopen: true, sid: payload.room?.sid });
  return "projected";
};

const roomFinished: Handler = async ({ tx, code, at }) => {
  const roomId = await ensureRoom(tx, code, at, { reopen: false });
  // Activity after this time (a late event from an already reopened room) keeps the room active.
  await tx
    .update(rooms)
    .set({ status: "finished", finishedAt: sql`greatest(${rooms.startedAt}, ${at}::timestamptz)` })
    .where(and(eq(rooms.id, roomId), eq(rooms.status, "active"), lte(rooms.lastActivityAt, at)));
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
};

const participantJoined: Handler = async ({ tx, payload, code, at }) => {
  if (!payload.participant) return "ignored";
  const roomId = await ensureRoom(tx, code, at, { reopen: true });
  await ensureParticipation(tx, roomId, code, payload.participant, at);
  await updatePeak(tx, roomId);
  return "projected";
};

const participantLeft: Handler = async ({ tx, payload, code, at }) => {
  const { participant } = payload;
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
    .where(
      and(
        eq(roomParticipations.id, participation.id),
        sql`(${roomParticipations.leftAt} is null or ${roomParticipations.leftAt} >= ${at}::timestamptz)`,
      ),
    );
  await closeShares(tx, eq(shareSessions.participationId, participation.id), at);
  return "projected";
};

/** Screen audio published after the video: marks the open share. */
const screenAudioPublished: Handler = async ({ tx, payload, code, at }) => {
  if (!payload.participant) return "ignored";
  const roomId = await ensureRoom(tx, code, at, { reopen: true });
  const participation = await ensureParticipation(tx, roomId, code, payload.participant, at);
  await tx
    .update(shareSessions)
    .set({ withAudio: true })
    .where(and(eq(shareSessions.participationId, participation.id), isNull(shareSessions.endedAt)));
  return "projected";
};

/** Screen share started or ended (arrival order does not matter). */
const screenTrack: Handler = async ({ tx, payload, code, at }) => {
  const { participant, track } = payload;
  if (!participant || !track) return "ignored";
  const published = payload.event === "track_published";
  const roomId = await ensureRoom(tx, code, at, { reopen: published });
  const participation = await ensureParticipation(tx, roomId, code, participant, at);
  await tx
    .insert(shareSessions)
    .values({
      roomId,
      participationId: participation.id,
      trackSid: track.sid,
      startedAt: at,
      endedAt: published ? participation.leftAt : at,
      // Screen audio is usually published before the video: look it up in the raw log.
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
      // The end arrived before the start: the start only moves the beginning earlier.
      set: published
        ? {
            startedAt: sql`least(${shareSessions.startedAt}, excluded.started_at)`,
            endedAt: sql`least(${shareSessions.endedAt}, excluded.ended_at)`,
          }
        : {
            endedAt: sql`greatest(${shareSessions.startedAt}, least(${shareSessions.endedAt}, excluded.ended_at))`,
          },
    });
  return "projected";
};

/** Tracks: only the screen (video) and its audio matter. */
const trackChanged: Handler = async (ctx) => {
  const source = ctx.payload.track?.source;
  if (source === "SCREEN_SHARE_AUDIO") {
    return ctx.payload.event === "track_published" ? screenAudioPublished(ctx) : "ignored";
  }
  return source === "SCREEN_SHARE" ? screenTrack(ctx) : "ignored";
};

const HANDLERS: Record<string, Handler> = {
  room_started: roomStarted,
  room_finished: roomFinished,
  participant_joined: participantJoined,
  participant_left: participantLeft,
  participant_connection_aborted: participantLeft,
  track_published: trackChanged,
  track_unpublished: trackChanged,
};

/** Applies an event to the tables. Idempotent: applying it again changes nothing. */
export async function projectEvent(
  tx: DbExecutor,
  payload: WebhookPayload,
): Promise<ProjectionResult> {
  const code = payload.room?.name;
  if (!code || !ROOM_CODE.test(code)) return "ignored";
  const handler = HANDLERS[payload.event];
  return handler ? handler({ tx, payload, code, at: occurredAt(payload) }) : "ignored";
}
