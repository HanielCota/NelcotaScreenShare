import "server-only";
import { gte, lt, type AnyColumn, type SQL } from "drizzle-orm";
import { endOfDayInSaoPaulo, startOfDayInSaoPaulo } from "@/lib/format";

/** Filtro "de/até" das tabelas do painel: dias inteiros no fuso de São Paulo. */
export function periodFilters(
  column: AnyColumn,
  { de, ate }: { de: string | null; ate: string | null },
): SQL[] {
  const filters: SQL[] = [];
  const from = de ? startOfDayInSaoPaulo(de) : undefined;
  if (from) filters.push(gte(column, from));
  const until = ate ? endOfDayInSaoPaulo(ate) : undefined;
  if (until) filters.push(lt(column, until));
  return filters;
}
