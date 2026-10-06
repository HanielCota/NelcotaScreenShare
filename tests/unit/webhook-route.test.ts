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
  NEXT_PUBLIC_LIVEKIT_URL: "ws://127.0.0.1:7880",
});

const { AccessToken } = await import("livekit-server-sdk");
const { NextRequest } = await import("next/server");
const { POST } = await import("../../app/api/livekit/webhook/route");
const { logger } = await import("../../server/logger");

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
    new NextRequest("http://localhost/api/livekit/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/webhook+json",
        ...(authorization ? { authorization } : {}),
      },
      body: payload,
    }),
  );
}

await test("aceita evento assinado e registra a entrada", async () => {
  const logs: unknown[] = [];
  vi.spyOn(logger, "info").mockImplementation((entry: unknown) => {
    logs.push(entry);
  });

  const response = await post(body, await signature(body));
  assert.equal(response.status, 204);
  assert.equal(logs.length, 1);
  const line = z.record(z.string(), z.unknown()).parse(logs[0]);
  assert.equal(line.event, "participant_joined");
  assert.equal(line.room, "sala-teste");
  assert.deepEqual(line.participant, { identity: "ana-1234", name: "Ana" });
});

await test("recusa sem assinatura", async () => {
  assert.equal((await post(body)).status, 401);
});

await test("recusa assinatura com outro segredo", async () => {
  const forged = await signature(body, "outro-segredo-0123456789abcdef0123456789");
  assert.equal((await post(body, forged)).status, 401);
});

await test("recusa corpo alterado depois de assinado", async () => {
  const signed = await signature(body);
  const tampered = body.replace("Ana", "Eva");
  assert.equal((await post(tampered, signed)).status, 401);
});
