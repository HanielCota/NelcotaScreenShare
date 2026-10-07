import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { TOKEN_ERROR_STATUS, type TokenRefusal } from "@/features/room/domain/issue-token";
import { issueRoomToken } from "@/features/room/server/issue-token.server";
import { clientIpFrom } from "@/server/client-ip.server";
import { createRateLimiter } from "@/server/rate-limit.server";
import { requestLogger } from "@/server/request-log.server";

// Per-IP excess does not reach the database: a flood does not become a flood of writes.
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

/** Body read before the checks, only to record the requested room in every result. */
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
 * LiveKit token for joining a room. Only the HTTP edge lives here (origin,
 * IP, body, session); who may join is decided in features/room.
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
    log.error({ err: result.failure }, "failed to generate token");
  }
  return rejection(
    result.error,
    result.message,
    "retryAfterSeconds" in result ? result.retryAfterSeconds : undefined,
  );
}
