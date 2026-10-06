import assert from "node:assert/strict";
import { createServer } from "node:http";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, test } from "vitest";
import { z } from "zod";
import * as schema from "@/server/db/schema";
import { verifiedParticipant } from "./support/accounts";

/**
 * POST /api/token de ponta a ponta: conta real no Postgres e um LiveKit falso
 * que responde ao ListParticipants (Twirp/JSON) conforme o nome da sala.
 */
const ACCESS = "senha-de-acesso-123";
const jsonObject = z.record(z.string(), z.unknown());
const errorBody = z.object({ error: z.string() });
const tokenBody = z.object({ token: z.string(), serverUrl: z.string() });

const fakeLiveKit = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk: Buffer) => (body += chunk.toString()));
  request.on("end", () => {
    const { room } = jsonObject.parse(JSON.parse(body || "{}"));
    response.setHeader("Content-Type", "application/json");
    if (room === "sala-nova") {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: "not_found", msg: "room not found" }));
    } else if (room === "sala-quebrada") {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: "internal", msg: "boom" }));
    } else {
      const count = room === "sala-cheia" ? 3 : 1;
      response.end(
        JSON.stringify({
          participants: Array.from({ length: count }, (_, i) => ({ identity: `p${i}` })),
        }),
      );
    }
  });
});
await new Promise<void>((resolve) => fakeLiveKit.listen(0, "127.0.0.1", resolve));
const address = fakeLiveKit.address();
assert.ok(address && typeof address !== "string");

Object.assign(process.env, {
  NEXT_PUBLIC_LIVEKIT_URL: `ws://127.0.0.1:${address.port}`,
  ACCESS_PASSWORD: ACCESS,
  MAX_PARTICIPANTS: "3",
  AUTH_SECRET: "segredo-participantes-de-teste-0123456789abcdef",
});

const { POST } = await import("@/app/api/token/route");
const { NextRequest } = await import("next/server");
const { getUserAuth } = await import("@/server/auth/user");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(async () => {
  fakeLiveKit.close();
  await pool.end();
});

const handler = (request: Request) => getUserAuth().handler(request);

let nextIp = 1;
function freshIp() {
  return `10.0.0.${nextIp++}`;
}

function post(
  body: unknown,
  {
    cookie,
    ip = freshIp(),
    origin = "http://localhost:3000",
  }: { cookie?: string; ip?: string; origin?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json", origin, "x-client-ip": ip });
  if (cookie) headers.set("cookie", cookie);
  return POST(
    new NextRequest("http://localhost:3000/api/token", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function errorCode(response: Response): Promise<string> {
  return errorBody.parse(await response.json()).error;
}

function claims(token: string): Record<string, unknown> {
  const [, payload = ""] = token.split(".");
  return jsonObject.parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
}

describe("acesso", () => {
  test("sem conta: 401", async () => {
    const response = await post({ room: "sala-ok", password: ACCESS });
    assert.equal(response.status, 401);
    assert.equal(await errorCode(response), "unauthenticated");
  });

  test("outra origem: 403", async () => {
    const ana = await verifiedParticipant(db, handler);
    const response = await post(
      { room: "sala-ok", password: ACCESS },
      { cookie: ana.jar.header(), origin: "https://malicioso.exemplo" },
    );
    assert.equal(response.status, 403);
  });

  test("e-mail deixou de estar confirmado: 403", async () => {
    const bia = await verifiedParticipant(db, handler);
    await db.update(schema.users).set({ emailVerified: false }).where(eq(schema.users.id, bia.id));
    const response = await post(
      { room: "sala-ok", password: ACCESS },
      { cookie: bia.jar.header() },
    );
    assert.equal(response.status, 403);
    assert.equal(await errorCode(response), "email_unverified");
  });

  test("conta bloqueada pelo painel: 403", async () => {
    const caio = await verifiedParticipant(db, handler);
    await db
      .update(schema.users)
      .set({ blockedAt: new Date() })
      .where(eq(schema.users.id, caio.id));
    const response = await post(
      { room: "sala-ok", password: ACCESS },
      { cookie: caio.jar.header() },
    );
    assert.equal(response.status, 403);
    assert.equal(await errorCode(response), "blocked");
  });
});

describe("token", () => {
  test("identidade e nome vêm da conta; só microfone e tela", async () => {
    const dani = await verifiedParticipant(db, handler, { name: "Dani Souza" });
    const response = await post(
      // Um "name" mandado pelo navegador é ignorado (não está no schema).
      { room: "Sala-Teste", password: ACCESS, name: "Impostor" },
      { cookie: dani.jar.header() },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { token, serverUrl } = tokenBody.parse(await response.json());
    assert.equal(serverUrl, `ws://127.0.0.1:${address.port}`);
    const payload = claims(token);
    assert.equal(payload.sub, dani.id);
    assert.equal(payload.name, "Dani Souza");
    const video = jsonObject.parse(payload.video);
    assert.equal(video.room, "sala-teste");
    assert.deepEqual(video.canPublishSources, ["microphone", "screen_share", "screen_share_audio"]);
    assert.equal(video.canPublishData, true);
    assert.equal(video.canUpdateOwnMetadata, true);
  });

  test("sala nova, sala cheia e LiveKit com erro", async () => {
    const edu = await verifiedParticipant(db, handler);
    const cookie = edu.jar.header();
    assert.equal((await post({ room: "sala-nova", password: ACCESS }, { cookie })).status, 200);
    const full = await post({ room: "sala-cheia", password: ACCESS }, { cookie });
    assert.equal(full.status, 409);
    assert.equal(await errorCode(full), "room_full");
    const broken = await post({ room: "sala-quebrada", password: ACCESS }, { cookie });
    assert.equal(broken.status, 502);
    assert.equal(await errorCode(broken), "server_error");
  });

  test("valida o corpo", async () => {
    const fe = await verifiedParticipant(db, handler);
    const cookie = fe.jar.header();
    for (const body of [
      "{não é json",
      { room: "x", password: ACCESS },
      { room: "sala-ok", password: "a".repeat(129) },
    ]) {
      const response = await post(body, { cookie });
      assert.equal(response.status, 400);
      assert.equal(await errorCode(response), "invalid_request");
    }
  });

  test("senha de acesso errada: 5 chances por IP", async () => {
    const gil = await verifiedParticipant(db, handler);
    const cookie = gil.jar.header();
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      const response = await post({ room: "sala-ok", password: "errada" }, { cookie, ip });
      assert.equal(response.status, 401);
      assert.equal(await errorCode(response), "invalid_password");
    }
    const blocked = await post({ room: "sala-ok", password: ACCESS }, { cookie, ip });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 60);
  });

  test("limite de 20 pedidos por minuto por conta, mesmo trocando de IP", async () => {
    const hugo = await verifiedParticipant(db, handler);
    const cookie = hugo.jar.header();
    for (let i = 0; i < 20; i++) {
      assert.equal((await post({ room: "sala-ok", password: ACCESS }, { cookie })).status, 200);
    }
    const limited = await post({ room: "sala-ok", password: ACCESS }, { cookie });
    assert.equal(limited.status, 429);
  });
});

function requestsOf(roomCode: string) {
  return db
    .select()
    .from(schema.tokenRequests)
    .where(eq(schema.tokenRequests.roomCode, roomCode))
    .orderBy(schema.tokenRequests.createdAt);
}

describe("registro em token_requests", () => {
  test("cada resultado vira uma linha, com conta e IP", async () => {
    const ivo = await verifiedParticipant(db, handler);
    const cookie = ivo.jar.header();
    const room = `sala-registro-${Date.now().toString(36)}`;
    await post({ room, password: ACCESS });
    await post({ room, password: "errada" }, { cookie, ip: "198.51.100.9" });
    await post({ room: room.toUpperCase(), password: ACCESS }, { cookie, ip: "198.51.100.9" });

    const rows = await requestsOf(room);
    assert.deepEqual(
      rows.map((row) => row.result),
      ["unauthenticated", "wrong_password", "granted"],
    );
    assert.equal(rows[0]?.userId, null);
    assert.equal(rows[2]?.userId, ivo.id);
    assert.equal(rows[2]?.ip, "198.51.100.9");
  });

  test("sala cheia, erro do LiveKit e corpo inválido também ficam registrados", async () => {
    const ju = await verifiedParticipant(db, handler);
    const cookie = ju.jar.header();
    const before = await db
      .select()
      .from(schema.tokenRequests)
      .where(eq(schema.tokenRequests.userId, ju.id));
    assert.equal(before.length, 0);
    await post({ room: "sala-cheia", password: ACCESS }, { cookie });
    await post({ room: "sala-quebrada", password: ACCESS }, { cookie });
    await post("{não é json", { cookie });
    const rows = await db
      .select()
      .from(schema.tokenRequests)
      .where(eq(schema.tokenRequests.userId, ju.id))
      .orderBy(schema.tokenRequests.createdAt);
    assert.deepEqual(
      rows.map((row) => [row.result, row.roomCode]),
      [
        ["room_full", "sala-cheia"],
        ["error", "sala-quebrada"],
        ["invalid", ""],
      ],
    );
  });
});
