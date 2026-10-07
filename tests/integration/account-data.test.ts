import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, test, vi } from "vitest";
import { z } from "zod";
import * as schema from "@/server/db/schema";
import { verifiedParticipant } from "./support/accounts";

/**
 * Direitos do titular (LGPD): "baixar meus dados" inclui o histórico de salas
 * e a exclusão da conta tira o nome das participações.
 */
const requestHeaders = { current: new Headers() };
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

const { GET } = await import("@/app/api/conta/dados/route");
const { deleteMyAccount } = await import("@/features/account/actions");
const { getUserAuth } = await import("@/features/auth/server/participant-auth");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());
const handler = (request: Request) => getUserAuth().handler(request);

async function withHistory(userId: string) {
  const code = `sala-lgpd-${Date.now().toString(36)}`;
  const [room] = await db.insert(schema.rooms).values({ code }).returning();
  assert.ok(room);
  const [participation] = await db
    .insert(schema.roomParticipations)
    .values({
      roomId: room.id,
      userId,
      livekitIdentity: userId,
      livekitSid: `PA_${crypto.randomUUID()}`,
      displayName: "Nome Na Sala",
      ip: "203.0.113.20",
      joinedAt: new Date(Date.now() - 60_000),
      leftAt: new Date(),
    })
    .returning();
  assert.ok(participation);
  await db.insert(schema.shareSessions).values({
    roomId: room.id,
    participationId: participation.id,
    trackSid: `TR_${crypto.randomUUID()}`,
    startedAt: new Date(Date.now() - 30_000),
    endedAt: new Date(),
  });
  await db.insert(schema.tokenRequests).values({
    roomCode: code,
    roomId: room.id,
    userId,
    result: "granted",
    ip: "203.0.113.20",
  });
  return { code, participationId: participation.id };
}

const exportSchema = z.object({
  conta: z.object({ id: z.string() }),
  participacoes_em_salas: z.array(
    z.object({
      sala: z.string(),
      nomeNaSala: z.string().nullable(),
      ip: z.string().nullable(),
      compartilhamentos: z.number(),
    }),
  ),
  pedidos_de_entrada: z.array(z.object({ sala: z.string(), resultado: z.string() })),
});

describe("dados do titular", () => {
  test("a exportação traz salas, compartilhamentos e pedidos de entrada", async () => {
    const lia = await verifiedParticipant(db, handler);
    const { code } = await withHistory(lia.id);
    const response = await GET(
      new Request("http://localhost:3000/api/conta/dados", {
        headers: { cookie: lia.jar.header() },
      }),
    );
    assert.equal(response.status, 200);
    const data = exportSchema.parse(await response.json());
    assert.equal(data.conta.id, lia.id);
    assert.deepEqual(data.participacoes_em_salas, [
      {
        ...data.participacoes_em_salas[0],
        sala: code,
        nomeNaSala: "Nome Na Sala",
        ip: "203.0.113.20",
        compartilhamentos: 1,
      },
    ]);
    assert.deepEqual(
      data.pedidos_de_entrada.map((row) => [row.sala, row.resultado]),
      [[code, "granted"]],
    );
  });

  test("excluir a conta apaga o nome das participações e mantém o registro de acesso", async () => {
    const leo = await verifiedParticipant(db, handler);
    const { participationId } = await withHistory(leo.id);
    requestHeaders.current = new Headers({
      cookie: leo.jar.header(),
      "x-client-ip": "192.0.2.77",
    });
    const result = await deleteMyAccount({ password: leo.password });
    assert.equal(result.serverError, undefined, JSON.stringify(result));
    const [row] = await db
      .select()
      .from(schema.roomParticipations)
      .where(eq(schema.roomParticipations.id, participationId));
    assert.equal(row?.displayName, null);
    assert.equal(row?.ip, "203.0.113.20");
    assert.equal(row?.userId, leo.id);
  });

  test("senha errada ao excluir tem limite de tentativas por conta", async () => {
    const ana = await verifiedParticipant(db, handler);
    requestHeaders.current = new Headers({ cookie: ana.jar.header() });
    for (let attempt = 0; attempt < 5; attempt++) {
      const wrong = await deleteMyAccount({ password: "senha-errada-123" });
      assert.equal(wrong.serverError, "Senha incorreta.");
    }
    const blocked = await deleteMyAccount({ password: ana.password });
    assert.match(String(blocked.serverError), /Muitas tentativas/);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, ana.id));
    assert.equal(user?.deletedAt, null, "a conta continua ativa");
  });
});
