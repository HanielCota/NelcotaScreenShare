/** Password limits (admins and participants), the same in the browser and on the server. */
export const PASSWORD_LIMITS = {
  admin: { min: 12, max: 128 },
  user: { min: 8, max: 128 },
} as const;

const STRENGTHS = [0, 1, 2, 3] as const;
export type PasswordStrength = (typeof STRENGTHS)[number];

export const STRENGTH_LABELS = ["Muito curta", "Fraca", "Boa", "Forte"] as const;

/**
 * Approximate strength, only to guide whoever is typing (the server only requires
 * the minimum length). Length weighs more than variety; repeating the name or
 * the e-mail lowers the score.
 */
export function passwordStrength(
  password: string,
  { min, personal = [] }: { min: number; personal?: string[] },
): PasswordStrength {
  if (password.length < min) return 0;
  const lower = password.toLowerCase();
  // Each word of the name and the e-mail counts ("Rita Teste" → "rita", "teste").
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
