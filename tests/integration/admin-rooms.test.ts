import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, test, vi } from "vitest";
import * as schema from "@/server/db/schema";

/** Tela de salas: excluir/restaurar, nota interna e convites. */
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
const actions = await import("@/features/admin/rooms/actions");
const { hashInviteToken } = await import("@/server/rooms/invites");
const { searchPanelAction } = await import("@/features/admin/search/actions");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

type Session = Awaited<ReturnType<typeof adminSession>>;
let admin: Session;
let viewer: Session;
beforeAll(async () => {
  admin = await adminSession(db, "admin");
  viewer = await adminSession(db, "viewer");
});

let counter = 0;
async function room(status: "active" | "finished" = "finished") {
  counter += 1;
  const [row] = await db
    .insert(schema.rooms)
    .values({
      code: `sala-adm-${counter}-${Date.now().toString(36)}`,
      status,
      finishedAt: status === "finished" ? new Date() : null,
      startedAt: new Date(Date.now() - 60_000),
    })
    .returning();
  assert.ok(row);
  return row;
}

describe("excluir e restaurar", () => {
  test("sala ao vivo não pode ser excluída", async () => {
    const live = await room("active");
    requestHeaders.current = admin.headers;
    const result = await actions.deleteRoomsAction({ selection: { tipo: "ids", ids: [live.id] } });
    assert.equal(
      result.serverError,
      `A sala ${live.code} está ao vivo. Encerre a sala antes de excluir.`,
    );
  });

  test("exclui, desfaz e audita", async () => {
    const done = await room();
    requestHeaders.current = admin.headers;
    const removed = await actions.deleteRoomsAction({ selection: { tipo: "ids", ids: [done.id] } });
    assert.deepEqual(removed.data, { ids: [done.id] });
    const restored = await actions.restoreRoomsAction({ ids: [done.id] });
    assert.deepEqual(restored.data, { count: 1 });
    const audits = await db
      .select({ action: schema.auditLogs.action })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.resourceId, done.id));
    assert.deepEqual(audits.map((row) => row.action).toSorted(), ["room.delete", "room.restore"]);
  });

  test("restaurar não cria duas salas vivas com o mesmo código", async () => {
    const old = await room();
    requestHeaders.current = admin.headers;
    await actions.deleteRoomsAction({ selection: { tipo: "ids", ids: [old.id] } });
    // O código voltou a ser usado por uma sala nova.
    await db.insert(schema.rooms).values({ code: old.code });
    const result = await actions.restoreRoomsAction({ ids: [old.id] });
    assert.equal(
      result.serverError,
      "Nada para restaurar (o código pode já estar em uso por outra sala).",
    );
  });

  test("leitor não exclui", async () => {
    const done = await room();
    requestHeaders.current = viewer.headers;
    const result = await actions.deleteRoomsAction({ selection: { tipo: "ids", ids: [done.id] } });
    assert.equal(result.serverError, "Você não tem permissão para fazer isso.");
  });
});

describe("nota interna", () => {
  test("salva com diff na auditoria; sem mudança é recusado", async () => {
    const target = await room();
    requestHeaders.current = admin.headers;
    const saved = await actions.updateRoomNoteAction({ id: target.id, note: "  Treinamento  " });
    assert.deepEqual(saved.data, { saved: true });
    const [audit] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.action, "room.update"), eq(schema.auditLogs.resourceId, target.id)),
      );
    assert.deepEqual(audit?.changes, { note: { antes: null, depois: "Treinamento" } });
    const same = await actions.updateRoomNoteAction({ id: target.id, note: "Treinamento" });
    assert.equal(same.serverError, "A nota não mudou.");
  });
});

describe("convites", () => {
  test("cria (link com token, só o hash no banco) e revoga", async () => {
    const target = await room();
    requestHeaders.current = admin.headers;
    const created = await actions.createInviteAction({
      roomId: target.id,
      label: "Turma A",
      maxUses: 5,
      validityHours: 24,
    });
    const link = created.data?.link ?? "";
    const token = new URL(link).searchParams.get("convite") ?? "";
    assert.match(link, new RegExp(`/sala/${target.code}\\?convite=`));
    assert.equal(token.length, 43);
    const [invite] = await db
      .select()
      .from(schema.roomInvites)
      .where(eq(schema.roomInvites.roomId, target.id));
    assert.deepEqual(invite?.tokenHash, hashInviteToken(token));
    assert.equal(invite?.maxUses, 5);
    assert.ok(invite?.expiresAt && invite.expiresAt.getTime() > Date.now() + 23 * 3_600_000);

    const revoked = await actions.revokeInviteAction({ id: invite?.id ?? "" });
    assert.deepEqual(revoked.data, { revoked: true });
    const again = await actions.revokeInviteAction({ id: invite?.id ?? "" });
    assert.equal(again.serverError, "Esse convite já foi revogado.");
  });

  test("validade fora das opções é recusada; leitor não cria", async () => {
    const target = await room();
    requestHeaders.current = admin.headers;
    const odd = await actions.createInviteAction({
      roomId: target.id,
      label: "",
      maxUses: null,
      validityHours: 5,
    });
    assert.ok(odd.validationErrors);
    requestHeaders.current = viewer.headers;
    const denied = await actions.createInviteAction({
      roomId: target.id,
      label: "",
      maxUses: null,
      validityHours: null,
    });
    assert.equal(denied.serverError, "Você não tem permissão para fazer isso.");
  });
});

describe("busca do command palette", () => {
  test("acha sala por parte do código e pessoa sem acento; ignora excluídas", async () => {
    const target = await room();
    const gone = await room();
    await db
      .update(schema.rooms)
      .set({ deletedAt: new Date() })
      .where(eq(schema.rooms.id, gone.id));
    const tag = `Busca${Date.now()}`;
    const [person] = await db
      .insert(schema.users)
      .values({ name: `Joana Côrtes ${tag}`, email: `joana-${tag}@exemplo.com` })
      .returning({ id: schema.users.id });
    requestHeaders.current = viewer.headers;
    const byCode = await searchPanelAction({ q: target.code.slice(-8) });
    assert.deepEqual(
      byCode.data?.rooms.map((row) => row.id),
      [target.id],
    );
    const deleted = await searchPanelAction({ q: gone.code });
    assert.deepEqual(deleted.data?.rooms, []);
    const byName = await searchPanelAction({ q: `cortes ${tag}` });
    assert.deepEqual(
      byName.data?.people.map((row) => row.id),
      [person?.id],
    );
    const short = await searchPanelAction({ q: "a" });
    assert.ok(short.validationErrors, "menos de 2 letras não busca");
  });
});
