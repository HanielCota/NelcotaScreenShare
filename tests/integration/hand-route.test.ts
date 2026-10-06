import { createServer } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import * as schema from "@/server/db/schema";
import { verifiedParticipant } from "./support/accounts";

/** POST /api/sala/mao: o servidor grava o atributo no LiveKit (falso) com a identidade da conta. */
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
if (!address || typeof address === "string") throw new Error("sem porta");

Object.assign(process.env, {
  NEXT_PUBLIC_LIVEKIT_URL: `ws://127.0.0.1:${address.port}`,
  AUTH_SECRET: "segredo-participantes-de-teste-0123456789abcdef",
});

const { POST } = await import("@/app/api/sala/mao/route");
const { NextRequest } = await import("next/server");
const { getUserAuth } = await import("@/server/auth/user");

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
  return POST(
    new NextRequest("http://localhost:3000/api/sala/mao", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

describe("levantar a mão", () => {
  it("grava o atributo com a identidade da conta", async () => {
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

  it("recusa sem conta, de outra origem e com pedido inválido", async () => {
    expect((await post({ room: "sala-teste", raised: true })).status).toBe(401);
    const bia = await verifiedParticipant(db, handler);
    const cookie = bia.jar.header();
    expect(
      (await post({ room: "sala-teste", raised: true }, cookie, "https://x.exemplo")).status,
    ).toBe(403);
    expect((await post({ room: "../x", raised: true }, cookie)).status).toBe(400);
    expect((await post({ room: "sala-teste", raised: "sim" }, cookie)).status).toBe(400);
  });

  it("quem não está na sala recebe 409", async () => {
    const caio = await verifiedParticipant(db, handler);
    expect((await post({ room: "sala-vazia", raised: true }, caio.jar.header())).status).toBe(409);
  });
});
