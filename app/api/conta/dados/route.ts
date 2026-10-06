import { count, desc, eq, sql } from "drizzle-orm";
import { getUserAuth } from "@/server/auth/user";
import { getDb } from "@/server/db";
import {
  roomParticipations,
  rooms,
  shareSessions,
  tokenRequests,
  users,
  userSessions,
} from "@/server/db/schema";
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

  const participations = await db
    .select({
      sala: rooms.code,
      nomeNaSala: roomParticipations.displayName,
      entrou: roomParticipations.joinedAt,
      saiu: roomParticipations.leftAt,
      ip: sql<string | null>`host(${roomParticipations.ip})`,
      compartilhamentos: count(shareSessions.id),
    })
    .from(roomParticipations)
    .innerJoin(rooms, eq(rooms.id, roomParticipations.roomId))
    .leftJoin(shareSessions, eq(shareSessions.participationId, roomParticipations.id))
    .where(eq(roomParticipations.userId, auth.user.id))
    .groupBy(roomParticipations.id, rooms.code)
    .orderBy(desc(roomParticipations.joinedAt))
    .limit(5000);
  const tokenLog = await db
    .select({
      sala: tokenRequests.roomCode,
      resultado: tokenRequests.result,
      ip: sql<string | null>`host(${tokenRequests.ip})`,
      quando: tokenRequests.createdAt,
    })
    .from(tokenRequests)
    .where(eq(tokenRequests.userId, auth.user.id))
    .orderBy(desc(tokenRequests.createdAt))
    .limit(5000);

  const body = JSON.stringify(
    {
      gerado_em: new Date().toISOString(),
      aviso: "Dados pessoais guardados pelo Nelcota ligados à sua conta.",
      conta: profile,
      sessoes_ativas: sessions,
      // Registros de acesso: guardados por 6 meses (Marco Civil, art. 15).
      participacoes_em_salas: participations,
      pedidos_de_entrada: tokenLog,
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
