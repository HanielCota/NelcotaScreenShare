/** Domínios mais comuns no Brasil: "gmial.com" vira sugestão de "gmail.com". */
const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

/**
 * E-mail com cara de domínio digitado errado → o e-mail corrigido.
 * Domínio conhecido ou muito diferente dos comuns → undefined.
 */
export function suggestEmail(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain || COMMON_DOMAINS.includes(domain)) return undefined;
  let best: { domain: string; distance: number } | undefined;
  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate);
    if (d <= 2 && (!best || d < best.distance)) best = { domain: candidate, distance: d };
  }
  return best ? `${email.slice(0, at)}@${best.domain}` : undefined;
}

/** Atalho para a caixa de entrada do provedor (busca já filtrando pelo Nelcota). */
export function inboxLink(email: string): { label: string; href: string } | undefined {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return {
      label: "Abrir o Gmail",
      href: "https://mail.google.com/mail/u/0/#search/in%3Aanywhere+Nelcota",
    };
  }
  if (/^(outlook|hotmail|live|msn)\.com(\.br)?$/.test(domain)) {
    return { label: "Abrir o Outlook", href: "https://outlook.live.com/mail/0/" };
  }
  if (/^yahoo\.com(\.br)?$/.test(domain)) {
    return { label: "Abrir o Yahoo Mail", href: "https://mail.yahoo.com/" };
  }
  if (domain === "icloud.com" || domain === "me.com") {
    return { label: "Abrir o iCloud Mail", href: "https://www.icloud.com/mail" };
  }
  return undefined;
}
