import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, test } from "vitest";
import { getDashboardSummary } from "@/features/admin/dashboard/server/summary.server";
import { registerProInterest } from "@/features/home/server/pro-interest.server";
import * as schema from "@/server/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

function post(body: unknown, { ip = "203.0.113.1", origin = "http://localhost:3000" } = {}) {
  return registerProInterest(
    new Request("http://localhost:3000/api/pro/interesse", {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-client-ip": ip },
      body: JSON.stringify(body),
    }),
  );
}

test("an e-mail joins the Pro list once, whatever the casing", async () => {
  assert.equal((await post({ email: " Lia@Empresa.com " })).status, 201);
  assert.equal((await post({ email: "lia@empresa.com" }, { ip: "203.0.113.2" })).status, 201);
  const rows = await db.select().from(schema.proInterests);
  assert.deepEqual(
    rows.map((row) => row.email),
    ["lia@empresa.com"],
  );
  assert.equal((await getDashboardSummary(db)).proInterests, 1);
});

test("invalid e-mail, foreign origin and too many attempts are refused", async () => {
  assert.equal((await post({ email: "sem-arroba" }, { ip: "203.0.113.3" })).status, 400);
  assert.equal(
    (await post({ email: "a@b.com" }, { ip: "203.0.113.4", origin: "https://x.exemplo" })).status,
    403,
  );
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    statuses.push((await post({ email: `n${attempt}@b.com` }, { ip: "203.0.113.5" })).status);
  }
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
});
