import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  decideTokenRequest,
  SERVER_ERROR_MESSAGE,
  type TokenAccount,
  type TokenDecision,
} from "@/features/room/domain/issue-token";
import type { TokenResponse } from "@/features/room/domain/token-contract";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { createRateLimiter } from "@/server/rate-limit";
import { redeemRoomInvite } from "./invites";
import { liveKitGateway, type LiveKitGateway } from "./livekit-gateway";
import { recordTokenRequest } from "./token-log";

// Por conta: trocar de IP não dá mais tentativas.
const perAccountLimit = createRateLimiter({ limit: 20, windowMs: 60_000 });
// Senha errada: poucas chances por IP, com janela longa, contra força bruta.
const passwordFailures = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

/** Compara em tempo constante (o hash iguala os tamanhos antes do timingSafeEqual). */
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export type IssueTokenResult =
  | { ok: true; data: TokenResponse }
  | Extract<TokenDecision, { ok: false }>
  | { ok: false; error: "server_error"; message: string; failure: unknown };

interface IssueTokenInput {
  account: TokenAccount | null;
  body: { readable: true; value: unknown } | { readable: false };
  /** IP do cliente (null se desconhecido; o limite de senha usa "desconhecido"). */
  ip: string | null;
  /** Sala pedida, só para o registro (o pedido ainda pode ser inválido). */
  requestedRoom: string;
}

/**
 * Emite o token do LiveKit: decide (domain/issue-token), registra o resultado
 * em token_requests e assina. Falha do LiveKit ou do banco vira "sala indisponível".
 */
export async function issueRoomToken(
  { account, body, ip, requestedRoom }: IssueTokenInput,
  gateway: LiveKitGateway = liveKitGateway,
): Promise<IssueTokenResult> {
  const env = getEnv();
  const ipKey = ip ?? "desconhecido";
  const log = (result: TokenDecision["log"] | "error") =>
    recordTokenRequest({ roomCode: requestedRoom, userId: account?.id ?? null, result, ip });

  try {
    const decision = await decideTokenRequest(
      account,
      body,
      {
        requireVerifiedEmail: env.REQUIRE_EMAIL_VERIFICATION,
        accessPassword: env.ACCESS_PASSWORD,
        maxParticipants: env.MAX_PARTICIPANTS,
      },
      {
        hitAccountLimit: (id) => perAccountLimit.hit(id),
        passwordFailures: {
          peek: () => passwordFailures.peek(ipKey),
          fail: () => void passwordFailures.hit(ipKey),
          reset: () => passwordFailures.reset(ipKey),
        },
        passwordMatches: (given) => safeEqual(given, env.ACCESS_PASSWORD ?? ""),
        countParticipants: (room) => gateway.countParticipants(room),
        redeemInvite: (invite, room, accountId) =>
          redeemRoomInvite(getDb(), { token: invite, roomCode: room, userId: accountId }),
      },
    );
    await log(decision.log);
    if (!decision.ok) return decision;
    const token = await gateway.signToken(decision.grant);
    return { ok: true, data: { token, serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL } };
  } catch (failure) {
    await log("error");
    return { ok: false, error: "server_error", message: SERVER_ERROR_MESSAGE, failure };
  }
}
