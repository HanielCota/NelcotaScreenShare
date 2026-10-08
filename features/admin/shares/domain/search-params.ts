import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers, periodParsers } from "@/lib/table-params";

/** Screen share list state in the URL. */
export const shareParsers = {
  ...pageParsers,
  /** Part of the room code. */
  sala: parseAsString.withDefault(""),
  audio: parseAsStringLiteral(["com", "sem"] as const),
  situacao: parseAsStringLiteral(["andamento", "finalizados"] as const),
  /** Minimum duration in minutes (finished screen shares only). */
  min: parseAsInteger,
  ...periodParsers,
};

/** Filters cleared together (the sort stays). */
export const SHARE_FILTERS = ["sala", "audio", "situacao", "min", "de", "ate"] as const;

export const loadShareParams = createLoader(shareParsers);
export type ShareParams = Awaited<ReturnType<typeof loadShareParams>>;
