import { proInterestSchema } from "@/features/home/domain/pro-interest";
import { clientIpFrom } from "@/server/client-ip.server";
import { getDb } from "@/server/db/index.server";
import { proInterests } from "@/server/db/schema";
import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import { createRateLimiter } from "@/server/rate-limit.server";
import { readJsonBody, SMALL_JSON_MAX_BYTES } from "@/server/body.server";

// A handful per IP: enough for typos, not for filling the list with junk.
const perIpLimit = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

const reply = (message: string, status: number) => Response.json({ message }, { status });

/**
 * Adds an e-mail to the Pro launch list. The same e-mail twice is not an error: the answer
 * does not reveal whether it was already on the list.
 */
export async function registerProInterest(request: Request): Promise<Response> {
  if (isCrossSiteMutation(request)) return forbiddenCrossSite();
  if (!perIpLimit.hit(clientIpFrom(request.headers) ?? "desconhecido").ok) {
    return reply("Muitas tentativas. Aguarde alguns minutos e tente de novo.", 429);
  }
  const parsed = proInterestSchema.safeParse(await readJsonBody(request, SMALL_JSON_MAX_BYTES));
  if (!parsed.success) {
    return reply(parsed.error.issues[0]?.message ?? "Confira o e-mail.", 400);
  }
  await getDb().insert(proInterests).values({ email: parsed.data.email }).onConflictDoNothing();
  return reply("Pronto! Avisamos por e-mail quando o Pro abrir.", 201);
}
