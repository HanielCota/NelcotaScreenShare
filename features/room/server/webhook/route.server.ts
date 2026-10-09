import { createHash } from "node:crypto";
import { WebhookReceiver } from "livekit-server-sdk";
import { z } from "zod";
import { getDb } from "@/server/db/index.server";
import { getEnv } from "@/server/env.server";
import { ingestEvent } from "@/features/room/server/webhook/projector.server";
import { logger } from "@/server/logger.server";
import { BodyTooLargeError, readBodyText } from "@/server/body.server";

/** Events that become a log line. The rest (tracks, egress…) only goes to the database. */
const LOGGED_EVENTS = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
]);

let receiver: WebhookReceiver | undefined;

/** The serialized event is always a JSON object (the SDK type is wider). */
const eventObject = z.record(z.string(), z.unknown());

/** LiveKit events are a few KB; above that the body is not even read. */
const MAX_BODY_BYTES = 64 * 1024;

function tooLarge() {
  return Response.json({ error: "payload_too_large" }, { status: 413 });
}

/**
 * LiveKit webhook. The signature uses the same keys as the token, so only the
 * LiveKit server can call it. Each event is stored in `livekit_events`
 * and projected into rooms, participations and shares
 * (features/room/server/webhook/projector.server.ts). If storing fails, it
 * responds 503 so LiveKit retries; if only the projection fails, the event is
 * already saved and maintenance (features/runtime/server/maintenance.server.ts)
 * re-projects it later.
 */
export async function receiveLivekitWebhook(request: Request) {
  const env = getEnv();
  receiver ??= new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

  let body: string;
  try {
    body = await readBodyText(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return tooLarge();
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  let event;
  try {
    event = await receiver.receive(body, request.headers.get("authorization") ?? undefined);
  } catch (error) {
    logger.warn(
      { source: "livekit-webhook", err: error },
      "LiveKit webhook rejected: invalid signature",
    );
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (LOGGED_EVENTS.has(event.event)) {
    logger.info(
      {
        source: "livekit-webhook",
        event: event.event,
        room: event.room?.name,
        participant: event.participant
          ? { identity: event.participant.identity, name: event.participant.name }
          : undefined,
        at: new Date(Number(event.createdAt) * 1000).toISOString(),
      },
      "LiveKit event",
    );
  }

  const db = getDb();
  // LiveKit always sends an id; the body hash covers a delivery without one.
  const id = event.id || `sha256:${createHash("sha256").update(body).digest("hex")}`;
  try {
    const result = await ingestEvent(db, id, eventObject.parse(event.toJson()));
    if (result === "failed") {
      logger.warn({ source: "livekit-webhook", id, event: event.event }, "event not projected");
    }
  } catch (error) {
    logger.error({ err: error, source: "livekit-webhook", id }, "failed to store event");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  return new Response(null, { status: 204 });
}
