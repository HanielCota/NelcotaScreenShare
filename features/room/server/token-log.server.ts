import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/index.server";
import { rooms, tokenRequests } from "@/server/db/schema";
import { logger } from "@/server/logger.server";

export type TokenResult = (typeof tokenRequests.$inferInsert)["result"];

/**
 * Records a request to /api/token (security, metrics and the join IP).
 * Failing here never blocks joining the room: it only goes to the log.
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
    logger.error({ err: error, result: entry.result }, "failed to record token request");
  }
}
