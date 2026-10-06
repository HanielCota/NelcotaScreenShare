import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Database } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

/**
 * Configurações do app editadas no /admin. Cada grupo é uma linha em
 * `app_settings` (chave + JSON) com um schema Zod próprio e valores padrão:
 * sem banco, sem linha ou com JSON inválido, valem os padrões.
 */
interface SettingGroup<T> {
  key: string;
  schema: z.ZodType<T>;
  defaults: T;
}

/** Saturação do mascote por tema (filtro CSS `saturate`): 0 = cinza, 1 = original, 2 = vivo. */
export const MASCOT_SATURATION = { min: 0, max: 2, step: 0.05 } as const;

const saturation = z
  .number()
  .min(MASCOT_SATURATION.min)
  .max(MASCOT_SATURATION.max)
  .transform((value) => Math.round(value * 100) / 100);

export const mascotSettings: SettingGroup<{ saturationDark: number; saturationLight: number }> = {
  key: "mascot",
  schema: z.object({ saturationDark: saturation, saturationLight: saturation }),
  defaults: { saturationDark: 1, saturationLight: 1 },
};

export type MascotSettings = z.infer<typeof mascotSettings.schema>;

/**
 * Cache em memória, por processo: o layout lê o mascote em toda página e o
 * valor quase nunca muda. Salvar limpa o cache; o TTL só limita o atraso se um
 * dia houver mais de uma instância.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

/** Avisa a falha de leitura uma vez por minuto, não a cada página. */
let lastReadErrorAt = 0;

async function readRaw(db: Database, key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key));
  return row?.value;
}

/** `db`: conexão a usar (testes); omitido usa a do app, `null` é "sem banco". */
export async function getSetting<T>(
  group: SettingGroup<T>,
  db: Database | null = getDb() ?? null,
): Promise<T> {
  const hit = cache.get(group.key);
  if (hit && hit.expiresAt > Date.now()) {
    // Revalida em vez de afirmar o tipo: custa nada para objetos deste tamanho.
    const cached = group.schema.safeParse(hit.value);
    if (cached.success) return cached.data;
  }
  if (!db) return group.defaults;

  let value = group.defaults;
  try {
    const parsed = group.schema.safeParse(await readRaw(db, group.key));
    if (parsed.success) value = parsed.data;
  } catch (error) {
    // Banco fora do ar não pode derrubar a página: segue com o padrão, sem cachear.
    if (Date.now() - lastReadErrorAt > 60_000) {
      lastReadErrorAt = Date.now();
      console.error(`[settings] falha ao ler "${group.key}"`, error);
    }
    return group.defaults;
  }
  cache.set(group.key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export class SettingsUnavailableError extends Error {
  constructor() {
    super("Banco de dados não configurado (DATABASE_URL)");
  }
}

/** Valida e grava (upsert). Lança `ZodError` para valor inválido. */
export async function saveSetting<T>(
  group: SettingGroup<T>,
  input: unknown,
  db: Database | null = getDb() ?? null,
): Promise<T> {
  if (!db) throw new SettingsUnavailableError();
  const value = group.schema.parse(input);
  await db
    .insert(appSettings)
    .values({ key: group.key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: sql`now()` } });
  cache.delete(group.key);
  return value;
}

/** Só para testes: esquece o cache entre casos. */
export function clearSettingsCache() {
  cache.clear();
}
