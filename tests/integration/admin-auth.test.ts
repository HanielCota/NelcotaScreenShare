import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, like } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, describe, test } from "vitest";
import {
  ADMIN_AUTH_BASE_PATH,
  createAdminAuthForTests,
} from "@/features/auth/server/admin-auth.server";
import { forbiddenCrossSite, isCrossSiteMutation } from "@/server/origin-guard.server";
import {
  acceptAdminInvitation,
  createAdminInvitation,
} from "@/features/auth/server/admin-invitations.server";
import * as schema from "@/server/db/schema";
import { CookieJar, makeCaller } from "./support/http-auth";
import { totpFromUri } from "./support/totp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
afterAll(() => pool.end());

const SECRET = "segredo-admin-de-teste-0123456789abcdef0123456789";
const auth = createAdminAuthForTests(db, SECRET);
// Like the app's route handler: origin check before Better Auth.
const handler = (request: Request) =>
  isCrossSiteMutation(request) ? Promise.resolve(forbiddenCrossSite()) : auth.handler(request);

// Each test uses its own IP: the rate limit (5 sign-ins/min per IP) is real.
let nextIp = 1;
function newCaller() {
  return makeCaller(handler, ADMIN_AUTH_BASE_PATH, `203.0.113.${nextIp++}`);
}
const PASSWORD = "senha-forte-do-admin-123";

async function inviteAndAccept(email: string, role: "owner" | "admin" | "viewer" = "admin") {
  const { token } = await createAdminInvitation(db, { email, role, invitedBy: null });
  const result = await acceptAdminInvitation(db, auth, {
    token,
    name: "Admin Teste",
    password: PASSWORD,
  });
  assert.equal(result.ok, true);
  return { token };
}

function errorMessage(body: unknown): string {
  return typeof body === "object" && body && "message" in body ? String(body.message) : "";
}

describe("invitation", () => {
  test("creates the account with a verified e-mail and the link does not work twice", async () => {
    const { token } = await inviteAndAccept("convite@exemplo.com", "viewer");
    const [user] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, "convite@exemplo.com"));
    assert.equal(user?.emailVerified, true);
    assert.equal(user?.role, "viewer");

    const again = await acceptAdminInvitation(db, auth, { token, name: "X", password: PASSWORD });
    assert.deepEqual(again, { ok: false, reason: "invalid" });
  });

  test("an expired invitation and a short password are rejected", async () => {
    const { token, invitation } = await createAdminInvitation(db, {
      email: "expirado@exemplo.com",
      role: "admin",
      invitedBy: null,
    });
    // Ages the invitation in the database (the Node and Postgres clocks may differ).
    await pool.query(
      "update admin_invitations set created_at = now() - interval '3 days', expires_at = now() - interval '1 day' where id = $1",
      [invitation.id],
    );
    assert.deepEqual(
      await acceptAdminInvitation(db, auth, { token, name: "X", password: PASSWORD }),
      { ok: false, reason: "invalid" },
    );

    const fresh = await createAdminInvitation(db, {
      email: "curta@exemplo.com",
      role: "admin",
      invitedBy: null,
    });
    assert.deepEqual(
      await acceptAdminInvitation(db, auth, { token: fresh.token, name: "X", password: "curta" }),
      { ok: false, reason: "weak_password" },
    );
  });

  test("a new invitation for the same e-mail revokes the previous one", async () => {
    const first = await createAdminInvitation(db, {
      email: "duplo@exemplo.com",
      role: "admin",
      invitedBy: null,
    });
    await createAdminInvitation(db, { email: "duplo@exemplo.com", role: "admin", invitedBy: null });
    assert.deepEqual(
      await acceptAdminInvitation(db, auth, { token: first.token, name: "X", password: PASSWORD }),
      { ok: false, reason: "invalid" },
    );
  });
});

function crossSiteAttempt(headers: Record<string, string>) {
  return handler(
    new Request(`http://localhost:3000${ADMIN_AUTH_BASE_PATH}/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ email: "login@exemplo.com", password: PASSWORD }),
    }),
  );
}

describe("sign-in", () => {
  test("correct credentials create a session with the admin's own cookie", async () => {
    const call = newCaller();
    await inviteAndAccept("login@exemplo.com");
    const jar = new CookieJar();
    const res = await call("/sign-in/email", {
      body: { email: "login@exemplo.com", password: PASSWORD },
      jar,
    });
    assert.equal(res.status, 200);
    assert.ok(jar.has("nelcota-admin"), "cookie with the nelcota-admin prefix");

    const session = await call("/get-session", { method: "GET", jar });
    assert.equal(session.status, 200);
    assert.ok(session.body && typeof session.body === "object" && "user" in session.body);
  });

  test("an unknown e-mail and a wrong password give the same response", async () => {
    const call = newCaller();
    await inviteAndAccept("igual@exemplo.com");
    const wrong = await call("/sign-in/email", {
      body: { email: "igual@exemplo.com", password: "errada-errada-1" },
    });
    const missing = await call("/sign-in/email", {
      body: { email: "naoexiste@exemplo.com", password: "errada-errada-1" },
    });
    assert.equal(wrong.status, 401);
    assert.equal(missing.status, 401);
    assert.equal(errorMessage(wrong.body), errorMessage(missing.body));
  });

  test("public sign-up is disabled", async () => {
    const call = newCaller();
    const res = await call("/sign-up/email", {
      body: { email: "intruso@exemplo.com", password: PASSWORD, name: "Intruso" },
    });
    assert.notEqual(res.status, 200);
    const rows = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, "intruso@exemplo.com"));
    assert.equal(rows.length, 0);
  });

  test("5 wrong passwords lock the account, even with the right password afterwards", async () => {
    await inviteAndAccept("bloqueio@exemplo.com");
    // A different IP on each attempt: the lock is per account, not the per-IP rate limit.
    for (let i = 0; i < 5; i++) {
      const res = await makeCaller(
        handler,
        ADMIN_AUTH_BASE_PATH,
        `198.51.100.${i + 1}`,
      )("/sign-in/email", {
        body: { email: "bloqueio@exemplo.com", password: `errada-${i}-xxxxxx` },
      });
      assert.equal(res.status, 401);
    }
    const locked = await makeCaller(
      handler,
      ADMIN_AUTH_BASE_PATH,
      "198.51.100.99",
    )("/sign-in/email", { body: { email: "bloqueio@exemplo.com", password: PASSWORD } });
    assert.equal(locked.status, 429);
    assert.match(errorMessage(locked.body), /Muitas tentativas/);
  });

  test("a request from another origin is rejected (CSRF)", async () => {
    assert.equal((await crossSiteAttempt({ origin: "https://malicioso.exemplo" })).status, 403);
    assert.equal((await crossSiteAttempt({ "sec-fetch-site": "cross-site" })).status, 403);
  });
});

describe("2FA TOTP", () => {
  test("enable, sign in with a code and with a single-use backup code", async () => {
    const call = newCaller();
    await inviteAndAccept("2fa@exemplo.com");
    const jar = new CookieJar();
    await call("/sign-in/email", { body: { email: "2fa@exemplo.com", password: PASSWORD }, jar });

    const enabled = await call("/two-factor/enable", { body: { password: PASSWORD }, jar });
    assert.equal(enabled.status, 200);
    const { totpURI, backupCodes } = enabled.body as { totpURI: string; backupCodes: string[] };
    assert.equal(backupCodes.length, 10);
    const verified = await call("/two-factor/verify-totp", {
      body: { code: totpFromUri(totpURI) },
      jar,
    });
    assert.equal(verified.status, 200);

    // New sign-in: the right password is not enough, it asks for the second factor.
    const second = new CookieJar();
    const signIn = await call("/sign-in/email", {
      body: { email: "2fa@exemplo.com", password: PASSWORD },
      jar: second,
    });
    assert.equal((signIn.body as { twoFactorRedirect?: boolean }).twoFactorRedirect, true);
    const noSession = await call("/get-session", { method: "GET", jar: second });
    assert.equal(noSession.body, null);

    const wrongCode = await call("/two-factor/verify-totp", {
      body: { code: "000000" },
      jar: second,
    });
    assert.equal(wrongCode.status, 401);
    const ok = await call("/two-factor/verify-totp", {
      body: { code: totpFromUri(totpURI) },
      jar: second,
    });
    assert.equal(ok.status, 200);
    const session = await call("/get-session", { method: "GET", jar: second });
    assert.ok(session.body && typeof session.body === "object" && "user" in session.body);

    // A backup code works only once.
    const code = backupCodes[0] ?? "";
    for (const expected of [200, 401]) {
      const third = new CookieJar();
      await call("/sign-in/email", {
        body: { email: "2fa@exemplo.com", password: PASSWORD },
        jar: third,
      });
      const res = await call("/two-factor/verify-backup-code", { body: { code }, jar: third });
      assert.equal(res.status, expected);
    }
  });
});

describe("password reset", () => {
  test("single-use token that ends all sessions", async () => {
    const call = newCaller();
    await inviteAndAccept("reset@exemplo.com");
    const jar = new CookieJar();
    await call("/sign-in/email", { body: { email: "reset@exemplo.com", password: PASSWORD }, jar });

    const requested = await call("/request-password-reset", {
      body: { email: "reset@exemplo.com", redirectTo: "/admin/redefinir-senha" },
    });
    assert.equal(requested.status, 200);
    const missing = await call("/request-password-reset", {
      body: { email: "ninguem@exemplo.com", redirectTo: "/admin/redefinir-senha" },
    });
    assert.deepEqual(missing.body, requested.body, "same response for an unknown e-mail");

    const [row] = await db
      .select()
      .from(schema.adminVerifications)
      .where(like(schema.adminVerifications.identifier, "reset-password:%"));
    const token = row?.identifier.replace("reset-password:", "") ?? "";
    assert.ok(token);

    const newPassword = "outra-senha-forte-456";
    const reset = await call("/reset-password", { body: { token, newPassword } });
    assert.equal(reset.status, 200);
    const reused = await call("/reset-password", {
      body: { token, newPassword: "mais-uma-senha-789" },
    });
    assert.notEqual(reused.status, 200);

    const oldSession = await call("/get-session", { method: "GET", jar });
    assert.equal(oldSession.body, null, "old session ended");
    const relogin = await call("/sign-in/email", {
      body: { email: "reset@exemplo.com", password: newPassword },
    });
    assert.equal(relogin.status, 200);
  });
});

async function auditFor(action: string) {
  return db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, action));
}

describe("auditing of sign-in events", () => {
  test("a successful sign-in records the author; a failed one does not store the e-mail", async () => {
    const call = newCaller();
    await inviteAndAccept("auditoria@exemplo.com");
    const [user] = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, "auditoria@exemplo.com"));
    await call("/sign-in/email", { body: { email: "auditoria@exemplo.com", password: PASSWORD } });
    const signIns = await auditFor("auth.sign_in");
    assert.ok(signIns.some((row) => row.actorAdminId === user?.id && row.resourceId === user?.id));

    await call("/sign-in/email", {
      body: { email: "auditoria@exemplo.com", password: "senha-errada-123" },
    });
    const failures = await auditFor("auth.sign_in_failed");
    assert.ok(failures.length > 0);
    for (const row of failures) {
      assert.equal(row.actorAdminId, null);
      assert.doesNotMatch(JSON.stringify(row), /auditoria@exemplo\.com/);
    }
  });

  test("2FA enabled and password reset are recorded", async () => {
    const call = newCaller();
    await inviteAndAccept("audit2@exemplo.com");
    const jar = new CookieJar();
    await call("/sign-in/email", {
      body: { email: "audit2@exemplo.com", password: PASSWORD },
      jar,
    });
    const enabled = await call("/two-factor/enable", { body: { password: PASSWORD }, jar });
    const { totpURI } = enabled.body as { totpURI: string };
    await call("/two-factor/verify-totp", { body: { code: totpFromUri(totpURI) }, jar });
    assert.ok((await auditFor("auth.two_factor_enabled")).length > 0);

    await call("/request-password-reset", {
      body: { email: "audit2@exemplo.com", redirectTo: "/admin/redefinir-senha" },
    });
    const [row] = await db
      .select()
      .from(schema.adminVerifications)
      .where(like(schema.adminVerifications.identifier, "reset-password:%"));
    const token = row?.identifier.replace("reset-password:", "") ?? "";
    await call("/reset-password", { body: { token, newPassword: "nova-senha-auditada-1" } });
    assert.ok((await auditFor("auth.password_reset")).length > 0);
  });

  test("audit log rejects UPDATE and recent DELETE (even for the superuser)", async () => {
    await assert.rejects(pool.query("update audit_logs set action = 'x.y'"), /imutável/);
    await assert.rejects(pool.query("delete from audit_logs"), /5 anos/);
  });
});

describe("admin plugin routes", () => {
  test("are closed over HTTP, even for a signed-in owner", async () => {
    const call = newCaller();
    await inviteAndAccept("owner-plugin@exemplo.com", "owner");
    const jar = new CookieJar();
    const signIn = await call("/sign-in/email", {
      body: { email: "owner-plugin@exemplo.com", password: PASSWORD },
      jar,
    });
    assert.equal(signIn.status, 200);

    const update = await call("/admin/update-user", {
      body: { userId: "qualquer", data: { email: "outro@exemplo.com" } },
      jar,
    });
    assert.equal(update.status, 404);
    const list = await call("/admin/list-users", { method: "GET", jar });
    assert.equal(list.status, 404);
  });
});

describe("invitation failing midway", () => {
  test("a failure writing the password rolls back the account and restores the invitation", async () => {
    const email = "falha-meio@exemplo.com";
    const { token, invitation } = await createAdminInvitation(db, {
      email,
      role: "admin",
      invitedBy: null,
    });
    const realContext = await auth.$context;
    const broken = {
      ...auth,
      $context: Promise.resolve({
        ...realContext,
        internalAdapter: {
          ...realContext.internalAdapter,
          linkAccount: () => Promise.reject(new Error("failure midway")),
        },
      }),
    } as unknown as typeof auth;

    await assert.rejects(
      acceptAdminInvitation(db, broken, { token, name: "X", password: PASSWORD }),
      /failure midway/,
    );
    const users = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email));
    assert.equal(users.length, 0, "account rolled back");
    const [row] = await db
      .select()
      .from(schema.adminInvitations)
      .where(eq(schema.adminInvitations.id, invitation.id));
    assert.equal(row?.status, "pending", "invitation can be used again");

    const retry = await acceptAdminInvitation(db, auth, { token, name: "X", password: PASSWORD });
    assert.equal(retry.ok, true);
  });
});
