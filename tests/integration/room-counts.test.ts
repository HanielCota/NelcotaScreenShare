import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, test } from "vitest";
import { listRooms } from "@/features/admin/rooms/server/queries.server";
import { loadRoomParams } from "@/features/admin/rooms/domain/search-params";
import * as schema from "@/server/db/schema";
import { roomPresence } from "@/features/room/server/presence.server";

/** Presence and share counts must stay scoped to the requested room. */
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

test("presence counts only those still in the room", async () => {
  const code = `presenca-${Date.now().toString(36)}`;
  await roomWith(code, 3, 2, 0);
  await roomWith(`other-${Date.now().toString(36)}`, 1, 0, 0);
  const presence = await roomPresence(db, code);
  assert.equal(presence.online, 3);
  assert.equal(presence.participants.length, 3);
  assert.ok(
    presence.participants.every(({ name, image }) => name === "Participante" && image === null),
  );
  assert.deepEqual(await roomPresence(db, "sala-que-nao-existe"), { online: 0, participants: [] });
});

test("presence includes current account photos and the name used when joining", async () => {
  const code = `profiles-${Date.now().toString(36)}`;
  const room = await roomWith(code, 0, 0, 0);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: "Ana Atual",
      email: `${code}@example.com`,
      image: "https://example.com/ana.png",
    })
    .returning();
  assert.ok(user);
  const [participation] = await db
    .insert(schema.roomParticipations)
    .values({
      roomId: room.id,
      userId: user.id,
      livekitIdentity: user.id,
      livekitSid: `PA_${crypto.randomUUID()}`,
      displayName: "Ana na Sala",
      joinedAt: new Date(),
    })
    .returning();
  assert.ok(participation);
  assert.deepEqual(await roomPresence(db, code), {
    online: 1,
    participants: [{ id: participation.id, name: "Ana na Sala", image: user.image }],
  });

  await db.update(schema.users).set({ deletedAt: new Date() }).where(eq(schema.users.id, user.id));
  assert.equal((await roomPresence(db, code)).participants[0]?.image, null);
});

test("presence excludes finished and deleted rooms even with open participations", async () => {
  const code = `inactive-${Date.now().toString(36)}`;
  const room = await roomWith(code, 1, 0, 0);
  await db.update(schema.rooms).set({ status: "finished" }).where(eq(schema.rooms.id, room.id));
  assert.deepEqual(await roomPresence(db, code), { online: 0, participants: [] });
  await db
    .update(schema.rooms)
    .set({ status: "active", deletedAt: new Date() })
    .where(eq(schema.rooms.id, room.id));
  assert.deepEqual(await roomPresence(db, code), { online: 0, participants: [] });
});

test("admin room list counts each room's screen shares", async () => {
  const code = `contagem-${Date.now().toString(36)}`;
  await roomWith(code, 1, 0, 2);
  const page = await listRooms(db, loadRoomParams(new URLSearchParams(`q=${code}`)), 10);
  assert.equal(page.items[0]?.code, code);
  assert.equal(page.items[0]?.shares, 2);
});
