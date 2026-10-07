import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, test } from "vitest";
import * as schema from "@/server/db/schema";
import { recentRoomsFor } from "@/features/room/server/recent.server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

async function person(name: string) {
  const [row] = await db
    .insert(schema.users)
    .values({ name, email: `${name.toLowerCase()}-${crypto.randomUUID()}@exemplo.com` })
    .returning({ id: schema.users.id });
  assert.ok(row);
  return row.id;
}

async function room(code: string, values: Partial<typeof schema.rooms.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.rooms)
    .values({ code, ...values })
    .returning({ id: schema.rooms.id });
  assert.ok(row);
  return row.id;
}

async function join(roomId: string, userId: string | null, minutesAgo: number, left: boolean) {
  const joinedAt = new Date(Date.now() - minutesAgo * 60_000);
  await db.insert(schema.roomParticipations).values({
    roomId,
    userId,
    livekitIdentity: userId ?? "visitante",
    livekitSid: `PA_${crypto.randomUUID()}`,
    joinedAt,
    leftAt: left ? new Date(joinedAt.getTime() + 60_000) : null,
  });
}

test("salas recentes: mais nova primeiro, ao vivo com quem está dentro, sem excluídas", async () => {
  const tag = Date.now().toString(36);
  const ana = await person("Ana");
  const bia = await person("Bia");
  const live = await room(`ao-vivo-${tag}`);
  const old = await room(`antiga-${tag}`, {
    status: "finished",
    startedAt: new Date(Date.now() - 4000 * 60_000),
    finishedAt: new Date(),
  });
  const gone = await room(`excluida-${tag}`, { deletedAt: new Date() });

  await join(old, ana, 3000, true);
  await join(old, ana, 600, true); // duas vezes na mesma sala: aparece uma vez só
  await join(live, ana, 5, false);
  await join(live, bia, 2, false);
  await join(gone, ana, 1, true);

  const rooms = await recentRoomsFor(db, ana);
  assert.deepEqual(
    rooms.map((row) => [row.code, row.live, row.online]),
    [
      [`ao-vivo-${tag}`, true, 2],
      [`antiga-${tag}`, false, 0],
    ],
  );
  assert.deepEqual(await recentRoomsFor(db, await person("Nova")), []);
});
