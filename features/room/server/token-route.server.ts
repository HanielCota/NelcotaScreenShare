import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { TOKEN_ERROR_STATUS, type TokenRefusal } from "@/features/room/domain/issue-token";
import { issueRoomToken } from "@/features/room/server/issue-token.server";
import { clientIpFrom } from "@/server/client-ip.server";
import { createRateLimiter } from "@/server/rate-limit.server";
import { requestLogger } from "@/server/request-log.server";

// Excesso por IP não vai para o banco: uma enxurrada não vira enxurrada de escrita.
const perIpLimit = createRateLimiter({ limit: 20, windowMs: 60_000 });

function rejection(error: TokenRefusal, message: string, retryAfterSeconds?: number) {
  return Response.json(
    { error, message },
    {
      status: TOKEN_ERROR_STATUS[error],
      ...(retryAfterSeconds === undefined
        ? {}
        : { headers: { "Retry-After": String(retryAfterSeconds) } }),
    },
  );
}

/** Corpo lido antes das checagens, só para registrar a sala pedida em cada resultado. */
async function readBody(request: Request) {
  try {
    const value: unknown = await request.json();
    const room =
      value && typeof value === "object" && "room" in value && typeof value.room === "string"
        ? value.room.trim().toLowerCase()
        : "";
    return { body: { readable: true as const, value }, room };
  } catch {
    return { body: { readable: false as const }, room: "" };
  }
}

/**
 * Token do LiveKit para entrar numa sala. Aqui fica só a borda HTTP (origem,
 * IP, corpo, sessão); quem pode entrar é decidido em features/room.
 */
export async function requestRoomToken(request: Request) {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  const ip = clientIpFrom(request.headers) ?? null;
  const limit = perIpLimit.hit(ip ?? "desconhecido");
  if (!limit.ok) {
    return rejection(
      "rate_limited",
      "Muitas tentativas. Aguarde um pouco e tente de novo.",
      limit.retryAfterSeconds,
    );
  }

  const { body, room } = await readBody(request);
  const session = await getUserAuth().api.getSession({ headers: request.headers });
  const account = session && {
    id: session.user.id,
    name: session.user.name,
    blocked: Boolean(session.user.blockedAt || session.user.deletedAt),
    emailVerified: session.user.emailVerified,
  };

  const result = await issueRoomToken({ account, body, ip, requestedRoom: room });
  if (result.ok) {
    return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
  }
  if ("failure" in result) {
    const log = await requestLogger({ route: "api/token" });
    log.error({ err: result.failure }, "falha ao gerar token");
  }
  return rejection(
    result.error,
    result.message,
    "retryAfterSeconds" in result ? result.retryAfterSeconds : undefined,
  );
}
