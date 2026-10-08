import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";
import {
  deliverAccountMail,
  handleAuthWithMailDelivery,
} from "@/features/auth/server/auth-mail.server";
import { createUserAuthForTests } from "@/features/auth/server/participant-auth.server";
import * as schema from "@/server/db/schema";
import { users } from "@/server/db/schema";
import type * as MailModule from "@/server/mail.server";
import { verifiedParticipant } from "./support/accounts";
import { makeCaller } from "./support/http-auth";

const mail = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/server/mail.server", async (original) => ({
  ...(await original<typeof MailModule>()),
  sendMail: mail.send,
}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const auth = createUserAuthForTests(db, "test-auth-mail-secret-0123456789abcdef");
const handler = (request: Request) => handleAuthWithMailDelivery(request, auth);
const call = makeCaller(handler, "/api/auth");
afterAll(() => pool.end());
beforeEach(() => {
  mail.send.mockReset().mockResolvedValue(undefined);
});

describe("authenticated e-mail delivery", () => {
  test("reports verification delivery failures instead of success", async () => {
    const participant = await verifiedParticipant(db, handler);
    await db.update(users).set({ emailVerified: false }).where(eq(users.id, participant.id));
    mail.send.mockRejectedValueOnce(new Error("Provider unavailable"));
    const response = await call("/send-verification-email", {
      body: { email: participant.email },
      jar: participant.jar,
    });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "MAIL_DELIVERY_FAILED" });
  });

  test("reports change-email failures swallowed by Better Auth and keeps the original address", async () => {
    const participant = await verifiedParticipant(db, handler);
    mail.send.mockRejectedValueOnce(new Error("Provider unavailable"));
    const response = await call("/change-email", {
      body: { newEmail: "changed@example.com" },
      jar: participant.jar,
    });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "MAIL_DELIVERY_FAILED" });
    const user = await db.query.users.findFirst({ where: eq(users.id, participant.id) });
    expect(user?.email).toBe(participant.email);
  });

  test("waits for provider acceptance before confirming an authenticated send", async () => {
    const participant = await verifiedParticipant(db, handler);
    await db.update(users).set({ emailVerified: false }).where(eq(users.id, participant.id));
    const delivery = Promise.withResolvers<void>();
    mail.send.mockReturnValueOnce(delivery.promise);
    let completed = false;
    const response = call("/send-verification-email", {
      body: { email: participant.email },
      jar: participant.jar,
    }).then((result) => {
      completed = true;
      return result;
    });
    await vi.waitFor(() => expect(mail.send).toHaveBeenCalledOnce());
    expect(completed).toBe(false);
    delivery.resolve();
    expect((await response).status).toBe(200);
  });

  test("keeps a failed request from changing another concurrent request's outcome", async () => {
    const first = await verifiedParticipant(db, handler);
    const second = await verifiedParticipant(db, handler);
    await db
      .update(users)
      .set({ emailVerified: false })
      .where(inArray(users.id, [first.id, second.id]));
    mail.send.mockImplementation(async (message: { to: string }) => {
      if (message.to === first.email) throw new Error("Provider unavailable");
    });
    const responses = await Promise.all([
      makeCaller(
        handler,
        "/api/auth",
        "203.0.113.21",
      )("/send-verification-email", {
        body: { email: first.email },
        jar: first.jar,
      }),
      makeCaller(
        handler,
        "/api/auth",
        "203.0.113.22",
      )("/send-verification-email", {
        body: { email: second.email },
        jar: second.jar,
      }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([503, 200]);
  });
});

describe("public e-mail requests", () => {
  test("does not expose account existence on verification or password recovery failures", async () => {
    const participant = await verifiedParticipant(db, handler);
    await db.update(users).set({ emailVerified: false }).where(eq(users.id, participant.id));
    mail.send.mockRejectedValue(new Error("Provider unavailable"));
    for (const endpoint of ["/send-verification-email", "/request-password-reset"]) {
      const publicCall = makeCaller(handler, "/api/auth", "203.0.113.30");
      const existing = await publicCall(endpoint, { body: { email: participant.email } });
      const absent = await publicCall(endpoint, { body: { email: "absent@example.com" } });
      expect(existing.status).toBe(200);
      expect(absent.status).toBe(existing.status);
      expect(absent.body).toEqual(existing.body);
    }
  });

  test("handles background delivery failures without rejecting the public callback", async () => {
    mail.send.mockRejectedValue(new Error("Provider unavailable"));
    await expect(
      deliverAccountMail({ to: "public@example.com", subject: "Reset", text: "Link" }),
    ).resolves.toBeUndefined();
  });
});
