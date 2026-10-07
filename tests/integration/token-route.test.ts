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
  LIVEKIT_URL: `ws://127.0.0.1:${address.port}`,
  ACCESS_PASSWORD: ACCESS,
  MAX_PARTICIPANTS: "3",
  AUTH_SECRET: "segredo-participantes-de-teste-0123456789abcdef",
});

const { POST } = await import("@/features/room/server/token-route.server");
const { getUserAuth } = await import("@/features/auth/server/participant-auth.server");
const { createRoomInvite } = await import("@/features/room/server/invites.server");

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
    new Request("http://localhost:3000/api/token", {
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
    // Sem trocar o próprio nome na sala: a mão levantada passa pelo servidor.
    assert.equal(video.canUpdateOwnMetadata, undefined);
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

/** Convite para a sala (criada se ainda não existir), como o painel faria. */
async function inviteFor(
  code: string,
  { maxUses = null, expiresAt = null }: { maxUses?: number | null; expiresAt?: Date | null } = {},
) {
  const [owner] = await db
    .insert(schema.adminUsers)
    .values({ email: `convite-${crypto.randomUUID()}@exemplo.com`, name: "Admin", role: "admin" })
    .returning({ id: schema.adminUsers.id });
  let [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, code));
  if (!room) [room] = await db.insert(schema.rooms).values({ code }).returning();
  return createRoomInvite(db, {
    roomId: room?.id ?? "",
    label: null,
    maxUses,
    expiresAt,
    createdBy: owner?.id ?? "",
  });
}

describe("convites de sala", () => {
  test("convite válido entra sem a senha de acesso", async () => {
    const kai = await verifiedParticipant(db, handler);
    const room = `sala-conv-${Date.now().toString(36)}`;
    const { token } = await inviteFor(room);
    const response = await post({ room, invite: token }, { cookie: kai.jar.header() });
    assert.equal(response.status, 200);
    // Sem o convite, a senha continua obrigatória.
    const without = await post({ room }, { cookie: kai.jar.header() });
    assert.equal(without.status, 401);
  });

  test("limite conta pessoas: quem já usou volta; a próxima pessoa é recusada", async () => {
    const room = `sala-lim-${Date.now().toString(36)}`;
    const { id, token } = await inviteFor(room, { maxUses: 1 });
    const leo = await verifiedParticipant(db, handler);
    const mia = await verifiedParticipant(db, handler);
    assert.equal((await post({ room, invite: token }, { cookie: leo.jar.header() })).status, 200);
    assert.equal((await post({ room, invite: token }, { cookie: leo.jar.header() })).status, 200);
    const full = await post({ room, invite: token }, { cookie: mia.jar.header() });
    assert.equal(full.status, 403);
    assert.equal(await errorCode(full), "invite_invalid");
    const [invite] = await db
      .select()
      .from(schema.roomInvites)
      .where(eq(schema.roomInvites.id, id));
    assert.equal(invite?.uses, 1);
    const [logged] = await db
      .select({ result: schema.tokenRequests.result })
      .from(schema.tokenRequests)
      .where(eq(schema.tokenRequests.userId, mia.id));
    assert.equal(logged?.result, "invite_invalid");
  });

  test("expirado, revogado, de outra sala ou forjado: recusado", async () => {
    const nil = await verifiedParticipant(db, handler);
    const cookie = nil.jar.header();
    const room = `sala-rec-${Date.now().toString(36)}`;
    const expired = await inviteFor(room, { expiresAt: new Date(Date.now() - 1000) });
    const revoked = await inviteFor(room);
    await db
      .update(schema.roomInvites)
      .set({ revokedAt: new Date() })
      .where(eq(schema.roomInvites.id, revoked.id));
    const other = await inviteFor(`outra-${Date.now().toString(36)}`);
    for (const invite of [expired.token, revoked.token, other.token, "x".repeat(43)]) {
      const response = await post({ room, invite }, { cookie });
      assert.equal(response.status, 403, invite);
      assert.equal(await errorCode(response), "invite_invalid");
    }
  });

  test("sala cheia não gasta uso do convite", async () => {
    const { id, token } = await inviteFor("sala-cheia", { maxUses: 3 });
    const ota = await verifiedParticipant(db, handler);
    const response = await post(
      { room: "sala-cheia", invite: token },
      { cookie: ota.jar.header() },
    );
    assert.equal(response.status, 409);
    const [invite] = await db
      .select()
      .from(schema.roomInvites)
      .where(eq(schema.roomInvites.id, id));
    assert.equal(invite?.uses, 0);
  });
});
