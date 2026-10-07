import { personalData } from "@/features/account/server/personal-data.server";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { getDb } from "@/server/db/index.server";
import { createRateLimiter } from "@/server/rate-limit.server";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

/**
 * "Baixar meus dados" (download my data; LGPD, art. 18), as JSON. Only the data
 * subject, with a valid session and at most 5 requests per hour.
 */
export async function downloadAccountData(request: Request) {
  const auth = await getUserAuth().api.getSession({ headers: request.headers });
  // A blocked or deleted account has no session, as in getUserSession.
  if (!auth || auth.user.deletedAt || auth.user.blockedAt) {
    return Response.json(
      { message: "Entre na sua conta para baixar seus dados." },
      { status: 401 },
    );
  }
  if (!limiter.hit(auth.user.id).ok) {
    return Response.json(
      { message: "Muitos pedidos. Tente de novo em uma hora." },
      { status: 429 },
    );
  }
  const body = JSON.stringify(await personalData(getDb(), auth.user.id), null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nelcota-meus-dados.json"',
      "Cache-Control": "no-store",
    },
  });
}
