/** Iniciais do avatar: primeira letra do primeiro e do último nome ("Ana Maria Souza" → "AS"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Nome mostrado na sala: o da conta, a identidade se faltar, ou "Alguém" sem participante. */
export function participantName(
  participant: { name?: string | undefined; identity: string } | undefined,
): string {
  return participant?.name || participant?.identity || "Alguém";
}
