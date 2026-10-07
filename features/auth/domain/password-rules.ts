/** Limites de senha (admins e participantes), iguais no navegador e no servidor. */
export const PASSWORD_LIMITS = {
  admin: { min: 12, max: 128 },
  user: { min: 8, max: 128 },
} as const;

const STRENGTHS = [0, 1, 2, 3] as const;
export type PasswordStrength = (typeof STRENGTHS)[number];

export const STRENGTH_LABELS = ["Muito curta", "Fraca", "Boa", "Forte"] as const;

/**
 * Força aproximada, só para orientar quem digita (o servidor exige apenas o
 * tamanho mínimo). Tamanho pesa mais que variedade; repetir o nome ou o
 * e-mail derruba a nota.
 */
export function passwordStrength(
  password: string,
  { min, personal = [] }: { min: number; personal?: string[] },
): PasswordStrength {
  if (password.length < min) return 0;
  const lower = password.toLowerCase();
  // Cada palavra do nome e do e-mail conta ("Rita Teste" → "rita", "teste").
  const containsPersonal = personal
    .flatMap((value) => value.toLowerCase().split(/[^\p{L}\p{N}]+/u))
    .some((word) => word.length >= 3 && lower.includes(word));
  if (containsPersonal || new Set(lower).size <= 3) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  let score = 1;
  if (password.length >= min + 3 || kinds >= 3) score += 1;
  if (password.length >= min + 8 || (password.length >= min + 2 && kinds >= 3)) score += 1;
  return STRENGTHS[Math.min(score, 3)] ?? 3;
}
