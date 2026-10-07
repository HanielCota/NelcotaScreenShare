import { gte, lt, type AnyColumn, type SQL } from "drizzle-orm";
import { endOfDayInSaoPaulo, startOfDayInSaoPaulo } from "@/lib/format";

/** "from/until" filter of the panel tables: whole days in the São Paulo time zone. */
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
