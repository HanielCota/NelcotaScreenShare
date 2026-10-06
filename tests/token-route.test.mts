import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { z } from "zod";
// oxlint-disable-next-line import/no-unassigned-import -- Só registra os hooks de resolução de módulos.
import "./support/register.mts";

/**
 * Testa o POST /api/token de ponta a ponta, com um LiveKit falso que responde
 * ao ListParticipants (Twirp/JSON) conforme o nome da sala.
 */
const PASSWORD = "senha-de-teste-123";
const SECRET = "segredo-de-teste-0123456789abcdef0123456789";
const jsonObjectSchema = z.record(z.string(), z.unknown());
const errorResponseSchema = z.object({ error: z.string() });
const tokenResponseSchema = z.object({ token: z.string(), serverUrl: z.string() });

const fakeLiveKit = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk: Buffer) => (body += chunk.toString()));
  request.on("end", () => {
    const { room } = jsonObjectSchema.parse(JSON.parse(body || "{}"));
    response.setHeader("Content-Type", "application/json");
    if (room === "sala-nova") {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: "not_found", msg: "room not found" }));
    } else if (room === "sala-quebrada") {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: "internal", msg: "boom" }));
    } else {
      const count = room === "sala-cheia" ? 3 : 1;
      const participants = Array.from({ length: count }, (_, i) => ({ identity: `p${i}` }));
      response.end(JSON.stringify({ participants }));
    }
  });
});
await new Promise<void>((resolve) => fakeLiveKit.listen(0, "127.0.0.1", resolve));
const address = fakeLiveKit.address();
assert.ok(address && typeof address !== "string", "LiveKit falso deve escutar em uma porta TCP");
const { port } = address;

Object.assign(process.env, {
  LIVEKIT_API_KEY: "chave-teste",
  LIVEKIT_API_SECRET: SECRET,
  NEXT_PUBLIC_LIVEKIT_URL: `ws://127.0.0.1:${port}`,
  ACCESS_PASSWORD: PASSWORD,
  MAX_PARTICIPANTS: "3",
  TRUSTED_PROXY_HOPS: "1",
});

const { NextRequest } = await import("next/server");
const { POST } = await import("../app/api/token/route");

let nextIp = 1;
/** Cada teste usa um IP próprio para não herdar contagens do rate limit. */
function freshIp(): string {
  return `10.0.0.${nextIp++}`;
}

function post(body: unknown, ip: string) {
  return POST(
    new NextRequest("http://localhost/api/token", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `1.2.3.4, ${ip}` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function errorCode(response: Response): Promise<string> {
  return errorResponseSchema.parse(await response.json()).error;
}

function jwtPayload(token: string): Record<string, unknown> {
  const [, payload = ""] = token.split(".");
  return jsonObjectSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString()));
}

await test("gera token com permissões só de microfone e tela", async () => {
  const response = await post(
    { room: "Sala-Teste", name: "Ana Maria", password: PASSWORD },
    freshIp(),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const { token, serverUrl } = tokenResponseSchema.parse(await response.json());
  assert.equal(serverUrl, `ws://127.0.0.1:${port}`);

  const claims = jwtPayload(token);
  assert.equal(claims.name, "Ana Maria");
  assert.match(String(claims.sub), /^ana-maria-[0-9a-f]{8}$/);
  const video = jsonObjectSchema.parse(claims.video);
  assert.equal(video.room, "sala-teste");
  assert.equal(video.roomJoin, true);
  assert.deepEqual(video.canPublishSources, ["microphone", "screen_share", "screen_share_audio"]);
  assert.equal(video.canPublishData, true);
  assert.equal(video.canUpdateOwnMetadata, true);
});

await test("sala que ainda não existe conta como vazia", async () => {
  const response = await post({ room: "sala-nova", name: "Bia", password: PASSWORD }, freshIp());
  assert.equal(response.status, 200);
});

await test("recusa sala cheia", async () => {
  const response = await post({ room: "sala-cheia", name: "Caio", password: PASSWORD }, freshIp());
  assert.equal(response.status, 409);
  assert.equal(await errorCode(response), "room_full");
});

await test("LiveKit com erro vira 502 com mensagem amigável", async () => {
  const response = await post(
    { room: "sala-quebrada", name: "Dani", password: PASSWORD },
    freshIp(),
  );
  assert.equal(response.status, 502);
  assert.equal(await errorCode(response), "server_error");
});

await test("valida o corpo da requisição", async () => {
  const ip = freshIp();
  const cases: [unknown, string][] = [
    ["{não é json", "json"],
    [{ room: "x", name: "Edu", password: PASSWORD }, "room"],
    [{ room: "sala-ok", name: "   ", password: PASSWORD }, "name"],
    [{ room: "sala-ok", name: "a".repeat(33), password: PASSWORD }, "name"],
  ];
  for (const [body, field] of cases) {
    const response = await post(body, ip);
    assert.equal(response.status, 400, `campo ${field}`);
    assert.equal(await errorCode(response), "invalid_request");
  }
});

await test("senha errada: 5 chances por IP, depois bloqueia até com a senha certa", async () => {
  const ip = freshIp();
  for (let i = 0; i < 5; i++) {
    const response = await post({ room: "sala-ok", name: "Fê", password: "errada" }, ip);
    assert.equal(response.status, 401);
    assert.equal(await errorCode(response), "invalid_password");
  }
  const blocked = await post({ room: "sala-ok", name: "Fê", password: PASSWORD }, ip);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 60);

  // Outro IP não é afetado.
  const other = await post({ room: "sala-ok", name: "Gil", password: PASSWORD }, freshIp());
  assert.equal(other.status, 200);
});

await test("senha certa zera as tentativas erradas", async () => {
  const ip = freshIp();
  for (let i = 0; i < 4; i++) await post({ room: "sala-ok", name: "Hugo", password: "x" }, ip);
  assert.equal((await post({ room: "sala-ok", name: "Hugo", password: PASSWORD }, ip)).status, 200);
  for (let i = 0; i < 4; i++) {
    assert.equal((await post({ room: "sala-ok", name: "Hugo", password: "x" }, ip)).status, 401);
  }
});

await test("limite geral de 20 requisições por minuto por IP", async () => {
  const ip = freshIp();
  for (let i = 0; i < 20; i++) {
    const response = await post({ room: "sala-ok", name: "Iris", password: PASSWORD }, ip);
    assert.equal(response.status, 200);
  }
  const limited = await post({ room: "sala-ok", name: "Iris", password: PASSWORD }, ip);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
});

fakeLiveKit.close();
