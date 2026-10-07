import { ServerError } from "livekit-server-sdk";
import { z } from "zod";
import { roomCodeSchema } from "@/features/room/domain/room-code";
import { HAND_ATTRIBUTE } from "@/features/room/domain/data-channel";
import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { roomService } from "@/features/room/server/room-service.server";
import { createRateLimiter } from "@/server/rate-limit.server";
import { requestLogger } from "@/server/request-log.server";

const handSchema = z.object({ room: roomCodeSchema, raised: z.boolean() });
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function fail(message: string, status: number) {
  return Response.json({ message }, { status });
}

/**
 * Levantar ou baixar a mão. O atributo é gravado pelo servidor, e não pelo
 * navegador: o token não tem canUpdateOwnMetadata, que também permitiria
 * trocar o próprio nome na sala. A identidade é sempre a da conta logada.
 */
export async function POST(request: Request) {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  const auth = await getUserAuth().api.getSession({ headers: request.headers });
  if (!auth || auth.user.blockedAt || auth.user.deletedAt) {
    return fail("Entre na sua conta para continuar.", 401);
  }
  if (!limiter.hit(auth.user.id).ok) return fail("Muitas tentativas. Aguarde um pouco.", 429);

  const parsed = handSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Pedido inválido.", 400);
  const { room, raised } = parsed.data;

  try {
    await roomService().updateParticipant(room, auth.user.id, {
      attributes: { [HAND_ATTRIBUTE]: raised ? "1" : "" },
    });
  } catch (error) {
    if (error instanceof ServerError && error.status === 404) {
      return fail("Você não está nesta sala.", 409);
    }
    (await requestLogger({ route: "api/sala/mao" })).error(
      { err: error },
      "falha ao levantar a mão",
    );
    return fail("Não foi possível agora. Tente de novo.", 502);
  }
  return new Response(null, { status: 204 });
}
