import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db/index.server";
import { roomParticipations, rooms } from "@/server/db/schema";

/**
 * Quem está na sala agora (pelas participações abertas que o webhook do
 * LiveKit registra). Para a pré-entrada dizer "2 pessoas já estão na sala".
 */
export async function roomPresence(db: DbExecutor, code: string): Promise<{ online: number }> {
  const [row] = await db
    .select({
      // "rooms"."id" explícito: sem join, o Drizzle escreve só "id" e a subconsulta
      // compararia a própria tabela (contagem sempre zero).
      online: sql<number>`(select count(*)::int from ${roomParticipations} as here
        where here.room_id = ${sql.identifier("rooms")}.${sql.identifier("id")} and here.left_at is null)`,
    })
    .from(rooms)
    .where(and(eq(rooms.code, code), eq(rooms.status, "active"), isNull(rooms.deletedAt)));
  return { online: row?.online ?? 0 };
}
