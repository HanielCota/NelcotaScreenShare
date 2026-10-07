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

/**
 * Transactional e-mail. With SMTP_URL, it really sends. Without it (dev only;
 * production refuses to start), the content goes to the log so the links still work.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const { SMTP_URL, MAIL_FROM } = getEnv();
  if (!SMTP_URL) {
    logger.warn(
      { mail: { to: message.to, subject: message.subject }, body: message.text },
      "e-mail not sent (no SMTP_URL): content in the log",
    );
    return;
  }
  transporter ??= createTransport(SMTP_URL);
  await transporter.sendMail({ from: MAIL_FROM, ...message });
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
