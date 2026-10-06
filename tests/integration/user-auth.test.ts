import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, test, vi } from "vitest";
import { createUserAuthForTests, USER_AUTH_BASE_PATH } from "@/server/auth/user";
import * as schema from "@/server/db/schema";
import { logger } from "@/server/logger";
import { verifiedParticipant } from "./support/accounts";
import { CookieJar, makeCaller } from "./support/http-auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

const auth = createUserAuthForTests(db, "segredo-participantes-de-teste-0123456789abcdef");
const handler = (request: Request) => auth.handler(request);
let nextIp = 1;
function newCaller() {
  return makeCaller(handler, USER_AUTH_BASE_PATH, `198.18.0.${nextIp++}`);
}
const PASSWORD = "senha-do-participante-1";

/** Sem SMTP, o e-mail vai para o log: pega o link do último e-mail para `to`. */
function captureMail() {
  const mails: { to: string; body: string }[] = [];
  vi.spyOn(logger, "warn").mockImplementation(((entry: unknown) => {
    const mail = entry as { mail?: { to: string }; body?: string };
    if (mail.mail && mail.body) mails.push({ to: mail.mail.to, body: mail.body });
  }) as typeof logger.warn);
  return {
    linkFor(to: string): string | undefined {
      const mail = mails.findLast((item) => item.to === to);
      return mail?.body.match(/https?:\/\/\S+/)?.[0];
    },
    count: (to: string) => mails.filter((item) => item.to === to).length,
  };
}

describe("cadastro", () => {
  test("e-mail novo e e-mail já cadastrado têm a mesma resposta", async () => {
    const call = newCaller();
    const mail = captureMail();
    const body = { name: "Lia", email: "lia@exemplo.com", password: PASSWORD };
    const first = await call("/sign-up/email", { body });
    const again = await call("/sign-up/email", { body: { ...body, name: "Outra Pessoa" } });
    assert.equal(first.status, 200);
    assert.equal(again.status, first.status);
    assert.deepEqual(
      Object.keys(again.body as object).toSorted(),
      Object.keys(first.body as object).toSorted(),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    // O dono do e-mail recebe a confirmação e depois o aviso da tentativa.
    assert.equal(mail.count("lia@exemplo.com"), 2);
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "lia@exemplo.com"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "Lia");
  });

  test("sem confirmar o e-mail não entra; o link confirma e já entra", async () => {
    const call = newCaller();
    const mail = captureMail();
    await call("/sign-up/email", {
      body: { name: "Mel", email: "mel@exemplo.com", password: PASSWORD, callbackURL: "/" },
    });
    const blocked = await call("/sign-in/email", {
      body: { email: "mel@exemplo.com", password: PASSWORD },
    });
    assert.equal(blocked.status, 403);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const link = mail.linkFor("mel@exemplo.com");
    assert.ok(link, "link de confirmação no e-mail");
    const url = new URL(link);
    const jar = new CookieJar();
    const verify = await auth.handler(
      new Request(`http://localhost:3000${url.pathname}${url.search}`),
    );
    jar.store(verify);
    assert.ok([200, 302].includes(verify.status));
    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "mel@exemplo.com"));
    assert.equal(row?.emailVerified, true);
    const session = await call("/get-session", { method: "GET", jar });
    assert.ok(
      session.body && typeof session.body === "object" && "user" in session.body,
      "entrou após confirmar",
    );
  });

  test("senha curta é recusada", async () => {
    const res = await newCaller()("/sign-up/email", {
      body: { name: "Nina", email: "nina@exemplo.com", password: "curta" },
    });
    assert.notEqual(res.status, 200);
  });
});

describe("login", () => {
  test("conta bloqueada pelo painel não abre sessão", async () => {
    const ana = await verifiedParticipant(db, handler);
    await db.update(schema.users).set({ blockedAt: new Date() }).where(eq(schema.users.id, ana.id));
    const res = await newCaller()("/sign-in/email", {
      body: { email: ana.email, password: ana.password },
    });
    assert.notEqual(res.status, 200);
  });

  test("bloqueio por tentativas vale para participantes, separado do admin", async () => {
    const bia = await verifiedParticipant(db, handler);
    for (let i = 0; i < 5; i++) {
      const res = await makeCaller(
        handler,
        USER_AUTH_BASE_PATH,
        `198.19.0.${i + 1}`,
      )("/sign-in/email", {
        body: { email: bia.email, password: `errada-${i}-xxxxxx` },
      });
      assert.equal(res.status, 401);
    }
    const locked = await makeCaller(
      handler,
      USER_AUTH_BASE_PATH,
      "198.19.0.99",
    )("/sign-in/email", {
      body: { email: bia.email, password: bia.password },
    });
    assert.equal(locked.status, 429);
    const [failure] = await db.select().from(schema.loginFailures).limit(1);
    assert.equal(failure?.scope, "user");
  });

  test("cookie da conta não serve no painel admin", async () => {
    const caio = await verifiedParticipant(db, handler);
    assert.ok(caio.jar.has("nelcota."));
    assert.equal(caio.jar.has("nelcota-admin"), false);
  });
});
