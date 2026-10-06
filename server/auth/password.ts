import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * argon2id com o mínimo da OWASP (Password Storage Cheat Sheet): 19 MiB de
 * memória, 2 iterações, 1 de paralelismo. O algoritmo padrão do
 * @node-rs/argon2 é argon2id (o enum é `const enum`, que não atravessa
 * `isolatedModules`; o teste confere o prefixo `$argon2id$`).
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** Hash corrompido ou de outro formato conta como senha errada, sem lançar. */
export async function verifyPassword({
  hash: stored,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/** Limites de senha (admins e participantes). */
export const PASSWORD_LIMITS = {
  admin: { min: 12, max: 128 },
  user: { min: 10, max: 128 },
} as const;
