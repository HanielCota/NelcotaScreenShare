import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { createTransport, type Transporter } from "nodemailer";
import { getEnv } from "@/server/env.server";
import { logger } from "@/server/logger.server";
export { mailLayout } from "@/server/mail-layout.server";

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain text (every e-mail has it; the HTML is optional). */
  text: string;
  html?: string;
}

let transporter: Transporter | undefined;

function providerMessageId(result: unknown): string | undefined {
  if (!result || typeof result !== "object" || !("id" in result)) return undefined;
  if (typeof result.id !== "string") return undefined;
  return result.id;
}

/** Retries reuse one key, including when a timeout hides an accepted request. */
/**
 * Without a provider, local development reads the links straight from the log. Any other
 * non-production environment (tests, previews) records only the subject: recipients and
 * links with tokens never reach a shared log.
 */
function logUndeliveredMail(message: MailMessage) {
  if (process.env.NODE_ENV !== "development") {
    logger.warn({ mail: { subject: message.subject } }, "e-mail not sent (no provider)");
    return;
  }
  logger.warn(
    { mail: { to: message.to, subject: message.subject }, body: message.text },
    "e-mail not sent (no provider): content in the log",
  );
}

/** The provider's answer; unreadable JSON only costs the message id in the log. */
async function readProviderResult(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    logger.warn({ err: error, provider: "resend" }, "e-mail provider answer is not JSON");
    return undefined;
  }
}

async function sendWithResend(message: MailMessage, apiKey: string, sender: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
  };
  const body = JSON.stringify({ from: sender, ...message });

  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | undefined;
    let failure: string | undefined;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      // Network errors can contain private request data: record only their kind.
      failure = error instanceof Error ? error.name : "unknown";
    }

    if (response?.ok) {
      const result = await readProviderResult(response);
      logger.info(
        {
          event: "mail.accepted",
          provider: "resend",
          messageId: providerMessageId(result),
          attempt,
        },
        "e-mail accepted by provider",
      );
      return;
    }

    const status = response?.status;
    // Only frees the connection: a failure here changes nothing about the delivery.
    await response?.body?.cancel().catch(() => undefined);
    const transient = status === undefined || status === 429 || status >= 500;
    if (!transient || attempt === 3) {
      logger.error(
        { event: "mail.failed", provider: "resend", status, failure, attempt },
        "e-mail delivery failed",
      );
      throw new Error(
        status === undefined
          ? "Resend request failed or timed out"
          : `Resend rejected e-mail delivery (HTTP ${status})`,
      );
    }

    logger.warn(
      { event: "mail.retry", provider: "resend", status, failure, attempt },
      "retrying e-mail delivery",
    );
    await setTimeout(500 * 2 ** (attempt - 1));
  }
}

/**
 * Transactional e-mail. Production failures never log links or recipients.
 * Development without a provider logs the content for local testing.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const { RESEND_API_KEY, SMTP_URL, MAIL_FROM } = getEnv();
  if (RESEND_API_KEY) {
    if (!MAIL_FROM) throw new Error("MAIL_FROM is required for Resend delivery");
    await sendWithResend(message, RESEND_API_KEY, MAIL_FROM);
    return;
  }
  if (!SMTP_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("E-mail delivery is not configured");
    }
    logUndeliveredMail(message);
    return;
  }
  transporter ??= createTransport(SMTP_URL);
  await transporter.sendMail({ from: MAIL_FROM, ...message });
  logger.info({ event: "mail.accepted", provider: "smtp" }, "e-mail accepted by provider");
}
