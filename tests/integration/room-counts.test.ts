import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, test } from "vitest";
import { listRooms } from "@/features/admin/rooms/server/queries.server";
import { loadRoomParams } from "@/features/admin/rooms/domain/search-params";
import * as schema from "@/server/db/schema";
import { roomPresence } from "@/features/room/server/presence.server";

/**
 * Contagens por sala feitas com subconsulta: a coluna da sala de fora precisa
 * sair qualificada ("rooms"."id"), senão a subconsulta compara a própria
 * tabela e a contagem dá sempre zero.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

async function roomWith(code: string, online: number, left: number, shares: number) {
  const [room] = await db.insert(schema.rooms).values({ code }).returning();
  assert.ok(room);
  const participations = [];
  for (let i = 0; i < online + left; i++) {
    const [row] = await db
      .insert(schema.roomParticipations)
      .values({
        roomId: room.id,
        livekitIdentity: `pessoa-${i}`,
        livekitSid: `PA_${crypto.randomUUID()}`,
        joinedAt: new Date(Date.now() - 60_000),
        leftAt: i < online ? null : new Date(),
      })
      .returning();
    participations.push(row);
  }
  for (let i = 0; i < shares; i++) {
    await db.insert(schema.shareSessions).values({
      roomId: room.id,
      participationId: participations[0]?.id ?? "",
      trackSid: `TR_${crypto.randomUUID()}`,
      startedAt: new Date(Date.now() - 30_000),
    });
  }
  return room;
}

test("presença conta só quem ainda está na sala", async () => {
  const code = `presenca-${Date.now().toString(36)}`;
  await roomWith(code, 3, 2, 0);
  assert.deepEqual(await roomPresence(db, code), { online: 3 });
  assert.deepEqual(await roomPresence(db, "sala-que-nao-existe"), { online: 0 });
});

test("lista de salas do painel conta os compartilhamentos de cada sala", async () => {
  const code = `contagem-${Date.now().toString(36)}`;
  await roomWith(code, 1, 0, 2);
  const page = await listRooms(db, loadRoomParams(new URLSearchParams(`q=${code}`)), 10);
  assert.equal(page.items[0]?.code, code);
  assert.equal(page.items[0]?.shares, 2);
});
