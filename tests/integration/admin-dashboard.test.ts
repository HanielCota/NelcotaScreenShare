import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, test } from "vitest";
import { getDashboardSummary } from "@/features/admin/dashboard/server/summary.server";
import * as schema from "@/server/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

const HOUR = 60 * 60 * 1000;

async function participation(roomId: string, leftAt: Date | null) {
  const [row] = await db
    .insert(schema.roomParticipations)
    .values({
      roomId,
      livekitIdentity: crypto.randomUUID(),
      livekitSid: `PA_${crypto.randomUUID()}`,
      joinedAt: new Date(Date.now() - HOUR),
      leftAt,
    })
    .returning({ id: schema.roomParticipations.id });
  assert.ok(row);
  return row.id;
}

test("the summary counts what is live now and what moved recently", async () => {
  const suffix = Date.now().toString(36);
  const [open] = await db
    .insert(schema.rooms)
    .values({ code: `aberta-${suffix}` })
    .returning();
  const [closed] = await db
    .insert(schema.rooms)
    .values({
      code: `fechada-${suffix}`,
      status: "finished",
      startedAt: new Date(Date.now() - 2 * HOUR),
      finishedAt: new Date(Date.now() - HOUR),
    })
    .returning();
  assert.ok(open && closed);

  const sharer = await participation(open.id, null);
  await participation(open.id, null);
  await participation(open.id, new Date());
  await participation(closed.id, null);

  await db.insert(schema.shareSessions).values([
    { roomId: open.id, participationId: sharer, trackSid: `TR_${suffix}-1`, startedAt: new Date() },
    {
      roomId: open.id,
      participationId: sharer,
      trackSid: `TR_${suffix}-2`,
      startedAt: new Date(Date.now() - 30 * HOUR),
      endedAt: new Date(Date.now() - 29 * HOUR),
    },
  ]);

  const before = await getDashboardSummary(db);
  await db.insert(schema.users).values([
    { name: "Nova", email: `nova-${suffix}@example.com` },
    {
      name: "Antiga",
      email: `antiga-${suffix}@example.com`,
      createdAt: new Date(Date.now() - 10 * 24 * HOUR),
    },
  ]);
  const after = await getDashboardSummary(db);

  assert.equal(before.activeRooms, 1);
  assert.equal(before.peopleOnline, 2);
  assert.equal(before.sharesToday, 1);
  assert.equal(after.newParticipants - before.newParticipants, 1);
});
