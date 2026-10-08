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
const { receiveLivekitWebhook } = await import("../../features/room/server/webhook/route.server");
const { logger } = await import("../../server/logger.server");

const body = JSON.stringify({
  event: "participant_joined",
  room: { name: "sala-teste" },
  participant: { identity: "ana-1234", name: "Ana" },
  createdAt: "1791300000",
});

/** Header as LiveKit sends it: a JWT carrying the sha256 of the body. */
async function signature(payload: string, secret = SECRET): Promise<string> {
  const token = new AccessToken(KEY, secret);
  token.sha256 = createHash("sha256").update(payload).digest("base64");
  return token.toJwt();
}

function post(payload: string, authorization?: string) {
  return receiveLivekitWebhook(
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

test("signed event with the database down: logs it and asks for a retry (503)", async () => {
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

test("rejects without a signature", async () => {
  assert.equal((await post(body)).status, 401);
});

test("rejects a signature made with another secret", async () => {
  const forged = await signature(body, "outro-segredo-0123456789abcdef0123456789");
  assert.equal((await post(body, forged)).status, 401);
});

test("rejects a body changed after signing", async () => {
  const signed = await signature(body);
  const tampered = body.replace("Ana", "Eva");
  assert.equal((await post(tampered, signed)).status, 401);
});

test("rejects an oversized body without reading the signature", async () => {
  const huge = JSON.stringify({ event: "room_started", padding: "x".repeat(70 * 1024) });
  // No signature: checking it first would answer 401.
  assert.equal((await post(huge)).status, 413);
});

test("webhook limit counts UTF-8 bytes, even without Content-Length", async () => {
  const huge = JSON.stringify({ event: "room_started", padding: "é".repeat(33 * 1024) });
  assert.ok(huge.length < 64 * 1024);
  assert.equal((await post(huge, await signature(huge))).status, 413);
});
