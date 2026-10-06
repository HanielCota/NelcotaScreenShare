import { desc, eq } from "drizzle-orm";
import { getUserAuth } from "@/server/auth/user";
import { getDb } from "@/server/db";
import { users, userSessions } from "@/server/db/schema";
import { createRateLimiter } from "@/server/rate-limit";

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

/**
 * "Baixar meus dados" (LGPD, art. 18): tudo o que guardamos ligado à conta,
 * em JSON. Só o próprio titular, com sessão válida.
 */
export async function GET(request: Request) {
  const auth = await getUserAuth().api.getSession({ headers: request.headers });
  const db = getDb();
  if (!auth || !db || auth.user.deletedAt) {
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
  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.id, auth.user.id));
  const sessions = await db
    .select({
      createdAt: userSessions.createdAt,
      updatedAt: userSessions.updatedAt,
      expiresAt: userSessions.expiresAt,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
    })
    .from(userSessions)
    .where(eq(userSessions.userId, auth.user.id))
    .orderBy(desc(userSessions.createdAt));

  const body = JSON.stringify(
    {
      gerado_em: new Date().toISOString(),
      aviso: "Dados pessoais guardados pelo Nelcota ligados à sua conta.",
      conta: profile,
      sessoes_ativas: sessions,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nelcota-meus-dados.json"',
      "Cache-Control": "no-store",
    },
  });
}
