import { WebhookReceiver } from "livekit-server-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

/** Eventos que viram linha de log. O resto (faixas, egress…) é ignorado. */
const LOGGED_EVENTS = new Set([
  "room_started",
  "room_finished",
  "participant_joined",
  "participant_left",
]);

let receiver: WebhookReceiver | undefined;

/**
 * Webhook do LiveKit: registra quem entrou e saiu de cada sala, uma linha JSON
 * por evento (o Coolify guarda os logs do container). A assinatura usa as
 * mesmas chaves do token, então só o servidor LiveKit consegue chamar.
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
    console.info(
      JSON.stringify({
        source: "livekit-webhook",
        event: event.event,
        room: event.room?.name,
        participant: event.participant
          ? { identity: event.participant.identity, name: event.participant.name }
          : undefined,
        at: new Date(Number(event.createdAt) * 1000).toISOString(),
      }),
    );
  }

  return new NextResponse(null, { status: 204 });
}
