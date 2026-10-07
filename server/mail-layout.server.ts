import { appUrl } from "@/server/env.server";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Shared transactional layout: inline styles and tables keep the essential content portable. */
export function mailLayout({
  title,
  intro,
  action,
  notice,
  outro,
}: {
  title: string;
  intro: string;
  action?: { label: string; url: string };
  notice?: string;
  outro?: string;
}): { text: string; html: string } {
  const text = [
    title,
    "",
    intro,
    notice ? `\n${notice}` : "",
    action ? `\n${action.label}: ${action.url}` : "",
    outro ? `\n${outro}` : "",
    "\nNelcota · Compartilhe sua tela. Fique perto.",
  ]
    .join("\n")
    .trim();
  const html = `<!doctype html>
<html lang="pt-BR" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${escapeHtml(title)} · Nelcota</title>
  <style>
    @media only screen and (max-width:600px) {
      .email-outer { padding:24px 12px !important; }
      .email-pad { padding:28px 24px !important; }
      .email-title { font-size:28px !important; line-height:34px !important; }
    }
    @media (prefers-color-scheme:dark) {
      .email-background { background-color:#17181a !important; }
      .email-card { background-color:#1f2023 !important; }
      .email-copy { color:#d4d4d8 !important; }
      .email-muted { color:#a1a1aa !important; }
      .email-brand { color:#fafafa !important; }
      .email-note { background-color:#26272b !important; border-color:#36383d !important; }
      .email-link { color:#cdf2d6 !important; }
    }
  </style>
</head>
<body class="email-background" style="margin:0;padding:0;background-color:#e6e4df;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div lang="pt-BR" dir="ltr" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(intro)}</div>
<table lang="pt-BR" dir="ltr" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="email-outer" align="center" style="padding:40px 16px;">
<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;table-layout:fixed;">
<tr><td style="padding:0 0 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="48"><img src="${escapeHtml(`${appUrl()}/icon.png`)}" width="48" height="48" alt="" style="display:block;border:0;border-radius:14px;" /></td>
    <td style="padding-left:12px;">
      <p class="email-brand" style="margin:0;color:#1f2023;font-size:20px;font-weight:700;letter-spacing:-0.5px;line-height:26px;">Nelcota</p>
      <p class="email-muted" style="margin:2px 0 0;color:#56585e;font-size:12px;line-height:18px;">Compartilhe sua tela. Fique perto.</p>
    </td>
  </tr></table>
</td></tr>
<tr><td>
<table class="email-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:20px;table-layout:fixed;">
<tr><td class="email-pad" bgcolor="#17181a" style="padding:32px;border-radius:20px 20px 0 0;background-color:#17181a;">
  <p style="margin:0 0 12px;color:#a2e1b2;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:16px;">SUA CONTA NELCOTA</p>
  <h1 class="email-title" style="margin:0;color:#fafafa;font-size:32px;font-weight:700;letter-spacing:-0.8px;line-height:40px;">${escapeHtml(title)}</h1>
</td></tr>
<tr><td class="email-pad" style="padding:32px;">
  <p class="email-copy" style="margin:0 0 24px;color:#4f5157;font-size:16px;line-height:26px;">${escapeHtml(intro)}</p>
  ${notice ? `<p class="email-note email-copy" style="display:inline-block;margin:0 0 24px;padding:10px 14px;border:1px solid #d7e7dc;border-radius:10px;background-color:#eef7f0;color:#236339;font-size:13px;line-height:20px;">${escapeHtml(notice)}</p>` : ""}
  ${
    action
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#a2e1b2" style="border-radius:12px;background-color:#a2e1b2;mso-padding-alt:16px 24px;">
    <a href="${escapeHtml(action.url)}" style="display:block;padding:16px 24px;border:1px solid #a2e1b2;border-radius:12px;color:#14281c;font-size:16px;font-weight:700;line-height:22px;text-align:center;text-decoration:none;">${escapeHtml(action.label)}</a>
  </td></tr></table>`
      : ""
  }
  ${outro ? `<p class="email-note email-copy" style="margin:24px 0 0;padding:16px;border:1px solid #e3e5df;border-radius:12px;background-color:#f4f5f1;color:#56585e;font-size:13px;line-height:21px;">${escapeHtml(outro)}</p>` : ""}
  ${
    action
      ? `<div style="margin-top:28px;padding-top:24px;border-top:1px solid #e3e5df;">
    <p class="email-muted" style="margin:0 0 10px;color:#56585e;font-size:12px;line-height:20px;">Se o botão não abrir, copie e cole este link no navegador:</p>
    <p style="margin:0;font-size:12px;line-height:20px;word-break:break-all;overflow-wrap:anywhere;"><a class="email-link" href="${escapeHtml(action.url)}" style="color:#236339;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${escapeHtml(action.url)}</a></p>
  </div>`
      : ""
  }
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:24px 20px 0;">
  <p class="email-muted" style="margin:0;color:#56585e;font-size:12px;line-height:20px;">Enviado pelo Nelcota para cuidar da sua conta.</p>
  <p class="email-muted" style="margin:4px 0 0;color:#56585e;font-size:12px;line-height:20px;">Este endereço não recebe respostas.</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
  return { text, html };
}
