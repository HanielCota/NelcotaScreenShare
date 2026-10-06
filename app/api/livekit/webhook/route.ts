import { createHash } from "node:crypto";
import { WebhookReceiver } from "livekit-server-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { ingestEvent } from "@/server/livekit/webhook-projector";
import { logger } from "@/server/logger";

/** Eventos que viram linha de log. O resto (faixas, egress…) só vai para o banco. */
const LOGGED_EVENTS = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
]);

let receiver: WebhookReceiver | undefined;

/**
 * Webhook do LiveKit. A assinatura usa as mesmas chaves do token, então só o
 * servidor LiveKit consegue chamar. Cada evento é gravado em `livekit_events`
 * e projetado em salas, participações e compartilhamentos
 * (server/livekit/webhook-projector.ts). Sem banco, responde 503 para o
 * LiveKit tentar de novo.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  receiver ??= new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

  const body = await request.text();
  let event;
  try {
    event = await receiver.receive(body, request.headers.get("authorization") ?? undefined);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
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
  if (!db) return new NextResponse(null, { status: 204 });
  // O LiveKit sempre manda id; o hash do corpo cobre um envio sem ele.
  const id = event.id || `sha256:${createHash("sha256").update(body).digest("hex")}`;
  try {
    const result = await ingestEvent(db, id, event.toJson() as Record<string, unknown>);
    if (result === "failed") {
      logger.warn({ source: "livekit-webhook", id, event: event.event }, "evento não projetado");
    }
  } catch (error) {
    logger.error({ err: error, source: "livekit-webhook", id }, "falha ao gravar evento");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
