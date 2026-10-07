import { hash, verify } from "@node-rs/argon2";

/**
 * argon2id with the OWASP minimum (Password Storage Cheat Sheet): 19 MiB of
 * memory, 2 iterations, parallelism 1. The default algorithm of
 * @node-rs/argon2 is argon2id (the enum is a `const enum`, which does not cross
 * `isolatedModules`; the test checks the `$argon2id$` prefix).
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** A corrupted hash or one in another format counts as a wrong password, without throwing. */
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

/** The same limits used in browser validation. */
export { PASSWORD_LIMITS } from "@/features/auth/domain/password-rules";
