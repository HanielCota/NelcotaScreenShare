import { timingSafeEqual, createHash, randomUUID } from "node:crypto";
import {
  AccessToken,
  RoomConfiguration,
  RoomServiceClient,
  ServerError,
  TrackSource,
} from "livekit-server-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/server/env";
import { requestLogger } from "@/server/request-log";
import { tokenRequestSchema, type TokenErrorCode, type TokenResponse } from "@/lib/livekit";
import { createRateLimiter, getClientIp } from "@/server/rate-limit";

const TOKEN_TTL = "10m";
const rateLimit = createRateLimiter({ limit: 20, windowMs: 60_000 });
// Senha errada: poucas chances por IP, com janela longa, contra força bruta.
const passwordFailures = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/** O app só usa microfone e tela: o token não deixa publicar câmera. */
const PUBLISH_SOURCES = [
  TrackSource.MICROPHONE,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
];

function errorResponse(
  error: TokenErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error, message }, { status, headers });
}

/** Compara em tempo constante (o hash iguala os tamanhos antes do timingSafeEqual). */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

function httpUrlFrom(wsUrl: string): string {
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.origin;
}

async function countParticipants(room: string): Promise<number> {
  const env = getEnv();
  const client = new RoomServiceClient(
    httpUrlFrom(env.NEXT_PUBLIC_LIVEKIT_URL),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
  try {
    const participants = await client.listParticipants(room);
    return participants.length;
  } catch (error) {
    // Sala ainda não existe: ninguém dentro.
    if (error instanceof ServerError && error.status === 404) return 0;
    throw error;
  }
}

function tooManyAttempts(
  retryAfterSeconds: number,
  message = "Muitas tentativas. Aguarde um pouco e tente de novo.",
) {
  return errorResponse("rate_limited", message, 429, {
    "Retry-After": String(retryAfterSeconds),
  });
}

export async function POST(request: NextRequest) {
  const env = getEnv();
  const ip = getClientIp(request.headers, env.TRUSTED_PROXY_HOPS);
  const limit = rateLimit.hit(ip);
  if (!limit.ok) return tooManyAttempts(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "invalid_request",
      "Não foi possível ler os dados de entrada. Atualize a página e tente novamente.",
      400,
    );
  }

  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message =
      field === "name"
        ? "Confira seu nome. Digite entre 1 e 32 caracteres para entrar na sala."
        : field === "password"
          ? "Confira a senha de acesso. Ela deve ter no máximo 128 caracteres."
          : field === "room"
            ? "Confira o código da sala ou peça um novo convite a quem enviou."
            : "Confira os dados de entrada e tente novamente.";
    return errorResponse("invalid_request", message, 400);
  }

  const { room, name, password } = parsed.data;

  if (env.ACCESS_PASSWORD) {
    const failures = passwordFailures.peek(ip);
    if (!failures.ok) {
      return tooManyAttempts(
        failures.retryAfterSeconds,
        "Muitas tentativas com a senha errada. Aguarde alguns minutos e tente de novo.",
      );
    }
    if (safeEqual(password ?? "", env.ACCESS_PASSWORD)) {
      passwordFailures.reset(ip);
    } else {
      passwordFailures.hit(ip);
      return errorResponse(
        "invalid_password",
        "Essa senha não confere. Confira a senha com quem enviou o convite e tente novamente.",
        401,
      );
    }
  }

  try {
    if ((await countParticipants(room)) >= env.MAX_PARTICIPANTS) {
      return errorResponse(
        "room_full",
        `A sala está cheia (máximo de ${env.MAX_PARTICIPANTS} pessoas). Aguarde alguém sair e tente novamente.`,
        409,
      );
    }

    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: `${name.toLowerCase().replaceAll(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      name,
      ttl: TOKEN_TTL,
    });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canPublishSources: PUBLISH_SOURCES,
      canSubscribe: true,
      // Chat, reações e apontador usam o canal de dados.
      canPublishData: true,
      // "Levantar a mão" fica nos atributos do participante.
      canUpdateOwnMetadata: true,
    });
    // Rede de segurança: o próprio LiveKit recusa entradas acima do limite.
    token.roomConfig = new RoomConfiguration({ maxParticipants: env.MAX_PARTICIPANTS });

    const response: TokenResponse = {
      token: await token.toJwt(),
      serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    (await requestLogger({ route: "api/token" })).error({ err: error }, "falha ao gerar token");
    return errorResponse(
      "server_error",
      "A sala está indisponível no momento. Aguarde alguns segundos e tente novamente.",
      502,
    );
  }
}
