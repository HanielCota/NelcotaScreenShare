import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import {
  roomParticipations,
  rooms,
  shareSessions,
  tokenRequests,
  users,
  userSessions,
} from "@/server/db/schema";

/**
 * "Baixar meus dados" (LGPD, art. 18): tudo o que guardamos ligado à conta.
 * As chaves em português são o formato do arquivo que a pessoa recebe.
 */
export async function personalData(db: DbExecutor, userId: string) {
  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      email: users.email,
      emailVerified: users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  const sessions = await db
    .select({
      createdAt: userSessions.createdAt,
      updatedAt: userSessions.updatedAt,
      expiresAt: userSessions.expiresAt,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
    })
    .from(userSessions)
    .where(and(eq(userSessions.userId, userId), gt(userSessions.expiresAt, new Date())))
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
    .where(eq(roomParticipations.userId, userId))
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
    .where(eq(tokenRequests.userId, userId))
    .orderBy(desc(tokenRequests.createdAt))
    .limit(5000);

  return {
    gerado_em: new Date().toISOString(),
    aviso: "Dados pessoais guardados pelo Nelcota ligados à sua conta.",
    conta: profile,
    sessoes_ativas: sessions,
    // Registros de acesso: guardados por 6 meses (Marco Civil, art. 15).
    participacoes_em_salas: participations,
    pedidos_de_entrada: tokenLog,
  };
}
