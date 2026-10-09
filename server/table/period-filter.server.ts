import { gte, lt, type AnyColumn, type SQL } from "drizzle-orm";
import { endOfDayInSaoPaulo, startOfDayInSaoPaulo } from "@/lib/format";

/** "from/until" filter of the panel tables: whole days in the São Paulo time zone. */
export function periodFilters(
  column: AnyColumn,
  { de, ate }: { de: string | null; ate: string | null },
): SQL[] {
  const from = de ? startOfDayInSaoPaulo(de) : undefined;
  const until = ate ? endOfDayInSaoPaulo(ate) : undefined;
  return [from ? gte(column, from) : undefined, until ? lt(column, until) : undefined].filter(
    (filter): filter is SQL => filter !== undefined,
  );
}
