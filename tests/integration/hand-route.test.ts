import { createServer } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import * as schema from "@/server/db/schema";
import { verifiedParticipant } from "./support/accounts";

/** POST /api/sala/mao: the server writes the attribute to the (fake) LiveKit with the account's identity. */
const received: { path: string; body: Record<string, unknown> }[] = [];
const fakeLiveKit = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk: Buffer) => (body += chunk.toString()));
  request.on("end", () => {
    const parsed = z.record(z.string(), z.unknown()).parse(JSON.parse(body || "{}"));
    received.push({ path: request.url ?? "", body: parsed });
    response.setHeader("Content-Type", "application/json");
    if (parsed.room === "sala-vazia") {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: "not_found", msg: "participant not found" }));
      return;
    }
    response.end(JSON.stringify({ identity: parsed.identity }));
  });
});
await new Promise<void>((resolve) => fakeLiveKit.listen(0, "127.0.0.1", resolve));
const address = fakeLiveKit.address();
if (!address || typeof address === "string") throw new Error("no port");

Object.assign(process.env, {
  LIVEKIT_URL: `ws://127.0.0.1:${address.port}`,
  AUTH_SECRET: "segredo-participantes-de-teste-0123456789abcdef",
});

const { setRaisedHand } = await import("@/features/room/server/hand-route.server");
const { getUserAuth } = await import("@/features/auth/server/participant-auth.server");
const { newGuestSession } = await import("@/features/room/server/guest-session.server");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(async () => {
  fakeLiveKit.close();
  await pool.end();
});
const handler = (request: Request) => getUserAuth().handler(request);

function post(body: unknown, cookie?: string, origin = "http://localhost:3000") {
  const headers = new Headers({ "content-type": "application/json", origin });
  if (cookie) headers.set("cookie", cookie);
  return setRaisedHand(
    new Request("http://localhost:3000/api/sala/mao", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

describe("raise hand", () => {
  it("writes the attribute with the account's identity", async () => {
    const ana = await verifiedParticipant(db, handler);
    const response = await post({ room: "Sala-Teste", raised: true }, ana.jar.header());
    expect(response.status).toBe(204);
    const call = received.at(-1);
    expect(call?.path).toContain("UpdateParticipant");
    expect(call?.body).toMatchObject({
      room: "sala-teste",
      identity: ana.id,
      attributes: { hand: "1" },
    });

    await post({ room: "sala-teste", raised: false }, ana.jar.header());
    expect(received.at(-1)?.body).toMatchObject({ attributes: { hand: "" } });
  });

  it("a guest writes it with the identity from the signed guest cookie", async () => {
    const { guestId, setCookie } = newGuestSession(new Request("http://localhost:3000/api/token"));
    const response = await post({ room: "sala-teste", raised: true }, setCookie.split(";")[0]);
    expect(response.status).toBe(204);
    expect(received.at(-1)?.body).toMatchObject({ identity: `convidado-${guestId}` });
    const forged = `nelcota_convidado=${guestId}.assinatura-falsa`;
    expect((await post({ room: "sala-teste", raised: true }, forged)).status).toBe(401);
  });

  it("rejects no account, foreign origin and invalid request", async () => {
    expect((await post({ room: "sala-teste", raised: true })).status).toBe(401);
    const bia = await verifiedParticipant(db, handler);
    const cookie = bia.jar.header();
    expect(
      (await post({ room: "sala-teste", raised: true }, cookie, "https://x.exemplo")).status,
    ).toBe(403);
    expect((await post({ room: "../x", raised: true }, cookie)).status).toBe(400);
    expect((await post({ room: "sala-teste", raised: "sim" }, cookie)).status).toBe(400);
  });

  it("someone not in the room gets 409", async () => {
    const caio = await verifiedParticipant(db, handler);
    expect((await post({ room: "sala-vazia", raised: true }, caio.jar.header())).status).toBe(409);
  });
});
