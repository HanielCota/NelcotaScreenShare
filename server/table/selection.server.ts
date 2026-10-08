import { z } from "zod";
import type { AuditEntry, AuditRecorder } from "@/server/audit.server";
import { getDb, type DbExecutor } from "@/server/db/index.server";
import { ActionError } from "@/server/operations/action-error";
import { BULK_FILTER_LIMIT, BULK_IDS_LIMIT, filterQuery } from "@/lib/table-params";

/** Input of the bulk actions (see `BulkSelection`). */
export const bulkSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ids"), ids: z.array(z.uuid()).min(1).max(BULK_IDS_LIMIT) }),
  z.object({ kind: z.literal("filter"), query: z.string().max(2000) }),
]);
export type BulkSelectionInput = z.infer<typeof bulkSelectionSchema>;

/**
 * Target IDs of the action. By filter, the server reapplies the search (it never trusts
 * IDs coming from the browser for "all") and refuses above 10,000.
 */
export async function resolveSelection(
  selection: BulkSelectionInput,
  idsForFilter: (search: URLSearchParams, limit: number) => Promise<string[]>,
): Promise<string[]> {
  if (selection.kind === "ids") return [...new Set(selection.ids)];
  const ids = await idsForFilter(
    new URLSearchParams(filterQuery(selection.query)),
    BULK_FILTER_LIMIT + 1,
  );
  if (ids.length > BULK_FILTER_LIMIT) {
    throw new ActionError("Mais de 10.000 resultados. Refine o filtro e tente de novo.");
  }
  return ids;
}

/**
 * Applies a bulk change in one transaction with one audit row per changed item.
 * Nothing changed is refused with `empty`, which the admin sees.
 */
export function bulkChange<T>(
  audit: AuditRecorder,
  change: (tx: DbExecutor) => Promise<T[]>,
  { empty, entry }: { empty: string; entry: (item: T) => AuditEntry },
): Promise<T[]> {
  return getDb().transaction(async (tx) => {
    const done = await change(tx);
    if (done.length === 0) throw new ActionError(empty);
    await audit.recordMany(tx, done.map(entry));
    return done;
  });
}
