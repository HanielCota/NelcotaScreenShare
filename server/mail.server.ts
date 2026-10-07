import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { createTransport, type Transporter } from "nodemailer";
import { getEnv } from "@/server/env.server";
import { logger } from "@/server/logger.server";

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
async function sendWithResend(message: MailMessage, apiKey: string, sender: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": randomUUID(),
  };
  const body = JSON.stringify({ from: sender, ...message });

  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Network errors can contain private request data: record only the outcome.
    }

    if (response?.ok) {
      const result: unknown = await response.json().catch(() => undefined);
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
    await response?.body?.cancel().catch(() => undefined);
    const transient = status === undefined || status === 429 || status >= 500;
    if (!transient || attempt === 3) {
      logger.error(
        { event: "mail.failed", provider: "resend", status, attempt },
        "e-mail delivery failed",
      );
      throw new Error(
        status === undefined
          ? "Resend request failed or timed out"
          : `Resend rejected e-mail delivery (HTTP ${status})`,
      );
    }

    logger.warn(
      { event: "mail.retry", provider: "resend", status, attempt },
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
    logger.warn(
      { mail: { to: message.to, subject: message.subject }, body: message.text },
      "e-mail not sent (no provider): content in the log",
    );
    return;
  }
  transporter ??= createTransport(SMTP_URL);
  await transporter.sendMail({ from: MAIL_FROM, ...message });
  logger.info({ event: "mail.accepted", provider: "smtp" }, "e-mail accepted by provider");
}

/** Escapes text for the HTML templates. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Simple layout, readable in any e-mail client (no external images). */
export function mailLayout({
  title,
  intro,
  action,
  outro,
}: {
  title: string;
  intro: string;
  action?: { label: string; url: string };
  outro?: string;
}): { text: string; html: string } {
  const text = [
    title,
    "",
    intro,
    action ? `\n${action.label}: ${action.url}` : "",
    outro ? `\n${outro}` : "",
  ]
    .join("\n")
    .trim();
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1efea;font-family:Arial,sans-serif;color:#1f2023">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5">${escapeHtml(intro)}</p>
${
  action
    ? `<p style="margin:0 0 24px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#93d6a5;color:#14281c;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 24px;font-size:12px;color:#56585e;word-break:break-all">Se o botão não funcionar, copie: ${escapeHtml(action.url)}</p>`
    : ""
}
${outro ? `<p style="margin:0;font-size:13px;color:#56585e;line-height:1.5">${escapeHtml(outro)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}
