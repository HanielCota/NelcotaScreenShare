import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, test, vi } from "vitest";
import {
  createUserAuthForTests,
  USER_AUTH_BASE_PATH,
} from "@/features/auth/server/participant-auth.server";
import * as schema from "@/server/db/schema";
import { logger } from "@/server/logger.server";
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

/** Without SMTP, the email goes to the log: grabs the link from the last email to `to`. */
function captureMail() {
  const mails: { to: string; body: string }[] = [];
  vi.spyOn(logger, "warn").mockImplementation((entry: unknown) => {
    const mail = entry as { mail?: { to: string }; body?: string };
    if (mail.mail && mail.body) mails.push({ to: mail.mail.to, body: mail.body });
  });
  return {
    linkFor(to: string): string | undefined {
      const mail = mails.findLast((item) => item.to === to);
      return mail?.body.match(/https?:\/\/\S+/)?.[0];
    },
    count: (to: string) => mails.filter((item) => item.to === to).length,
  };
}

describe("sign-up", () => {
  test("new email and already registered email get the same response", async () => {
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
    // The email owner gets the verification and then the attempt notice.
    assert.equal(mail.count("lia@exemplo.com"), 2);
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "lia@exemplo.com"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "Lia");
  });

  test("cannot sign in without verifying the email; the link verifies and signs in", async () => {
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
    assert.ok(link, "verification link in the email");
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
      "signed in after verifying",
    );
  });

  test("short password is rejected", async () => {
    const res = await newCaller()("/sign-up/email", {
      body: { name: "Nina", email: "nina@exemplo.com", password: "curta" },
    });
    assert.notEqual(res.status, 200);
  });
});

describe("login", () => {
  test("account blocked from the admin panel gets no session", async () => {
    const ana = await verifiedParticipant(db, handler);
    await db.update(schema.users).set({ blockedAt: new Date() }).where(eq(schema.users.id, ana.id));
    const res = await newCaller()("/sign-in/email", {
      body: { email: ana.email, password: ana.password },
    });
    assert.notEqual(res.status, 200);
  });

  test("attempt lockout applies to participants, separate from admin", async () => {
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

  test("account cookie does not work in the admin panel", async () => {
    const caio = await verifiedParticipant(db, handler);
    assert.ok(caio.jar.has("nelcota."));
    assert.equal(caio.jar.has("nelcota-admin"), false);
  });
});

/** The 1 px WebP below with an EXIF chunk (metadata such as location). */
const WEBP_WITH_EXIF =
  "data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAAIAAAAAAAAAAAARVhJRgQAAABHUFMhVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

describe("profile photo", () => {
  test("sign-up validates the photo with the same rules as the update", async () => {
    const image = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
    const invalidImages = [
      "https://example.com/photo.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/webp;base64," + "A".repeat(180_001),
      "data:image/webp;base64,UklGRxxxxxxxxxxxxxxxxxxx",
      WEBP_WITH_EXIF,
    ];
    for (const invalid of invalidImages) {
      const email = `foto-invalida-${crypto.randomUUID()}@exemplo.com`;
      const rejected = await newCaller()("/sign-up/email", {
        body: { name: "Foto", email, password: PASSWORD, image: invalid },
      });
      assert.equal(rejected.status, 400);
      assert.equal(
        await db.query.users.findFirst({ where: eq(schema.users.email, email) }),
        undefined,
      );
    }
    const email = `foto-valida-${crypto.randomUUID()}@exemplo.com`;
    const saved = await newCaller()("/sign-up/email", {
      body: { name: "Foto", email, password: PASSWORD, image },
    });
    assert.equal(saved.status, 200);
    assert.equal(
      (await db.query.users.findFirst({ where: eq(schema.users.email, email) }))?.image,
      image,
    );
  });

  test("saves and removes the account's own photo; rejects URLs, SVG and large images", async () => {
    const participant = await verifiedParticipant(db, handler);
    const call = newCaller();
    // 1 px WebP: the endpoint receives the format produced by the editor.
    const image = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
    const saved = await call("/update-user", { body: { image }, jar: participant.jar });
    assert.equal(saved.status, 200);
    const [row] = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, participant.id));
    assert.equal(row?.image, image);
    for (const invalid of [
      "https://example.com/photo.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/webp;base64," + "A".repeat(180_001),
      "data:image/webp;base64,UklGRxxxxxxxxxxxxxxxxxxx",
      WEBP_WITH_EXIF,
    ]) {
      const rejected = await call("/update-user", {
        body: { image: invalid },
        jar: participant.jar,
      });
      assert.equal(rejected.status, 400);
    }
    const removed = await call("/update-user", { body: { image: null }, jar: participant.jar });
    assert.equal(removed.status, 200);
    const [cleared] = await db
      .select({ image: schema.users.image })
      .from(schema.users)
      .where(eq(schema.users.id, participant.id));
    assert.equal(cleared?.image, null);
  });
});
