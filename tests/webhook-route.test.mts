import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
// oxlint-disable-next-line import/no-unassigned-import -- Só registra os hooks de resolução de módulos.
import "./support/register.mts";

const KEY = "chave-teste";
const SECRET = "segredo-de-teste-0123456789abcdef0123456789";

Object.assign(process.env, {
  LIVEKIT_API_KEY: KEY,
  LIVEKIT_API_SECRET: SECRET,
  NEXT_PUBLIC_LIVEKIT_URL: "ws://127.0.0.1:7880",
});

const { AccessToken } = await import("livekit-server-sdk");
const { NextRequest } = await import("next/server");
const { POST } = await import("../app/api/livekit/webhook/route");

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

test("aceita evento assinado e registra a entrada", async (t) => {
  const logs: string[] = [];
  t.mock.method(console, "info", (line: string) => logs.push(line));

  const response = await post(body, await signature(body));
  assert.equal(response.status, 204);
  assert.equal(logs.length, 1);
  const line = JSON.parse(logs[0]!) as Record<string, unknown>;
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
