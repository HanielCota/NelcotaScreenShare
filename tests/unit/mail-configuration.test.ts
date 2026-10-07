import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mail = vi.hoisted(() => ({
  warn: vi.fn(),
  send: vi.fn(),
  createTransport: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/server/logger.server", () => ({ logger: { warn: mail.warn } }));
vi.mock("nodemailer", () => ({ createTransport: mail.createTransport }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_URL", "postgres://app:password@localhost/nelcota");
  vi.stubEnv("LIVEKIT_API_KEY", "test-key");
  vi.stubEnv("LIVEKIT_API_SECRET", "test-livekit-secret-0123456789abcdef");
  vi.stubEnv("LIVEKIT_URL", "wss://lk.example.com");
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-0123456789abcdef");
  vi.stubEnv("ADMIN_AUTH_SECRET", "");
  vi.stubEnv("APP_URL", "https://app.example.com");
  vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "false");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("SMTP_URL", "");
  vi.stubEnv("MAIL_FROM", "");
  mail.createTransport.mockReturnValue({ sendMail: mail.send });
  vi.stubGlobal("fetch", mail.fetch);
});

afterEach(() => vi.unstubAllGlobals());

describe("production mail configuration", () => {
  test("starts without SMTP when e-mail verification is off", async () => {
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv().SMTP_URL).toBeUndefined();
    expect(getEnv().REQUIRE_EMAIL_VERIFICATION).toBe(false);
  });

  test("rejects required e-mail verification without delivery", async () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv).toThrow("MAIL_FROM and an e-mail provider");
  });

  test.each(["SMTP_URL", "MAIL_FROM"])(
    "rejects an incomplete mail setup with only %s",
    async (key) => {
      vi.stubEnv(key, key === "SMTP_URL" ? "smtps://localhost:465" : "Nelcota <mail@example.com>");
      const { getEnv } = await import("@/server/env.server");
      expect(getEnv).toThrow("MAIL_FROM and an e-mail provider");
    },
  );

  test("accepts SMTP with a sender and required verification", async () => {
    vi.stubEnv("SMTP_URL", "smtps://localhost:465");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv().REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  test("accepts Resend with a sender and required verification", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv().RESEND_API_KEY).toBe("re_test_key");
    expect(getEnv().SMTP_URL).toBeUndefined();
    expect(getEnv().REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  test("rejects Resend without a sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv).toThrow("MAIL_FROM and an e-mail provider");
  });

  test("rejects multiple delivery providers", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("SMTP_URL", "smtps://localhost:465");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv).toThrow("Configure only one e-mail provider");
  });

  test("still requires the public application origin", async () => {
    vi.stubEnv("APP_URL", "");
    const { getEnv } = await import("@/server/env.server");
    expect(getEnv).toThrow("Set APP_URL");
  });
});

describe("mail delivery", () => {
  const message = {
    to: "recipient@example.com",
    subject: "Reset password",
    text: "https://app.example.com/reset?token=private-token",
  };

  test("skips production delivery without exposing recipients or recovery links", async () => {
    const { sendMail } = await import("@/server/mail.server");
    await sendMail(message);
    expect(mail.createTransport).not.toHaveBeenCalled();
    expect(mail.warn).toHaveBeenCalledExactlyOnceWith(
      { subject: message.subject },
      "e-mail not sent: delivery is disabled",
    );
  });

  test("keeps development links in the log", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { sendMail } = await import("@/server/mail.server");
    await sendMail(message);
    expect(mail.warn).toHaveBeenCalledWith(
      { mail: { to: message.to, subject: message.subject }, body: message.text },
      "e-mail not sent (no provider): content in the log",
    );
  });

  test("preserves configured SMTP delivery", async () => {
    vi.stubEnv("SMTP_URL", "smtps://localhost:465");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    const { sendMail } = await import("@/server/mail.server");
    await sendMail(message);
    expect(mail.createTransport).toHaveBeenCalledWith("smtps://localhost:465");
    expect(mail.send).toHaveBeenCalledWith({ from: "Nelcota <mail@example.com>", ...message });
  });

  test("delivers text and HTML through the Resend API", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    mail.fetch.mockResolvedValue(new Response('{"id":"email-id"}', { status: 200 }));
    const { sendMail } = await import("@/server/mail.server");
    const htmlMessage = { ...message, html: "<p>Reset password</p>" };
    await sendMail(htmlMessage);
    expect(mail.fetch).toHaveBeenCalledExactlyOnceWith("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer re_test_key", "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Nelcota <mail@example.com>", ...htmlMessage }),
      signal: expect.any(AbortSignal) as AbortSignal,
    });
    expect(mail.createTransport).not.toHaveBeenCalled();
    expect(mail.warn).not.toHaveBeenCalled();
  });

  test("reports provider failures without exposing the response body", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    mail.fetch.mockResolvedValue(
      new Response("recipient@example.com private-token", { status: 429 }),
    );
    const { sendMail } = await import("@/server/mail.server");
    await expect(sendMail(message)).rejects.toThrow("Resend rejected e-mail delivery (HTTP 429)");
    expect(mail.send).not.toHaveBeenCalled();
    expect(mail.warn).not.toHaveBeenCalled();
  });

  test("propagates network failures without sending again", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("MAIL_FROM", "Nelcota <mail@example.com>");
    mail.fetch.mockRejectedValue(new TypeError("fetch failed"));
    const { sendMail } = await import("@/server/mail.server");
    await expect(sendMail(message)).rejects.toThrow("fetch failed");
    expect(mail.fetch).toHaveBeenCalledTimes(1);
    expect(mail.send).not.toHaveBeenCalled();
  });
});
