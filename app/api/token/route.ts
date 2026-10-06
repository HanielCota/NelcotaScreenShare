import { createHash, timingSafeEqual } from "node:crypto";
import {
  AccessToken,
  RoomConfiguration,
  RoomServiceClient,
  ServerError,
  TrackSource,
} from "livekit-server-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/auth/origin-guard";
import { getUserAuth } from "@/server/auth/user";
import { clientIpFrom } from "@/server/client-ip";
import { getEnv } from "@/server/env";
import { requestLogger } from "@/server/request-log";
import { tokenRequestSchema, type TokenErrorCode, type TokenResponse } from "@/lib/livekit";
import { getDb } from "@/server/db";
import { recordTokenRequest, type TokenResult } from "@/server/livekit/token-log";
import { redeemRoomInvite } from "@/server/rooms/invites";
import { createRateLimiter } from "@/server/rate-limit";

const TOKEN_TTL = "10m";
const rateLimit = createRateLimiter({ limit: 20, windowMs: 60_000 });
// Por conta também: trocar de IP não dá mais tentativas.
const perUserLimit = createRateLimiter({ limit: 20, windowMs: 60_000 });
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
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  const clientIp = clientIpFrom(request.headers) ?? null;
  const ip = clientIp ?? "desconhecido";
  // Excesso por IP não vai para o banco: uma enxurrada não vira enxurrada de escrita.
  const limit = rateLimit.hit(ip);
  if (!limit.ok) return tooManyAttempts(limit.retryAfterSeconds);

  // Corpo lido antes das checagens só para registrar a sala pedida em cada resultado.
  let body: unknown;
  let readable = true;
  try {
    body = await request.json();
  } catch {
    readable = false;
  }
  const requestedRoom =
    body && typeof body === "object" && "room" in body && typeof body.room === "string"
      ? body.room.trim().toLowerCase()
      : "";
  let userId: string | null = null;
  const log = (result: TokenResult) =>
    recordTokenRequest({ roomCode: requestedRoom, userId, result, ip: clientIp });

  // Só participantes logados, com e-mail confirmado e conta ativa.
  const auth = await getUserAuth().api.getSession({ headers: request.headers });
  if (!auth) {
    await log("unauthenticated");
    return errorResponse("unauthenticated", "Entre na sua conta para participar da sala.", 401);
  }
  const { user } = auth;
  userId = user.id;
  if (user.blockedAt || user.deletedAt) {
    await log("blocked");
    return errorResponse(
      "blocked",
      "Sua conta não pode entrar em salas. Fale com o suporte se achar que é um engano.",
      403,
    );
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    await log("unverified");
    return errorResponse(
      "email_unverified",
      "Confirme seu e-mail para entrar em salas. Enviamos um link quando você criou a conta.",
      403,
    );
  }
  const userLimit = perUserLimit.hit(user.id);
  if (!userLimit.ok) {
    await log("rate_limited");
    return tooManyAttempts(userLimit.retryAfterSeconds);
  }

  if (!readable) {
    await log("invalid");
    return errorResponse(
      "invalid_request",
      "Não foi possível ler os dados de entrada. Atualize a página e tente novamente.",
      400,
    );
  }

  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    await log("invalid");
    const field = parsed.error.issues[0]?.path[0];
    const message =
      field === "password"
        ? "Confira a senha de acesso. Ela deve ter no máximo 128 caracteres."
        : field === "room"
          ? "Confira o código da sala ou peça um novo convite a quem enviou."
          : "Confira os dados de entrada e tente novamente.";
    return errorResponse("invalid_request", message, 400);
  }

  const { room, password, invite } = parsed.data;

  // Convite do painel substitui a senha de acesso (é validado mais abaixo).
  if (env.ACCESS_PASSWORD && invite === undefined) {
    const failures = passwordFailures.peek(ip);
    if (!failures.ok) {
      await log("rate_limited");
      return tooManyAttempts(
        failures.retryAfterSeconds,
        "Muitas tentativas com a senha errada. Aguarde alguns minutos e tente de novo.",
      );
    }
    if (safeEqual(password ?? "", env.ACCESS_PASSWORD)) {
      passwordFailures.reset(ip);
    } else {
      passwordFailures.hit(ip);
      await log("wrong_password");
      return errorResponse(
        "invalid_password",
        "Essa senha não confere. Confira a senha com quem enviou o convite e tente novamente.",
        401,
      );
    }
  }

  try {
    if ((await countParticipants(room)) >= env.MAX_PARTICIPANTS) {
      await log("room_full");
      return errorResponse(
        "room_full",
        `A sala está cheia (máximo de ${env.MAX_PARTICIPANTS} pessoas). Aguarde alguém sair e tente novamente.`,
        409,
      );
    }

    // Depois da lotação: sala cheia não gasta uso do convite.
    if (invite !== undefined) {
      const db = getDb();
      if (
        !db ||
        !(await redeemRoomInvite(db, { token: invite, roomCode: room, userId: user.id }))
      ) {
        await log("invite_invalid");
        return errorResponse(
          "invite_invalid",
          "Este convite expirou, foi revogado ou já atingiu o limite de pessoas. Peça um novo a quem convidou.",
          403,
        );
      }
    }

    // Identidade = conta: a mesma pessoa em duas abas ocupa um só lugar na sala
    // (o LiveKit desconecta a conexão anterior) e os eventos ligam na conta certa.
    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: user.id,
      name: user.name,
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

    await log("granted");
    const response: TokenResponse = {
      token: await token.toJwt(),
      serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    (await requestLogger({ route: "api/token" })).error({ err: error }, "falha ao gerar token");
    await log("error");
    return errorResponse(
      "server_error",
      "A sala está indisponível no momento. Aguarde alguns segundos e tente novamente.",
      502,
    );
  }
}
