import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers } from "@/lib/table-params";

/** Estado da lista de compartilhamentos na URL. */
export const shareParsers = {
  ...pageParsers,
  /** Parte do código da sala. */
  sala: parseAsString.withDefault(""),
  audio: parseAsStringLiteral(["com", "sem"] as const),
  situacao: parseAsStringLiteral(["andamento", "finalizados"] as const),
  /** Duração mínima em minutos (só compartilhamentos finalizados). */
  min: parseAsInteger,
  /** Período de início em dias de São Paulo: AAAA-MM-DD. */
  de: parseAsString,
  ate: parseAsString,
};

export const loadShareParams = createLoader(shareParsers);
export type ShareParams = Awaited<ReturnType<typeof loadShareParams>>;
