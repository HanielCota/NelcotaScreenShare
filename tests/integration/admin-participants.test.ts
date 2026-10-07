import assert from "node:assert/strict";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, test, vi } from "vitest";
import * as schema from "@/server/db/schema";
import { verifiedParticipant } from "./support/accounts";

/**
 * Tela de participantes: ações em massa (por IDs e pelo filtro), desfazer,
 * anonimização e as consultas da lista, com auditoria de cada item.
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

process.env.ADMIN_AUTH_SECRET = "segredo-admin-de-teste-0123456789abcdef0123456789";
const { adminSession } = await import("./support/admin-session");
const actions = await import("@/features/usuarios/actions");
const { listParticipants } = await import("@/features/usuarios/queries");
const { loadParticipantParams } = await import("@/features/usuarios/search-params");
const { getUserAuth } = await import("@/server/auth/user");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());
const handler = (request: Request) => getUserAuth().handler(request);

type Session = Awaited<ReturnType<typeof adminSession>>;
let owner: Session;
let admin: Session;
let viewer: Session;
beforeAll(async () => {
  owner = await adminSession(db, "owner");
  admin = await adminSession(db, "admin");
  viewer = await adminSession(db, "viewer");
});

/** Participantes "soltos" (sem sessão) com um marcador no nome, para filtrar. */
async function people(tag: string, count: number) {
  const rows = await db
    .insert(schema.users)
    .values(
      Array.from({ length: count }, (_, i) => ({
        name: `${tag} ${i}`,
        email: `${tag.toLowerCase()}-${i}-${crypto.randomUUID()}@exemplo.com`,
        emailVerified: true,
      })),
    )
    .returning({ id: schema.users.id });
  return rows.map((row) => row.id);
}

function auditsOf(action: string, ids: string[]) {
  return db
    .select()
    .from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.action, action), inArray(schema.auditLogs.resourceId, ids)));
}

describe("bloquear e desbloquear", () => {
  test("bloqueio exige motivo, derruba as sessões e audita cada conta", async () => {
    const ana = await verifiedParticipant(db, handler);
    requestHeaders.current = admin.headers;
    const noReason = await actions.blockParticipantsAction({
      selection: { tipo: "ids", ids: [ana.id] },
      reason: " ",
    });
    assert.ok(noReason.validationErrors, "sem motivo é recusado");

    const result = await actions.blockParticipantsAction({
      selection: { tipo: "ids", ids: [ana.id] },
      reason: "Spam no chat",
    });
    assert.deepEqual(result.data, { count: 1 });
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, ana.id));
    assert.ok(user?.blockedAt);
    assert.equal(user?.blockReason, "Spam no chat");
    const sessions = await db
      .select()
      .from(schema.userSessions)
      .where(eq(schema.userSessions.userId, ana.id));
    assert.equal(sessions.length, 0);
    const [audit] = await auditsOf("user.block", [ana.id]);
    assert.equal(audit?.actorAdminId, admin.id);
    assert.deepEqual(audit?.metadata, { motivo: "Spam no chat" });

    // Bloquear de novo não muda nada: erro claro, sem auditoria repetida.
    const again = await actions.blockParticipantsAction({
      selection: { tipo: "ids", ids: [ana.id] },
      reason: "De novo",
    });
    assert.equal(again.serverError, "Nenhuma conta para bloquear na seleção.");
    assert.equal((await auditsOf("user.block", [ana.id])).length, 1);
  });

  test("leitor não bloqueia", async () => {
    const [id = ""] = await people("Leitor", 1);
    requestHeaders.current = viewer.headers;
    const result = await actions.blockParticipantsAction({
      selection: { tipo: "ids", ids: [id] },
      reason: "Tentativa",
    });
    assert.equal(result.serverError, "Você não tem permissão para fazer isso.");
  });

  test("todos os resultados do filtro: o servidor reaplica a busca", async () => {
    const tag = `Filtro${Date.now()}`;
    const ids = await people(tag, 3);
    const outsider = await people(`Fora${Date.now()}`, 1);
    requestHeaders.current = admin.headers;
    const blocked = await actions.blockParticipantsAction({
      selection: { tipo: "filtro", busca: `q=${tag}&cursor=ignorado` },
      reason: "Lote de teste",
    });
    assert.deepEqual(blocked.data, { count: 3 });
    assert.equal((await auditsOf("user.block", ids)).length, 3);
    const [other] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, outsider[0] ?? ""));
    assert.equal(other?.blockedAt, null);

    const unblocked = await actions.unblockParticipantsAction({
      selection: { tipo: "filtro", busca: `q=${tag}&status=bloqueado` },
    });
    assert.deepEqual(unblocked.data, { count: 3 });
  });

  test("filtro com mais de 10.000 resultados é recusado", async () => {
    const tag = `Muitos${Date.now()}`;
    await pool.query(
      `insert into users (name, email, email_verified)
       select $1 || ' ' || g, $1 || g || '@exemplo.com', true from generate_series(1, 10001) g`,
      [tag],
    );
    requestHeaders.current = admin.headers;
    const result = await actions.blockParticipantsAction({
      selection: { tipo: "filtro", busca: `q=${tag}` },
      reason: "Grande demais",
    });
    assert.equal(result.serverError, "Mais de 10.000 resultados. Refine o filtro e tente de novo.");
    const { rows } = await pool.query<{ n: number }>(
      "select count(*)::int as n from users where name like $1 and blocked_at is not null",
      [`${tag}%`],
    );
    assert.equal(rows[0]?.n, 0);
  });
});

describe("excluir e desfazer", () => {
  test("exclusão some da lista, derruba sessões e o desfazer restaura", async () => {
    const bia = await verifiedParticipant(db, handler);
    requestHeaders.current = admin.headers;
    const removed = await actions.deleteParticipantsAction({
      selection: { tipo: "ids", ids: [bia.id] },
    });
    assert.deepEqual(removed.data, { ids: [bia.id] });
    const list = await listParticipants(
      db,
      loadParticipantParams(new URLSearchParams(`q=${encodeURIComponent(bia.email)}`)),
      50,
    );
    assert.equal(list.items.length, 0, "excluído não aparece sem o filtro de status");
    const deleted = await listParticipants(
      db,
      loadParticipantParams(
        new URLSearchParams(`q=${encodeURIComponent(bia.email)}&status=excluido`),
      ),
      50,
    );
    assert.equal(deleted.items[0]?.status, "excluido");

    const restored = await actions.restoreParticipantsAction({ ids: [bia.id] });
    assert.deepEqual(restored.data, { count: 1 });
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, bia.id));
    assert.equal(user?.deletedAt, null);
    assert.equal((await auditsOf("user.delete", [bia.id])).length, 1);
    assert.equal((await auditsOf("user.restore", [bia.id])).length, 1);
  });
});

describe("anonimizar (LGPD)", () => {
  test("só o owner, com a palavra de confirmação; tira o nome do histórico", async () => {
    const caio = await verifiedParticipant(db, handler, { name: "Caio Real" });
    const [room] = await db
      .insert(schema.rooms)
      .values({ code: `sala-anon-${Date.now().toString(36)}` })
      .returning();
    await db.insert(schema.roomParticipations).values({
      roomId: room?.id ?? "",
      userId: caio.id,
      livekitIdentity: caio.id,
      livekitSid: `PA_${crypto.randomUUID()}`,
      displayName: "Caio Real",
      joinedAt: new Date(),
    });

    requestHeaders.current = admin.headers;
    const denied = await actions.anonymizeParticipantAction({
      id: caio.id,
      confirmation: "ANONIMIZAR",
    });
    assert.equal(denied.serverError, "Você não tem permissão para fazer isso.");

    requestHeaders.current = owner.headers;
    const wrongWord = await actions.anonymizeParticipantAction({
      id: caio.id,
      // @ts-expect-error: a palavra errada é justamente o que se testa
      confirmation: "anonimizar",
    });
    assert.ok(wrongWord.validationErrors);

    const done = await actions.anonymizeParticipantAction({
      id: caio.id,
      confirmation: "ANONIMIZAR",
    });
    assert.deepEqual(done.data, { anonymized: true });
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, caio.id));
    assert.equal(user?.name, "Pessoa removida");
    assert.ok(user?.email.endsWith("@invalid.nelcota"));
    assert.ok(user?.anonymizedAt && user.deletedAt);
    const [participation] = await db
      .select()
      .from(schema.roomParticipations)
      .where(eq(schema.roomParticipations.userId, caio.id));
    assert.equal(participation?.displayName, null);
    // Anonimizada não volta pelo "restaurar".
    const restore = await actions.restoreParticipantsAction({ ids: [caio.id] });
    assert.equal(restore.serverError, "Nada para restaurar.");
  });

  test("sessão antiga do owner precisa entrar de novo", async () => {
    const [id = ""] = await people("Antiga", 1);
    const stale = await adminSession(db, "owner");
    await db
      .update(schema.adminSessions)
      .set({ createdAt: sql`now() - interval '1 hour'` })
      .where(eq(schema.adminSessions.userId, stale.id));
    requestHeaders.current = stale.headers;
    const result = await actions.anonymizeParticipantAction({ id, confirmation: "ANONIMIZAR" });
    assert.equal(result.serverError, "Por segurança, entre de novo para fazer isso.");
  });
});

describe("lista", () => {
  test("busca sem acento e ordenação por participações", async () => {
    const tag = `Busca${Date.now()}`;
    const [joao = "", maria = ""] = (
      await db
        .insert(schema.users)
        .values([
          { name: `João ${tag}`, email: `joao-${tag}@exemplo.com`, participationsCount: 2 },
          { name: `Maria ${tag}`, email: `maria-${tag}@exemplo.com`, participationsCount: 9 },
        ])
        .returning({ id: schema.users.id })
    ).map((row) => row.id);
    const found = await listParticipants(
      db,
      loadParticipantParams(new URLSearchParams(`q=joao ${tag}`)),
      50,
    );
    assert.deepEqual(
      found.items.map((row) => row.id),
      [joao],
    );
    const sorted = await listParticipants(
      db,
      loadParticipantParams(new URLSearchParams(`q=${tag}&por=participacoes`)),
      50,
    );
    assert.deepEqual(
      sorted.items.map((row) => row.id),
      [maria, joao],
    );
  });

  test("o contador de participações acompanha as entradas", async () => {
    const [id = ""] = await people("Contador", 1);
    const [room] = await db
      .insert(schema.rooms)
      .values({ code: `sala-cont-${Date.now().toString(36)}` })
      .returning();
    await db.insert(schema.roomParticipations).values(
      [1, 2].map((n) => ({
        roomId: room?.id ?? "",
        userId: id,
        livekitIdentity: id,
        livekitSid: `PA_${crypto.randomUUID()}`,
        joinedAt: new Date(Date.now() + n),
      })),
    );
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    assert.equal(user?.participationsCount, 2);
  });
});
