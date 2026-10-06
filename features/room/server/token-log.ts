import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { rooms, tokenRequests } from "@/server/db/schema";
import { logger } from "@/server/logger";

export type TokenResult = (typeof tokenRequests.$inferInsert)["result"];

/**
 * Registra um pedido ao /api/token (segurança, métricas e o IP da entrada).
 * Falhar aqui nunca impede a entrada na sala: só vai para o log.
 */
export async function recordTokenRequest(entry: {
  roomCode: string;
  userId: string | null;
  result: TokenResult;
  ip: string | null;
}): Promise<void> {
  const db = getDb();
  const roomCode = entry.roomCode.slice(0, 64);
  try {
    await db.insert(tokenRequests).values({
      roomCode,
      roomId: sql`(select ${rooms.id} from ${rooms} where ${rooms.code} = ${roomCode} and ${rooms.deletedAt} is null)`,
      userId: entry.userId,
      result: entry.result,
      ip: entry.ip,
    });
  } catch (error) {
    logger.error({ err: error, result: entry.result }, "falha ao registrar pedido de token");
  }
}
