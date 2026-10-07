import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, vi } from "vitest";
import { z } from "zod";

const KEY = "chave-teste";
const SECRET = "segredo-de-teste-0123456789abcdef0123456789";

Object.assign(process.env, {
  DATABASE_URL: "postgres://ninguem@127.0.0.1:1/naoexiste",
  AUTH_SECRET: "segredo-de-teste-unitario-0123456789abcdef",
  LIVEKIT_API_KEY: KEY,
  LIVEKIT_API_SECRET: SECRET,
  LIVEKIT_URL: "ws://127.0.0.1:7880",
});

const { AccessToken } = await import("livekit-server-sdk");
const { POST } = await import("../../app/routes/api/livekit-webhook.server");
const { logger } = await import("../../server/logger.server");

const body = JSON.stringify({
  event: "participant_joined",
  room: { name: "sala-teste" },
  participant: { identity: "ana-1234", name: "Ana" },
  createdAt: "1791300000",
});

/** Cabeçalho como o LiveKit envia: JWT com o sha256 do corpo. */
async function signature(payload: string, secret = SECRET): Promise<string> {
  const token = new AccessToken(KEY, secret);
  token.sha256 = createHash("sha256").update(payload).digest("base64");
  return token.toJwt();
}

function post(payload: string, authorization?: string) {
  return POST(
    new Request("http://localhost/api/livekit/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/webhook+json",
        ...(authorization ? { authorization } : {}),
      },
      body: payload,
    }),
  );
}

test("evento assinado com o banco fora do ar: registra no log e pede reenvio (503)", async () => {
  const logs: unknown[] = [];
  vi.spyOn(logger, "info").mockImplementation((entry: unknown) => {
    logs.push(entry);
  });

  vi.spyOn(logger, "error").mockImplementation(() => {});
  const response = await post(body, await signature(body));
  assert.equal(response.status, 503);
  assert.equal(logs.length, 1);
  const line = z.record(z.string(), z.unknown()).parse(logs[0]);
  assert.equal(line.event, "participant_joined");
  assert.equal(line.room, "sala-teste");
  assert.deepEqual(line.participant, { identity: "ana-1234", name: "Ana" });
});

test("recusa sem assinatura", async () => {
  assert.equal((await post(body)).status, 401);
});

test("recusa assinatura com outro segredo", async () => {
  const forged = await signature(body, "outro-segredo-0123456789abcdef0123456789");
  assert.equal((await post(body, forged)).status, 401);
});

test("recusa corpo alterado depois de assinado", async () => {
  const signed = await signature(body);
  const tampered = body.replace("Ana", "Eva");
  assert.equal((await post(tampered, signed)).status, 401);
});

test("recusa corpo grande demais sem ler a assinatura", async () => {
  const huge = JSON.stringify({ event: "room_started", padding: "x".repeat(70 * 1024) });
  assert.equal((await post(huge, await signature(huge))).status, 413);
});

test("limite do webhook conta bytes UTF-8, mesmo sem Content-Length", async () => {
  const huge = JSON.stringify({ event: "room_started", padding: "é".repeat(33 * 1024) });
  assert.ok(huge.length < 64 * 1024);
  assert.equal((await post(huge, await signature(huge))).status, 413);
});
