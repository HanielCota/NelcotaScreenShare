/** Most common domains in Brazil: "gmial.com" becomes a suggestion of "gmail.com". */
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

function distance(typed: string, candidateDomain: string): number {
  const row = Array.from({ length: candidateDomain.length + 1 }, (_, index) => index);
  for (let i = 1; i <= typed.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= candidateDomain.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (typed[i - 1] === candidateDomain[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[candidateDomain.length] ?? 0;
}

/**
 * E-mail that looks like a mistyped domain → the corrected e-mail.
 * Known domain or one very different from the common ones → undefined.
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
    const edits = distance(domain, candidate);
    if (edits <= 2 && (!best || edits < best.distance)) {
      best = { domain: candidate, distance: edits };
    }
  }
  return best ? `${email.slice(0, at)}@${best.domain}` : undefined;
}

/** Shortcut to the provider's inbox (search already filtered by Nelcota). */
export function inboxLink(
  email: string,
): { label: string; href: string; logo: string } | undefined {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return {
      label: "Abrir o Gmail",
      href: "https://mail.google.com/mail/u/0/#search/in%3Aanywhere+Nelcota",
      logo: "/mail-providers/gmail.svg",
    };
  }
  if (/^(outlook|hotmail|live|msn)\.com(\.br)?$/.test(domain)) {
    return {
      label: "Abrir o Outlook",
      href: "https://outlook.live.com/mail/0/",
      logo: "/mail-providers/outlook.png",
    };
  }
  if (/^yahoo\.com(\.br)?$/.test(domain)) {
    return {
      label: "Abrir o Yahoo Mail",
      href: "https://mail.yahoo.com/",
      logo: "/mail-providers/yahoo.ico",
    };
  }
  if (domain === "icloud.com" || domain === "me.com") {
    return {
      label: "Abrir o iCloud Mail",
      href: "https://www.icloud.com/mail",
      logo: "/mail-providers/icloud.png",
    };
  }
  return undefined;
}
