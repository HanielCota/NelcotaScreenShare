import { createHash } from "node:crypto";
import { WebhookReceiver } from "livekit-server-sdk";
import { z } from "zod";
import { getDb } from "@/server/db/index.server";
import { getEnv } from "@/server/env.server";
import { ingestEvent } from "@/features/room/server/webhook/projector.server";
import { logger } from "@/server/logger.server";
import { BodyTooLargeError, readBodyText } from "@/server/body.server";

/** Eventos que viram linha de log. O resto (faixas, egress…) só vai para o banco. */
const LOGGED_EVENTS = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
]);

let receiver: WebhookReceiver | undefined;

/** O evento serializado é sempre um objeto JSON (o tipo do SDK é mais largo). */
const eventObject = z.record(z.string(), z.unknown());

/** Eventos do LiveKit têm poucos KB; acima disso nem lê o corpo. */
const MAX_BODY_BYTES = 64 * 1024;

function tooLarge() {
  return Response.json(
    { error: "payload_too_large" },
    { status: 413, headers: { Connection: "close" } },
  );
}

/**
 * Webhook do LiveKit. A assinatura usa as mesmas chaves do token, então só o
 * servidor LiveKit consegue chamar. Cada evento é gravado em `livekit_events`
 * e projetado em salas, participações e compartilhamentos
 * (server/livekit/webhook-projector.ts). Se a gravação falhar, responde 503
 * para o LiveKit tentar de novo; se só a projeção falhar, o evento já está
 * salvo e a manutenção (server/maintenance.ts) reprojeta depois.
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
  } catch {
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
      "evento do LiveKit",
    );
  }

  const db = getDb();
  // O LiveKit sempre manda id; o hash do corpo cobre um envio sem ele.
  const id = event.id || `sha256:${createHash("sha256").update(body).digest("hex")}`;
  try {
    const result = await ingestEvent(db, id, eventObject.parse(event.toJson()));
    if (result === "failed") {
      logger.warn({ source: "livekit-webhook", id, event: event.event }, "evento não projetado");
    }
  } catch (error) {
    logger.error({ err: error, source: "livekit-webhook", id }, "falha ao gravar evento");
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
  return new Response(null, { status: 204 });
}
